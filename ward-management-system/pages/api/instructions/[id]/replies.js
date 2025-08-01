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

  if (req.method === 'GET') {
    try {
      const instruction = await Instruction.findById(id)
        .populate('replies.user', 'name email role')
        .select('replies');

      if (!instruction) {
        return res.status(404).json({ error: 'Instruction not found' });
      }

      res.status(200).json({ replies: instruction.replies });
    } catch (error) {
      console.error('Error fetching replies:', error);
      res.status(500).json({ error: 'Failed to fetch replies' });
    }
  } else if (req.method === 'POST') {
    try {
      const { content, commentType, isPrivate, parentReply } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Reply content is required' });
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
        message: content.trim(),
        commentType: commentType || 'thread',
        isPrivate: Boolean(isPrivate),
        parentReply: parentReply || null,
        createdAt: new Date()
      });

      await instruction.save();

      // Return the new reply with populated user data
      await instruction.populate('replies.user', 'name email role');
      const newReply = instruction.replies[instruction.replies.length - 1];

      res.status(201).json({ reply: newReply });
    } catch (error) {
      console.error('Error adding reply:', error);
      res.status(500).json({ error: 'Failed to add reply' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}