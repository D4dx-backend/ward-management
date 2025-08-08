import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only allow stateAdmin, coordinator, and wardAdmin to access this endpoint
  if (!['stateAdmin', 'coordinator', 'wardAdmin'].includes(session.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { district, page = 1, limit = 100 } = req.query;

    console.log('=== WARDS API DEBUG ===');
    console.log('User role:', session.user.role);
    console.log('User ID:', session.user.id);

    // Validate session user data
    if (!session.user.id) {
      console.error('Session user missing ID');
      return res.status(400).json({ message: 'Invalid session: missing user ID' });
    }

    // Build query
    let query = {};
    
    // For Ward Incharges, only return their assigned wards
    if (session.user.role === 'wardAdmin') {
      // Convert user ID to ObjectId if needed
      const mongoose = require('mongoose');
      const userId = mongoose.Types.ObjectId.isValid(session.user.id) 
        ? session.user.id 
        : new mongoose.Types.ObjectId(session.user.id);
      
      query.wardAdmin = userId;
      console.log('Ward admin query:', query);
      console.log('Ward admin user ID type:', typeof session.user.id);
      console.log('Ward admin user ID value:', session.user.id);
    } else {
      // For stateAdmin and coordinator, apply district filter if provided
      if (district) {
        query.district = district;
      }
      console.log('Other role query:', query);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log('Executing ward query...');
    console.log('Database connection state:', require('mongoose').connection.readyState);
    
    // Test database connection
    if (require('mongoose').connection.readyState !== 1) {
      console.error('Database not connected');
      return res.status(500).json({ message: 'Database connection error' });
    }
    
    // Fetch wards with valid populate fields only
    let wards;
    try {
      wards = await Ward.find(query)
        .populate('coordinator', 'name email district')
        .populate('wardAdmin', 'name email district')
        .populate('createdBy', 'name email')
        .sort({ district: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(); // Use lean() for better performance
    } catch (queryError) {
      console.error('Database query error:', queryError);
      return res.status(500).json({ 
        message: 'Database query failed',
        error: process.env.NODE_ENV === 'development' ? queryError.message : 'Query error'
      });
    }

    console.log(`Found ${wards.length} wards for user ${session.user.id}`);
    console.log('Wards:', wards.map(w => ({ 
      id: w._id, 
      name: w.name, 
      wardAdmin: w.wardAdmin,
      district: w.district 
    })));

    // Get total count
    let totalCount;
    try {
      totalCount = await Ward.countDocuments(query);
    } catch (countError) {
      console.error('Count query error:', countError);
      totalCount = wards.length; // Fallback to current results count
    }

    console.log('Total count:', totalCount);

    // For ward admin users, if no wards found, provide helpful message
    if (session.user.role === 'wardAdmin' && wards.length === 0) {
      console.warn(`Ward admin ${session.user.id} has no assigned wards`);
      // Still return empty array but log the issue
    }

    // Return wards directly for backward compatibility
    res.status(200).json(wards);
  } catch (error) {
    console.error('=== WARDS API ERROR ===');
    console.error('Error fetching wards:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Session user:', session?.user);
    console.error('Database state:', require('mongoose').connection.readyState);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch wards';
    let statusCode = 500;
    
    if (error.name === 'CastError') {
      errorMessage = 'Invalid user ID format';
      statusCode = 400;
    } else if (error.name === 'MongooseError') {
      errorMessage = 'Database connection error';
      statusCode = 503;
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Data validation error';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }
}