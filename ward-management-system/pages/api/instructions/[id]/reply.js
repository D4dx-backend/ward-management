import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import Instruction from '../../../../models/Instruction';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  await dbConnect();

  if (req.method === 'POST') {
    try {
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Reply message is required' });
      }

      if (message.trim().length > 1000) {
        return res.status(400).json({ error: 'Reply message must be less than 1000 characters' });
      }

      const instruction = await Instruction.findById(id);

      if (!instruction) {
        return res.status(404).json({ error: 'Instruction not found' });
      }

      if (!instruction.allowReplies) {
        return res.status(403).json({ error: 'Replies are not allowed for this instruction' });
      }

      // Check if user has permission to view this instruction
      const userRole = session.user.role;
      const userId = session.user.id;
      
      let hasAccess = false;
      
      if (instruction.targetAudience === 'all') {
        hasAccess = true;
      } else if (instruction.targetAudience === 'coordinators' && userRole === 'coordinator') {
        hasAccess = true;
      } else if (instruction.targetAudience === 'ward_admins' && userRole === 'wardAdmin') {
        hasAccess = true;
      } else if (instruction.targetAudience === 'specific_coordinators' && instruction.targetCoordinators.includes(userId)) {
        hasAccess = true;
      } else if (instruction.targetAudience === 'specific_wards' && instruction.targetWards.length > 0) {
        // Check if user's ward is in target wards
        const User = require('../../../../models/User');
        const Ward = require('../../../../models/Ward');
        const user = await User.findById(userId);
        if (user && userRole === 'wardAdmin') {
          const ward = await Ward.findOne({ wardAdmin: userId });
          if (ward && instruction.targetWards.includes(ward._id)) {
            hasAccess = true;
          }
        }
      } else if (userRole === 'stateAdmin') {
        hasAccess = true; // State admin can always reply
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to reply to this instruction' });
      }

      // Create the reply object
      const newReply = {
        user: session.user.id,
        message: message.trim(),
        createdAt: new Date()
      };

      // Add the reply to the instruction
      instruction.replies.push(newReply);
      await instruction.save();

      // Populate user details for the response
      await instruction.populate('replies.user', 'name email role');
      
      // Return the new reply with populated user data
      const populatedReply = instruction.replies[instruction.replies.length - 1];

      res.status(200).json(populatedReply);
    } catch (error) {
      console.error('Error adding reply:', error);
      res.status(500).json({ error: 'Failed to add reply' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}