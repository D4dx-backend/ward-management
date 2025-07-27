import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (session.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      // Get wards assigned to this coordinator
      const wards = await Ward.find({ coordinator: session.user.id })
        .populate('wardAdmin', 'name email mobileNumber lastLogin')
        .populate('coordinator', 'name email')
        .sort({ wardNumber: 1 });
      
      return res.status(200).json(wards);
    } catch (error) {
      console.error('Error fetching coordinator wards:', error);
      return res.status(500).json({ message: 'Error fetching wards', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}