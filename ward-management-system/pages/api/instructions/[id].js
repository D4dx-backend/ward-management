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
        .populate('createdBy', 'name email');

      if (!instruction) {
        return res.status(404).json({ error: 'Instruction not found' });
      }

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
      const { title, description, fileUrl, fileName, fileSize, targetAudience, priority, isActive } = req.body;

      const instruction = await Instruction.findByIdAndUpdate(
        id,
        {
          title,
          description,
          fileUrl,
          fileName,
          fileSize,
          targetAudience,
          priority,
          isActive,
          updatedAt: Date.now()
        },
        { new: true }
      ).populate('createdBy', 'name email');

      if (!instruction) {
        return res.status(404).json({ error: 'Instruction not found' });
      }

      res.status(200).json(instruction);
    } catch (error) {
      console.error('Error updating instruction:', error);
      res.status(500).json({ error: 'Failed to update instruction' });
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
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}