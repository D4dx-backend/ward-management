import { getSession } from 'next-auth/react';
import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
import Ward from '../../models/Ward';

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
      .select('name email role district mobileNumber createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));



    // Add assigned wards for each user based on their role
    const usersWithWards = await Promise.all(users.map(async (user) => {
      const userObj = user.toObject();
      
      if (user.role === 'coordinator') {
        // Find wards where this user is the coordinator
        const assignedWards = await Ward.find({ coordinator: user._id })
          .select('name district')
          .lean();
        userObj.assignedWards = assignedWards;
      } else if (user.role === 'wardAdmin') {
        // Find ward where this user is the wardAdmin
        const assignedWard = await Ward.findOne({ wardAdmin: user._id })
          .select('name district')
          .lean();
        userObj.assignedWards = assignedWard ? [assignedWard] : [];
      } else {
        userObj.assignedWards = [];
      }
      
      return userObj;
    }));

    // Get total count
    const totalCount = await User.countDocuments(query);

    if (process.env.NODE_ENV === 'development') {
      console.log('Users found:', usersWithWards.length, 'Total count:', totalCount);
    }

    // For backward compatibility, return users directly
    res.status(200).json(usersWithWards);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      message: 'Failed to fetch users',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}