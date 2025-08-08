import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  // Set CORS headers for production
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    return res.status(401).json({ message: 'Unauthorized - No session' });
  }

  if (!session.user) {
    return res.status(401).json({ message: 'Unauthorized - No user in session' });
  }

  // Only allow stateAdmin, coordinator, and wardAdmin to access this endpoint
  if (!['stateAdmin', 'coordinator', 'wardAdmin'].includes(session.user.role)) {
    return res.status(403).json({ message: 'Access denied - Invalid role' });
  }

  // Connect to database with retry logic
  try {
    await dbConnect();
  } catch (dbError) {
    console.error('Database connection error:', dbError);
    return res.status(503).json({ 
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? dbError.message : 'Service unavailable'
    });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { district, page = 1, limit = 100 } = req.query;

    console.log('=== WARDS API PRODUCTION DEBUG ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('User role:', session.user.role);
    console.log('User ID:', session.user.id);
    console.log('Request method:', req.method);
    console.log('Database URL exists:', !!process.env.MONGODB_URI);

    // Validate session user data
    if (!session.user.id) {
      console.error('Session user missing ID');
      return res.status(400).json({ message: 'Invalid session: missing user ID' });
    }

    // Validate user ID format for production
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      console.error('Invalid user ID format:', session.user.id);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Build query with production-safe ObjectId handling
    let query = {};
    
    // For Ward Incharges, only return their assigned wards
    if (session.user.role === 'wardAdmin') {
      // Ensure ObjectId conversion for production
      const userId = new mongoose.Types.ObjectId(session.user.id);
      query.wardAdmin = userId;
      console.log('Ward admin query:', { wardAdmin: userId.toString() });
    } else {
      // For stateAdmin and coordinator, apply district filter if provided
      if (district) {
        query.district = district;
      }
      console.log('Other role query:', query);
    }

    // Add active ward filter
    query.isActive = { $ne: false };

    // Calculate pagination with validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 100));
    const skip = (pageNum - 1) * limitNum;

    console.log('Pagination:', { page: pageNum, limit: limitNum, skip });
    console.log('Database connection state:', mongoose.connection.readyState);
    
    // Test database connection with timeout
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected, state:', mongoose.connection.readyState);
      return res.status(503).json({ message: 'Database connection not ready' });
    }
    
    // Fetch wards with production-optimized query
    let wards;
    try {
      console.log('Executing ward query with timeout...');
      
      // Use Promise.race for timeout handling
      const queryPromise = Ward.find(query)
        .populate('coordinator', 'name email district')
        .populate('wardAdmin', 'name email district')
        .sort({ district: 1, name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 15000)
      );

      wards = await Promise.race([queryPromise, timeoutPromise]);
      
      console.log(`Query successful: Found ${wards.length} wards`);
      
    } catch (queryError) {
      console.error('Database query error:', queryError);
      console.error('Query error name:', queryError.name);
      console.error('Query error message:', queryError.message);
      
      if (queryError.message === 'Query timeout') {
        return res.status(504).json({ 
          message: 'Database query timeout',
          error: 'Request took too long to process'
        });
      }
      
      return res.status(500).json({ 
        message: 'Database query failed',
        error: process.env.NODE_ENV === 'development' ? queryError.message : 'Query error'
      });
    }

    // Validate results
    if (!Array.isArray(wards)) {
      console.error('Invalid query result:', typeof wards);
      return res.status(500).json({ message: 'Invalid query result format' });
    }

    console.log(`Found ${wards.length} wards for user ${session.user.id}`);
    
    // Log ward details for debugging (production-safe)
    if (wards.length > 0) {
      console.log('Sample ward:', {
        id: wards[0]._id?.toString(),
        name: wards[0].name,
        hasWardAdmin: !!wards[0].wardAdmin,
        district: wards[0].district
      });
    }

    // Get total count with timeout
    let totalCount = wards.length;
    try {
      const countPromise = Ward.countDocuments(query).exec();
      const countTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Count timeout')), 5000)
      );
      
      totalCount = await Promise.race([countPromise, countTimeoutPromise]);
    } catch (countError) {
      console.warn('Count query failed, using result length:', countError.message);
      // Use wards.length as fallback
    }

    console.log('Total count:', totalCount);

    // For ward admin users, provide helpful logging
    if (session.user.role === 'wardAdmin') {
      if (wards.length === 0) {
        console.warn(`Ward admin ${session.user.id} has no assigned wards`);
        console.warn('This could mean:');
        console.warn('1. User is not assigned to any wards');
        console.warn('2. Ward assignment is incorrect in database');
        console.warn('3. User ID mismatch between session and database');
      } else {
        console.log(`Ward admin ${session.user.id} has ${wards.length} assigned ward(s)`);
      }
    }

    // Set cache headers for production
    res.setHeader('Cache-Control', 'private, max-age=60');
    
    // Return wards with metadata for debugging
    const response = {
      wards,
      meta: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        hasMore: totalCount > (pageNum * limitNum)
      }
    };

    // For backward compatibility, return just the wards array
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