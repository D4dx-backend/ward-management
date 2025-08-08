import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Ward from '../../../../models/Ward';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only allow stateAdmin to access this endpoint
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let wards = [];

    if (user.role === 'coordinator') {
      // Find wards where this user is the coordinator
      wards = await Ward.find({ coordinator: id })
        .populate('coordinator', 'name email')
        .populate('wardAdmin', 'name email')
        .sort({ district: 1, name: 1 });
    } else if (user.role === 'wardAdmin') {
      // Find ward where this user is the wardAdmin
      const ward = await Ward.findOne({ wardAdmin: id })
        .populate('coordinator', 'name email')
        .populate('wardAdmin', 'name email');
      
      if (ward) {
        wards = [ward];
      }
    }

    res.status(200).json(wards);
  } catch (error) {
    console.error('Error fetching user wards:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user wards',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}