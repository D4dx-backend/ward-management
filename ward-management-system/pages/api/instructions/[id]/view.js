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
      // Prepare update object based on user role
      const updateObj = { $inc: { viewCount: 1 } };
      
      // Track hierarchy-based view counts
      if (session.user.role === 'wardAdmin') {
        updateObj.$inc['hierarchyStats.wardAdminViews'] = 1;
      } else if (session.user.role === 'coordinator') {
        updateObj.$inc['hierarchyStats.coordinatorViews'] = 1;
      } else if (session.user.role === 'stateAdmin') {
        updateObj.$inc['hierarchyStats.stateAdminViews'] = 1;
      }

      const instruction = await Instruction.findByIdAndUpdate(
        id,
        updateObj,
        { new: true }
      );

      if (!instruction) {
        return res.status(404).json({ error: 'Instruction not found' });
      }

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