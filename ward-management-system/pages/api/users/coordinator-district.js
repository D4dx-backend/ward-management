import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only coordinators can access this endpoint
  if (session.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Access denied' });
  }

  await connectToDatabase();

  try {
    // Get all ward admins in the coordinator's district
    const wardAdmins = await User.find({
      role: 'wardAdmin',
      district: session.user.district
    }).select('-password -pinCode').sort({ name: 1 });

    return res.status(200).json(wardAdmins);
  } catch (error) {
    console.error('Error fetching coordinator district users:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
}