import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import connectToDatabase from '../../../../lib/mongodb';
import Ward from '../../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Only state admin can view user ward assignments
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      // Get wards assigned to this user (either as coordinator or ward admin)
      const wards = await Ward.find({
        $or: [
          { coordinator: id },
          { wardAdmin: id }
        ]
      })
      .populate('coordinator', 'name email')
      .populate('wardAdmin', 'name email')
      .sort({ district: 1, name: 1 });
      
      return res.status(200).json(wards);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching user wards', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}