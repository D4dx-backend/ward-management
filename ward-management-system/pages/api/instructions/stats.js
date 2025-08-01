import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    try {
      let query = { isActive: true };
      
      // Filter instructions based on user role and targeting
      if (session.user.role === 'coordinator') {
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
      }

      const instructions = await Instruction.find(query).select('_id readBy');
      
      const totalInstructions = instructions.length;
      const readInstructions = instructions.filter(instruction => 
        instruction.readBy.some(read => read.user.toString() === session.user.id)
      ).length;
      const unreadInstructions = totalInstructions - readInstructions;

      res.status(200).json({
        total: totalInstructions,
        read: readInstructions,
        unread: unreadInstructions
      });
    } catch (error) {
      console.error('Error fetching instruction stats:', error);
      res.status(500).json({ error: 'Failed to fetch instruction statistics' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}