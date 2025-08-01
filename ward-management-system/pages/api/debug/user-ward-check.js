import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await connectToDatabase();

    // Get user details
    const user = await User.findById(session.user.id);
    
    // Check ward assignment
    let wardAssignment = null;
    if (session.user.role === 'wardAdmin') {
      wardAssignment = await Ward.findOne({ wardAdmin: session.user.id });
    } else if (session.user.role === 'coordinator') {
      wardAssignment = await Ward.find({ coordinator: session.user.id });
    }

    return res.status(200).json({
      session: {
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name,
        email: session.user.email
      },
      userFromDB: user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district
      } : null,
      wardAssignment: wardAssignment,
      debug: {
        hasSession: !!session,
        hasUser: !!user,
        hasWardAssignment: !!wardAssignment
      }
    });

  } catch (error) {
    console.error('Debug user-ward check error:', error);
    return res.status(500).json({ 
      message: 'Debug check failed', 
      error: error.message 
    });
  }
}