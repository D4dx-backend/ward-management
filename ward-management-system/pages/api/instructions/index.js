import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';
import User from '../../../models/User';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  // Add cache control headers to prevent caching issues
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    console.log(`Instructions API called: ${req.method} ${req.url}`);
    
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      console.log('No session found for instructions API');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`User ${session.user.id} (${session.user.role}) accessing instructions API`);

    await connectToDatabase();
    console.log('Database connected successfully');

  if (req.method === 'GET') {
    try {
      const { targetAudience, search, page = 1, limit = 10 } = req.query;
      
      let query = { isActive: true };
      
      // Enhanced filtering based on user role and specific targeting
      if (session.user.role === 'coordinator') {
        const user = await User.findById(session.user.id);
        query.$or = [
          { targetAudience: 'all' },
          { targetAudience: 'coordinators' },
          { targetCoordinators: session.user.id },
          { targetWards: { $in: await Ward.find({ coordinator: session.user.id }).distinct('_id') } },
          { targetAudience: 'ward_or_group', targetWards: { $in: await Ward.find({ coordinator: session.user.id }).distinct('_id') } },
          { targetGroups: 'all_coordinators' },
          { targetGroups: 'specific_coordinators', targetCoordinators: session.user.id },
          { targetGroups: 'individual_user', targetCoordinators: session.user.id }
        ];
      } else if (session.user.role === 'wardAdmin') {
        const user = await User.findById(session.user.id);
        const ward = await Ward.findOne({ wardAdmin: session.user.id });
        query.$or = [
          { targetAudience: 'all' },
          { targetAudience: 'ward_admins' },
          { targetWards: ward ? ward._id : null },
          { targetAudience: 'ward_or_group', targetWards: ward ? ward._id : null },
          { targetGroups: 'all_ward_admins' },
          { targetGroups: 'specific_ward_admins', targetWards: ward ? ward._id : null },
          { targetGroups: 'individual_user', targetCoordinators: session.user.id }
        ].filter(condition => condition.targetWards !== null);
      } else if (targetAudience && targetAudience !== 'all') {
        query.targetAudience = targetAudience;
      }
      
      // Search functionality
      if (search) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Sort by highlighted first, then by creation date
      const instructions = await Instruction.find(query)
        .populate('createdBy', 'name email')
        .populate('targetWards', 'name wardNumber panchayath district')
        .populate('targetCoordinators', 'name email district')
        .populate('replies.user', 'name email role')
        .sort({ isHighlighted: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Clean instructions for display - handle data corruption gracefully
      const cleanInstructions = instructions.map((instruction, index) => {
        const obj = instruction.toObject();
        
        // Clean title - be more permissive
        let cleanTitle = 'Untitled Instruction';
        if (obj.title && typeof obj.title === 'string') {
          // Remove only the most problematic characters but keep most content
          const titleClean = obj.title
            .replace(/�/g, '') // Remove replacement characters
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
            .trim();
          
          if (titleClean && titleClean.length > 0) {
            cleanTitle = titleClean.substring(0, 200); // Allow longer titles
          }
        }
        
        // Clean description - be more permissive
        let cleanDescription = '';
        if (obj.description && typeof obj.description === 'string') {
          // Remove only the most problematic characters but keep most content
          const descClean = obj.description
            .replace(/�/g, '') // Remove replacement characters
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
            .trim();
          
          if (descClean && descClean.length > 0) {
            cleanDescription = descClean; // Keep full description
          }
        }
        
        // Check if user has read this instruction
        const hasRead = obj.readBy && obj.readBy.some(read => read.user.toString() === session.user.id);
        
        return {
          _id: obj._id || `fallback-${index}`,
          title: cleanTitle,
          description: cleanDescription,
          priority: ['low', 'medium', 'high'].includes(obj.priority) ? obj.priority : 'medium',
          targetAudience: ['all', 'coordinators', 'ward_admins', 'specific_wards', 'specific_coordinators', 'ward_or_group'].includes(obj.targetAudience) ? obj.targetAudience : 'all',
          targetWards: obj.targetWards || [],
          targetCoordinators: obj.targetCoordinators || [],
          ...(obj.targetGroups && { targetGroups: obj.targetGroups }),
          fileUrl: obj.fileUrl || null,
          fileName: obj.fileName || null,
          isHighlighted: Boolean(obj.isHighlighted),
          allowReplies: obj.allowReplies !== false,
          viewCount: obj.viewCount || 0,
          hierarchyStats: obj.hierarchyStats || {
            wardAdminViews: 0,
            coordinatorViews: 0,
            stateAdminViews: 0
          },
          replies: obj.replies || [],
          readBy: obj.readBy || [],
          isRead: hasRead,
          createdAt: obj.createdAt || new Date(),
          createdBy: obj.createdBy || null
        };
      });

      const total = await Instruction.countDocuments(query);

      // If no instructions found, return empty array
      if (cleanInstructions.length === 0) {
        return res.status(200).json({
          instructions: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }

      res.status(200).json({
        instructions: cleanInstructions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching instructions:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({ 
        error: 'Failed to fetch instructions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else if (req.method === 'POST') {
    // Only state admins can create instructions
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
        allowReplies 
      } = req.body;

      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      // Validate and sanitize input
      const sanitizedTitle = typeof title === 'string' ? title.trim() : '';
      const sanitizedDescription = typeof description === 'string' ? description.trim() : '';

      if (!sanitizedTitle || !sanitizedDescription) {
        return res.status(400).json({ error: 'Title and description must be valid strings' });
      }

      if (sanitizedTitle.length > 200) {
        return res.status(400).json({ error: 'Title must be less than 200 characters' });
      }

      if (sanitizedDescription.length > 5000) {
        return res.status(400).json({ error: 'Description must be less than 5000 characters' });
      }

      // Validate priority
      const validPriorities = ['low', 'medium', 'high'];
      const validatedPriority = validPriorities.includes(priority) ? priority : 'medium';

      // Validate target audience
      const validAudiences = ['all', 'coordinators', 'ward_admins', 'specific_wards', 'specific_coordinators', 'ward_or_group'];
      const validatedAudience = validAudiences.includes(targetAudience) ? targetAudience : 'all';

      const instruction = new Instruction({
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
        createdBy: session.user.id
      });

      await instruction.save();
      await instruction.populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'targetWards', select: 'name wardNumber panchayath district' },
        { path: 'targetCoordinators', select: 'name email district' }
      ]);

      res.status(201).json(instruction);
    } catch (error) {
      console.error('Error creating instruction:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({ 
        error: 'Failed to create instruction',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  } catch (error) {
    console.error('Error in instructions API:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      method: req.method,
      url: req.url
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}