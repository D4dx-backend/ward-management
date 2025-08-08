import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  let session;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (sessionError) {
    console.error('Session error:', sessionError);
    return res.status(401).json({ 
      message: 'Session authentication failed',
      error: process.env.NODE_ENV === 'development' ? sessionError.message : 'Authentication error'
    });
  }

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
    // Get wards where this user is the coordinator
    const wards = await Ward.find({
      coordinator: session.user.id,
      isActive: true
    })
    .select('name district wardNumber _id')
    .sort({ name: 1 });

    res.status(200).json(wards);
  } catch (error) {
    console.error('Error fetching coordinator wards:', error);
    res.status(500).json({ message: 'Failed to fetch wards' });
  }
}