import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'coordinator') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      // Get coordinator's district
      const coordinatorDistrict = session.user.district || 'Unknown';
      
      // Get wards in coordinator's district
      const wards = await Ward.find({ 
        district: coordinatorDistrict,
        isActive: { $ne: false }
      })
      .select('name district')
      .sort({ name: 1 })
      .catch(() => []);

      // Return ward names
      const wardNames = wards.map(ward => ward.name);
      
      res.status(200).json(wardNames);
    } catch (error) {
      console.error('Error fetching coordinator wards:', error);
      res.status(500).json({ error: 'Failed to fetch wards' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}