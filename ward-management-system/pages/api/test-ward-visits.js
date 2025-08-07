import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import connectToDatabase from '../../lib/mongodb';
import WardVisit from '../../models/WardVisit';
import User from '../../models/User';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    await connectToDatabase();
    
    // Test user information
    const user = await User.findById(session.user.id).populate('ward').lean();
    
    // Test ward visits query
    let visits = [];
    let queryError = null;
    
    try {
      if (user?.ward) {
        visits = await WardVisit.find({ 
          ward: user.ward._id 
        })
        .populate('coordinator', 'name email')
        .populate('ward', 'name')
        .sort({ visitDate: -1, visitTime: -1 })
        .limit(10)
        .lean();
      }
    } catch (error) {
      queryError = error.message;
    }
    
    // Test database collections
    const wardVisitCount = await WardVisit.countDocuments();
    const userCount = await User.countDocuments();
    const wardCount = await Ward.countDocuments();
    
    return res.status(200).json({
      message: 'Ward visits API test',
      session: {
        userId: session.user.id,
        userRole: session.user.role,
        userName: session.user.name
      },
      user: {
        id: user?._id,
        name: user?.name,
        role: user?.role,
        ward: user?.ward ? {
          id: user.ward._id,
          name: user.ward.name,
          district: user.ward.district
        } : null
      },
      database: {
        connected: true,
        collections: {
          wardVisits: wardVisitCount,
          users: userCount,
          wards: wardCount
        }
      },
      wardVisits: {
        count: visits.length,
        queryError,
        visits: visits.map(v => ({
          id: v._id,
          visitDate: v.visitDate,
          visitTime: v.visitTime,
          purpose: v.purpose?.substring(0, 50) + '...',
          coordinator: v.coordinator?.name,
          ward: v.ward?.name,
          createdAt: v.createdAt
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      message: 'Test failed', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}