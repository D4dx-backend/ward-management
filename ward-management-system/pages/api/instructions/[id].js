import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';

export default async function handler(req, res) {
  console.log('API called:', req.method, req.url);
  
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      console.log('No session found');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Session found for user:', session.user.id, session.user.role);
    const { id } = req.query;
    console.log('Instruction ID:', id);

    // Validate ObjectId format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid ObjectId format:', id);
      return res.status(400).json({ error: 'Invalid instruction ID format' });
    }

    await connectToDatabase();
    console.log('Database connected');

  if (req.method === 'GET') {
    try {
      console.log('Fetching instruction:', id);
      
      // First, get the instruction without modifying it
      const instruction = await Instruction.findById(id)
        .populate('createdBy', 'name email')
        .populate('replies.user', 'name email role');

      if (!instruction) {
        console.log('Instruction not found:', id);
        return res.status(404).json({ error: 'Instruction not found' });
      }

      console.log('Instruction found, processing...');

      // Filter replies based on privacy and user role
      const filteredReplies = instruction.replies.filter(reply => {
        // Public comments are visible to everyone
        if (!reply.isPrivate) return true;
        
        // Private comments are visible to:
        // - State admins (can see all)
        // - Coordinators (can see all)
        // - The comment author
        if (session.user.role === 'stateAdmin' || session.user.role === 'coordinator') return true;
        if (reply.user._id.toString() === session.user.id) return true;
        
        return false;
      });

      // Create the response object
      const responseInstruction = instruction.toObject();
      responseInstruction.replies = filteredReplies;

      // Update view count and hierarchy stats using atomic operations
      const updateFields = {
        $inc: { viewCount: 1 }
      };

      // Update hierarchy stats based on user role
      switch (session.user.role) {
        case 'wardAdmin':
          updateFields.$inc['hierarchyStats.wardAdminViews'] = 1;
          break;
        case 'coordinator':
          updateFields.$inc['hierarchyStats.coordinatorViews'] = 1;
          break;
        case 'stateAdmin':
          updateFields.$inc['hierarchyStats.stateAdminViews'] = 1;
          break;
      }

      // Mark as read if not already read
      const hasRead = instruction.readBy.some(read => read.user.toString() === session.user.id);
      if (!hasRead) {
        updateFields.$addToSet = {
          readBy: {
            user: session.user.id,
            readAt: new Date()
          }
        };
      }

      // Update the instruction atomically without validation
      await Instruction.findByIdAndUpdate(
        id,
        updateFields,
        { runValidators: false }
      );

      console.log('Instruction updated successfully');
      res.status(200).json(responseInstruction);
    } catch (error) {
      console.error('Error fetching instruction:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({ 
        error: 'Failed to fetch instruction',
        details: error.message 
      });
    }
  } else if (req.method === 'PUT') {
    // Only state admins can update instructions
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const { 
        title, 
        description, 
        fileUrl, 
        fileName, 
        fileSize, 
        targetAudience, 
        targetWards, 
        targetCoordinators, 
        targetGroups,
        priority, 
        isHighlighted, 
        allowReplies,
        allowPublicComments,
        allowPrivateComments,
        isActive 
      } = req.body;

      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      // Sanitize input
      const sanitizedTitle = typeof title === 'string' ? title.trim() : '';
      const sanitizedDescription = typeof description === 'string' ? description.trim() : '';

      if (!sanitizedTitle || !sanitizedDescription) {
        return res.status(400).json({ error: 'Title and description must be valid strings' });
      }

      // Validate priority
      const validPriorities = ['low', 'medium', 'high'];
      const validatedPriority = validPriorities.includes(priority) ? priority : 'medium';

      // Validate target audience
      const validAudiences = ['all', 'ward_admins', 'coordinators', 'state_admins', 'specific_wards', 'specific_coordinators'];
      const validatedAudience = validAudiences.includes(targetAudience) ? targetAudience : 'all';

      const instruction = await Instruction.findByIdAndUpdate(
        id,
        {
          title: sanitizedTitle,
          description: sanitizedDescription,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileSize: fileSize ? parseInt(fileSize) : null,
          targetAudience: validatedAudience,
          targetWards: targetWards || [],
          targetCoordinators: targetCoordinators || [],
          ...(targetGroups && { targetGroups }),
          priority: validatedPriority,
          isHighlighted: Boolean(isHighlighted),
          allowReplies: allowReplies !== false,
          allowPublicComments: allowPublicComments !== false,
          allowPrivateComments: allowPrivateComments !== false,
          isActive: isActive !== false,
          updatedAt: Date.now()
        },
        { new: true }
      ).populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'targetWards', select: 'name wardNumber panchayath district' },
        { path: 'targetCoordinators', select: 'name email district' }
      ]);

      if (!instruction) {
        return res.status(404).json({ error: 'Instruction not found' });
      }

      res.status(200).json(instruction);
    } catch (error) {
      console.error('Error updating instruction:', error);
      res.status(500).json({ error: 'Failed to update instruction' });
    }
  } else if (req.method === 'POST') {
    // Handle adding replies to instructions
    try {
      console.log('POST request received:', { body: req.body, id, userId: session.user.id });
      const { message, action, commentType, isPrivate, parentReply } = req.body;

      if (action === 'reply') {
        if (!message || message.trim().length === 0) {
          return res.status(400).json({ error: 'Reply message is required' });
        }

        const instruction = await Instruction.findById(id);

        if (!instruction) {
          return res.status(404).json({ error: 'Instruction not found' });
        }

        if (!instruction.allowReplies) {
          return res.status(403).json({ error: 'Comments are not allowed for this instruction' });
        }

        // Determine comment privacy based on user role and selection
        const isCommentPrivate = Boolean(isPrivate);
        const validCommentType = ['public', 'private', 'thread', 'individual'].includes(commentType) ? commentType : 'public';

        // Check if the requested comment type is allowed by the instruction settings
        if (isCommentPrivate && !instruction.allowPrivateComments) {
          return res.status(403).json({ error: 'Private comments are not allowed for this instruction' });
        }
        
        if (!isCommentPrivate && !instruction.allowPublicComments) {
          return res.status(403).json({ error: 'Public comments are not allowed for this instruction' });
        }

        // Add the reply with enhanced privacy features
        instruction.replies.push({
          user: session.user.id,
          message: message.trim(),
          commentType: validCommentType,
          isPrivate: isCommentPrivate,
          parentReply: parentReply || null,
          createdAt: new Date()
        });

        await instruction.save();

        // Populate the instruction with user details for response
        await instruction.populate([
          { path: 'createdBy', select: 'name email' },
          { path: 'replies.user', select: 'name email role' }
        ]);

        res.status(200).json(instruction);
      } else if (action === 'mark_read') {
        console.log('Mark as read action for instruction:', id, 'by user:', session.user.id);
        
        // Use findByIdAndUpdate to avoid validation issues with existing data
        const result = await Instruction.findByIdAndUpdate(
          id,
          {
            $addToSet: {
              readBy: {
                user: session.user.id,
                readAt: new Date()
              }
            }
          },
          { new: true, runValidators: false } // Skip validation to avoid issues with existing data
        );

        if (!result) {
          console.log('Instruction not found:', id);
          return res.status(404).json({ error: 'Instruction not found' });
        }

        console.log('Instruction marked as read successfully');
        res.status(200).json({ message: 'Marked as read', success: true });
      } else if (action === 'mark_unread') {
        console.log('Mark as unread action for instruction:', id, 'by user:', session.user.id);
        
        // Use findByIdAndUpdate to avoid validation issues with existing data
        const result = await Instruction.findByIdAndUpdate(
          id,
          {
            $pull: {
              readBy: { user: session.user.id }
            }
          },
          { new: true, runValidators: false } // Skip validation to avoid issues with existing data
        );

        if (!result) {
          console.log('Instruction not found:', id);
          return res.status(404).json({ error: 'Instruction not found' });
        }

        console.log('Instruction marked as unread successfully');
        res.status(200).json({ message: 'Marked as unread', success: true });
      } else {
        console.log('Invalid action received:', action);
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error handling instruction action:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({ error: 'Failed to process request', details: error.message });
    }
  } else if (req.method === 'DELETE') {
    // Only state admins can delete instructions
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const instruction = await Instruction.findByIdAndDelete(id);

      if (!instruction) {
        return res.status(404).json({ error: 'Instruction not found' });
      }

      res.status(200).json({ message: 'Instruction deleted successfully' });
    } catch (error) {
      console.error('Error deleting instruction:', error);
      res.status(500).json({ error: 'Failed to delete instruction' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  } catch (globalError) {
    console.error('Global error in instructions API:', globalError);
    console.error('Global error details:', {
      message: globalError.message,
      stack: globalError.stack,
      name: globalError.name
    });
    res.status(500).json({ 
      error: 'Internal server error', 
      details: globalError.message 
    });
  }
}