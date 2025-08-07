import { getSession } from 'next-auth/react';
import dbConnect from '../../lib/mongodb';
import User from '../../models/User';

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
    const { role, page = 1, limit = 50 } = req.query;

    if (process.env.NODE_ENV === 'development') {
      console.log('Users API called with:', { role, page, limit, userRole: session.user.role });
    }

    // Build query
    let query = {};
    if (role) {
      query.role = role;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('User query:', query);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch users
    const users = await User.find(query)
      .select('name email role assignedWards createdAt')
      .populate('assignedWards', 'name district')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalCount = await User.countDocuments(query);

    if (process.env.NODE_ENV === 'development') {
      console.log('Users found:', users.length, 'Total count:', totalCount);
    }

    const result = {
      users,
      totalCount,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      currentPage: parseInt(page)
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      message: 'Failed to fetch users',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}