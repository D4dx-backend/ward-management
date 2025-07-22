import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  await dbConnect();

  try {
    const instructions = await Instruction.find({});
    let updatedCount = 0;
    let deletedCount = 0;

    for (const instruction of instructions) {
      let needsUpdate = false;
      const updates = {};

      // Fix corrupted description
      if (instruction.description) {
        const cleanDesc = instruction.description
          .replace(/[^\x20-\x7E\n\r\t]/g, '')
          .replace(/�/g, '')
          .trim();
        
        if (cleanDesc !== instruction.description) {
          updates.description = cleanDesc || 'Description not available';
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await Instruction.findByIdAndUpdate(instruction._id, updates);
        updatedCount++;
      }
    }

    res.status(200).json({
      message: 'Cleanup completed',
      updated: updatedCount,
      deleted: deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
}