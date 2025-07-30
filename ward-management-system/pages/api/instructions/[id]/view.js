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
      const instruction = await Instruction.findById(id);

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

      await instruction.save();

      res.status(200).json({
        viewCount: instruction.viewCount,
        hierarchyStats: instruction.hierarchyStats
      });
    } catch (error) {
      console.error('Error updating view count:', error);
      res.status(500).json({ error: 'Failed to update view count' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}