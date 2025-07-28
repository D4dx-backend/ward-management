import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import Instruction from '../../../../models/Instruction';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const instruction = await Instruction.findById(id);
      if (!instruction) {
        return res.status(404).json({ error: 'Instruction not found' });
      }

      if (!instruction.allowReplies) {
        return res.status(403).json({ error: 'Replies are not allowed for this instruction' });
      }

      // Add the reply
      instruction.replies.push({
        user: session.user.id,
        message: message.trim()
      });

      await instruction.save();

      // Populate the new reply
      await instruction.populate('replies.user', 'name email role');

      // Return the new reply
      const newReply = instruction.replies[instruction.replies.length - 1];

      res.status(201).json(newReply);
    } catch (error) {
      console.error('Error adding reply:', error);
      res.status(500).json({ error: 'Failed to add reply' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}