import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Get coordinator's assigned wards
    const coordinator = await User.findById(session.user.id);
    
    if (!coordinator || !coordinator.assignedWards || coordinator.assignedWards.length === 0) {
      return res.status(200).json([]);
    }

    const wards = await Ward.find({
      _id: { $in: coordinator.assignedWards }
    }).select('name district _id').sort({ name: 1 });

    res.status(200).json(wards);
  } catch (error) {
    console.error('Error fetching coordinator wards:', error);
    res.status(500).json({ message: 'Failed to fetch wards' });
  }
}