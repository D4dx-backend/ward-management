import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';
import User from '../../../models/User';

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
      
      // Filter by target audience based on user role
      if (session.user.role === 'coordinator' || session.user.role === 'wardAdmin') {
        const roleMapping = {
          'coordinator': 'coordinators',
          'wardAdmin': 'ward_admins'
        };
        query.targetAudience = { $in: ['all', roleMapping[session.user.role]] };
      } else if (targetAudience && targetAudience !== 'all') {
        query.targetAudience = targetAudience;
      }
      
      // Search functionality
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const instructions = await Instruction.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Instruction.countDocuments(query);

      res.status(200).json({
        instructions,
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
      const { title, description, fileUrl, fileName, fileSize, targetAudience, priority } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      const instruction = new Instruction({
        title,
        description,
        fileUrl,
        fileName,
        fileSize,
        targetAudience,
        priority,
        createdBy: session.user.id
      });

      await instruction.save();
      await instruction.populate('createdBy', 'name email');

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