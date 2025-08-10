import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import Ward from '../../models/Ward';
import { log, logError } from '../../lib/logger';

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
    log('Session debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email,
      environment: process.env.NODE_ENV
    });
  } catch (sessionError) {
    logError('Session error:', sessionError);
    return res.status(401).json({ 
      message: 'Session authentication failed',
      error: process.env.NODE_ENV === 'development' ? sessionError.message : 'Authentication error'
    });
  }

  if (!session) {
    logError('No session found');
    return res.status(401).json({ message: 'Unauthorized - No session' });
  }

  if (!session.user) {
    logError('No user in session');
    return res.status(401).json({ message: 'Unauthorized - No user in session' });
  }

  if (!session.user.id) {
    logError('No user ID in session');
    return res.status(401).json({ message: 'Unauthorized - Invalid session data' });
  }

  // Only allow stateAdmin, coordinator, and wardAdmin to access this endpoint
  if (!['stateAdmin', 'coordinator', 'wardAdmin'].includes(session.user.role)) {
    return res.status(403).json({ message: 'Access denied - Invalid role' });
  }

  // Connect to database with retry logic
  try {
    await dbConnect();
  } catch (dbError) {
    logError('Database connection error:', dbError);
    return res.status(503).json({ 
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? dbError.message : 'Service unavailable'
    });
  }

  // Handle different HTTP methods
  if (req.method === 'GET') {
    return handleGetWards(req, res, session);
  } else if (req.method === 'POST') {
    return handleCreateWard(req, res, session);
  } else if (req.method === 'PUT') {
    return handleUpdateWard(req, res, session);
  } else if (req.method === 'DELETE') {
    return handleDeleteWard(req, res, session);
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Handle GET requests - fetch wards
async function handleGetWards(req, res, session) {
  try {
    const { district, page = 1, limit = 100 } = req.query;

    log('=== WARDS API GET DEBUG ===');
    log('Environment:', process.env.NODE_ENV);
    log('User role:', session.user.role);
    log('User ID:', session.user.id);
    log('Request method:', req.method);
    log('Database URL exists:', !!process.env.MONGODB_URI);

    // Validate session user data
    if (!session.user.id) {
      logError('Session user missing ID');
      return res.status(400).json({ message: 'Invalid session: missing user ID' });
    }

    // Validate user ID format for production
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      logError('Invalid user ID format:', session.user.id);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Build query with production-safe ObjectId handling
    let query = {};
    
    // For Ward Incharges, only return their assigned wards
    if (session.user.role === 'wardAdmin') {
      // Ensure ObjectId conversion for production
      const userId = new mongoose.Types.ObjectId(session.user.id);
      query.wardAdmin = userId;
      log('Ward admin query:', { wardAdmin: userId.toString() });
    } else {
      // For stateAdmin and coordinator, apply district filter if provided
      if (district) {
        query.district = district;
      }
      log('Other role query:', query);
    }

    // Add active ward filter
    query.isActive = { $ne: false };

    // Calculate pagination with validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 100));
    const skip = (pageNum - 1) * limitNum;

    log('Pagination:', { page: pageNum, limit: limitNum, skip });
    log('Database connection state:', mongoose.connection.readyState);
    
    // Test database connection with timeout
    if (mongoose.connection.readyState !== 1) {
      logError('Database not connected, state:', mongoose.connection.readyState);
      return res.status(503).json({ message: 'Database connection not ready' });
    }
    
    // Fetch wards with production-optimized query
    let wards;
    try {
      log('Executing ward query with timeout...');
      
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
      
      log(`Query successful: Found ${wards.length} wards`);
      
    } catch (queryError) {
      logError('Database query error:', queryError);
      logError('Query error name:', queryError.name);
      logError('Query error message:', queryError.message);
      
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
      logError('Invalid query result:', typeof wards);
      return res.status(500).json({ message: 'Invalid query result format' });
    }

    log(`Found ${wards.length} wards for user ${session.user.id}`);
    
    // Log ward details for debugging (production-safe)
    if (wards.length > 0) {
      log('Sample ward:', {
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
      logError('Count query failed, using result length:', countError.message);
      // Use wards.length as fallback
    }

    log('Total count:', totalCount);

    // For ward admin users, provide helpful logging
    if (session.user.role === 'wardAdmin') {
      if (wards.length === 0) {
        logError(`Ward admin ${session.user.id} has no assigned wards`);
        logError('This could mean:');
        logError('1. User is not assigned to any wards');
        logError('2. Ward assignment is incorrect in database');
        logError('3. User ID mismatch between session and database');
      } else {
        log(`Ward admin ${session.user.id} has ${wards.length} assigned ward(s)`);
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
    logError('=== WARDS API GET ERROR ===');
    logError('Error fetching wards:', error);
    logError('Error name:', error.name);
    logError('Error message:', error.message);
    logError('Error stack:', error.stack);
    logError('Session user:', session?.user);
    logError('Database state:', require('mongoose').connection.readyState);
    
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

// Utility function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Handle POST requests - create ward
async function handleCreateWard(req, res, session) {
  // Only allow stateAdmin to create wards
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Access denied - Only state admin can create wards' });
  }

  try {
    const { name, wardNumber, panchayath, district, coordinatorId, wardAdminId, isSittingWard } = req.body;

    log('=== WARDS API CREATE DEBUG ===');
    log('Creating ward:', { name, wardNumber, panchayath, district, coordinatorId, wardAdminId, isSittingWard });

    // Validate required fields
    if (!name || !wardNumber || !panchayath || !district || !coordinatorId) {
      return res.status(400).json({ 
        message: 'Ward name, number, panchayath, district, and coordinator are required' 
      });
    }

    const mongoose = require('mongoose');

    // Validate coordinator ID
    if (!mongoose.Types.ObjectId.isValid(coordinatorId)) {
      return res.status(400).json({ message: 'Invalid coordinator ID format' });
    }

    // Validate ward admin ID if provided
    if (wardAdminId && !mongoose.Types.ObjectId.isValid(wardAdminId)) {
      return res.status(400).json({ message: 'Invalid ward admin ID format' });
    }

    // Normalize input data for consistent comparison
    const normalizedName = name.trim().toLowerCase();
    const normalizedWardNumber = wardNumber.trim();
    const normalizedPanchayath = panchayath.trim().toLowerCase();
    const normalizedDistrict = district.trim().toLowerCase();

    log('Normalized input:', { 
      normalizedName, 
      normalizedWardNumber, 
      normalizedPanchayath, 
      normalizedDistrict 
    });

    // Check if ward with same name and district already exists (case-insensitive)
    const existingWard = await Ward.findOne({ 
      name: { $regex: new RegExp(`^${escapeRegex(normalizedName)}$`, 'i') },
      district: { $regex: new RegExp(`^${escapeRegex(normalizedDistrict)}$`, 'i') },
      isActive: { $ne: false }
    });

    if (existingWard) {
      log('Found existing ward with same name:', existingWard);
      return res.status(409).json({ 
        message: `Ward "${name}" already exists in ${district} district`,
        conflictingWard: {
          id: existingWard._id,
          name: existingWard.name,
          wardNumber: existingWard.wardNumber,
          panchayath: existingWard.panchayath,
          district: existingWard.district,
          isActive: existingWard.isActive
        }
      });
    }

    // Check if ward number already exists in the same panchayath (case-insensitive)
    const existingWardNumber = await Ward.findOne({ 
      wardNumber: normalizedWardNumber,
      panchayath: { $regex: new RegExp(`^${escapeRegex(normalizedPanchayath)}$`, 'i') },
      district: { $regex: new RegExp(`^${escapeRegex(normalizedDistrict)}$`, 'i') },
      isActive: { $ne: false }
    });

    if (existingWardNumber) {
      log('Found existing ward with same number:', existingWardNumber);
      return res.status(409).json({ 
        message: `Ward with this number already exists in this panchayath and district`,
        details: `Ward number "${wardNumber}" already exists in ${panchayath}, ${district}`,
        conflictingWard: {
          id: existingWardNumber._id,
          name: existingWardNumber.name,
          wardNumber: existingWardNumber.wardNumber,
          panchayath: existingWardNumber.panchayath,
          district: existingWardNumber.district,
          isActive: existingWardNumber.isActive
        }
      });
    }

    // Create new ward
    const wardData = {
      name: name.trim(),
      wardNumber: wardNumber.trim(),
      panchayath: panchayath.trim(),
      district: district.trim(),
      coordinator: new mongoose.Types.ObjectId(coordinatorId),
      isSittingWard: Boolean(isSittingWard),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add ward admin if provided
    if (wardAdminId) {
      wardData.wardAdmin = new mongoose.Types.ObjectId(wardAdminId);
    }

    const newWard = new Ward(wardData);
    await newWard.save();

    // Populate the created ward for response
    const populatedWard = await Ward.findById(newWard._id)
      .populate('coordinator', 'name email district')
      .populate('wardAdmin', 'name email district')
      .lean();

    log('Ward created successfully:', populatedWard._id);

    res.status(201).json(populatedWard);
  } catch (error) {
    logError('=== WARDS API CREATE ERROR ===');
    logError('Error creating ward:', error);
    
    let errorMessage = 'Failed to create ward';
    let statusCode = 500;
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Ward validation failed';
      statusCode = 400;
    } else if (error.code === 11000) {
      errorMessage = 'Ward with this name or number already exists';
      statusCode = 409;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Creation failed'
    });
  }
}

// Handle PUT requests - update ward (for bulk operations)
async function handleUpdateWard(req, res, session) {
  // Only allow stateAdmin to update wards
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Access denied - Only state admin can update wards' });
  }

  return res.status(400).json({ 
    message: 'Use PUT /api/wards/[id] for updating individual wards' 
  });
}

// Handle DELETE requests - delete ward (for bulk operations)
async function handleDeleteWard(req, res, session) {
  // Only allow stateAdmin to delete wards
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Access denied - Only state admin can delete wards' });
  }

  return res.status(400).json({ 
    message: 'Use DELETE /api/wards/[id] for deleting individual wards' 
  });
}