import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  await dbConnect();

  if (req.method === 'GET') {
    try {
      const instruction = await Instruction.findById(id)
        .populate('createdBy', 'name email')
        .populate('replies.user', 'name email role');

      if (!instruction) {
        return res.status(404).json({ error: 'Instruction not found' });
      }

      // Track view count and hierarchy stats
      instruction.viewCount = (instruction.viewCount || 0) + 1;
      
      // Update hierarchy stats based on user role
      if (!instruction.hierarchyStats) {
        instruction.hierarchyStats = {
          wardAdminViews: 0,
          coordinatorViews: 0,
          stateAdminViews: 0
        };
      }

      switch (session.user.role) {
        case 'wardAdmin':
          instruction.hierarchyStats.wardAdminViews = (instruction.hierarchyStats.wardAdminViews || 0) + 1;
          break;
        case 'coordinator':
          instruction.hierarchyStats.coordinatorViews = (instruction.hierarchyStats.coordinatorViews || 0) + 1;
          break;
        case 'stateAdmin':
          instruction.hierarchyStats.stateAdminViews = (instruction.hierarchyStats.stateAdminViews || 0) + 1;
          break;
      }

      // Mark as read if not already read
      const hasRead = instruction.readBy.some(read => read.user.toString() === session.user.id);
      if (!hasRead) {
        instruction.readBy.push({
          user: session.user.id,
          readAt: new Date()
        });
      }

      await instruction.save();

      res.status(200).json(instruction);
    } catch (error) {
      console.error('Error fetching instruction:', error);
      res.status(500).json({ error: 'Failed to fetch instruction' });
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
      const validAudiences = ['all', 'coordinators', 'ward_admins', 'specific_wards', 'specific_coordinators', 'ward_or_group'];
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
          return res.status(403).json({ error: 'Replies are not allowed for this instruction' });
        }

        // Add the reply with enhanced features
        instruction.replies.push({
          user: session.user.id,
          message: message.trim(),
          commentType: commentType || 'thread',
          isPrivate: Boolean(isPrivate),
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
        const instruction = await Instruction.findById(id);

        if (!instruction) {
          return res.status(404).json({ error: 'Instruction not found' });
        }

        // Mark as read if not already read
        const hasRead = instruction.readBy.some(read => read.user.toString() === session.user.id);
        if (!hasRead) {
          instruction.readBy.push({
            user: session.user.id,
            readAt: new Date()
          });
          await instruction.save();
        }

        res.status(200).json({ message: 'Marked as read' });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error handling instruction action:', error);
      res.status(500).json({ error: 'Failed to process request' });
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
}