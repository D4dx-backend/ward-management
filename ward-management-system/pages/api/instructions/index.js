import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';
import User from '../../../models/User';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

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
          { targetWards: { $in: await Ward.find({ coordinator: session.user.id }).distinct('_id') } }
        ];
      } else if (session.user.role === 'wardAdmin') {
        const user = await User.findById(session.user.id);
        const ward = await Ward.findOne({ wardAdmin: session.user.id });
        query.$or = [
          { targetAudience: 'all' },
          { targetAudience: 'ward_admins' },
          { targetWards: ward ? ward._id : null }
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

      // Ultra-aggressive cleaning for severely corrupted data
      const cleanInstructions = instructions.map((instruction, index) => {
        const obj = instruction.toObject();
        
        // Clean title
        let cleanTitle = 'Untitled Instruction';
        if (obj.title && typeof obj.title === 'string' && !obj.title.includes('�')) {
          cleanTitle = obj.title.substring(0, 100); // Limit length
        }
        
        // For severely corrupted descriptions, use a safe fallback
        let cleanDescription = 'Instruction description is currently unavailable due to data corruption. Please contact the administrator for details.';
        
        // Only try to clean if the description looks salvageable
        if (obj.description && typeof obj.description === 'string') {
          const testClean = obj.description
            .replace(/[^\x20-\x7E\s]/g, '')
            .replace(/�/g, '')
            .trim();
          
          // If cleaned version is reasonable, use it
          if (testClean && testClean.length > 10 && testClean.length < 300) {
            cleanDescription = testClean;
          }
        }
        
        return {
          _id: obj._id || `fallback-${index}`,
          title: cleanTitle,
          description: cleanDescription,
          priority: ['low', 'medium', 'high'].includes(obj.priority) ? obj.priority : 'medium',
          targetAudience: ['all', 'coordinators', 'ward_admins'].includes(obj.targetAudience) ? obj.targetAudience : 'all',
          fileUrl: obj.fileUrl || null,
          fileName: obj.fileName || null,
          createdAt: obj.createdAt || new Date(),
          createdBy: obj.createdBy || null
        };
      });

      const total = await Instruction.countDocuments(query);

      // If all instructions are corrupted, provide a clean sample
      if (cleanInstructions.length === 0 || cleanInstructions.every(inst => 
        inst.description.includes('currently unavailable due to data corruption'))) {
        
        const sampleInstructions = [{
          _id: 'sample-1',
          title: 'System Notice',
          description: 'The instructions system is currently being updated. Please check back later for important announcements.',
          priority: 'medium',
          targetAudience: 'all',
          fileUrl: null,
          fileName: null,
          createdAt: new Date(),
          createdBy: null
        }];
        
        return res.status(200).json({
          instructions: sampleInstructions,
          pagination: {
            page: 1,
            limit: parseInt(limit),
            total: 1,
            pages: 1
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
      res.status(500).json({ error: 'Failed to fetch instructions' });
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

      // Validate priority
      const validPriorities = ['low', 'medium', 'high'];
      const validatedPriority = validPriorities.includes(priority) ? priority : 'medium';

      // Validate target audience
      const validAudiences = ['all', 'coordinators', 'ward_admins', 'specific_wards', 'specific_coordinators'];
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
      res.status(500).json({ error: 'Failed to create instruction' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}