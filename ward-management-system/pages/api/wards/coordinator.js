import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    // Get all wards assigned to this coordinator
    const wards = await Ward.find({ 
      coordinator: session.user.id 
    })
    .select('name wardNumber district panchayath coordinator isSittingWard')
    .sort({ wardNumber: 1 });

    return res.status(200).json(wards);

  } catch (error) {
    console.error('Error fetching coordinator wards:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}