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
    console.log('Session debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email,
      environment: process.env.NODE_ENV
    });
  } catch (sessionError) {
    console.error('Session error:', sessionError);
    return res.status(401).json({ 
      message: 'Session authentication failed',
      error: process.env.NODE_ENV === 'development' ? sessionError.message : 'Authentication error'
    });
  }

  if (!session) {
    console.error('No session found');
    return res.status(401).json({ message: 'Unauthorized - No session' });
  }

  if (!session.user) {
    console.error('No user in session');
    return res.status(401).json({ message: 'Unauthorized - No user in session' });
  }

  if (!session.user.id) {
    console.error('No user ID in session');
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
    console.error('Database connection error:', dbError);
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
    const { district, page = 1, limit } = req.query;

    console.log('=== WARDS API GET DEBUG ===');
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

    // Remove isActive filter - show all wards (active and inactive)
    // Admins can filter by status using the frontend filter

    // Calculate pagination only if limit is explicitly provided
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = limit ? Math.min(1000, Math.max(1, parseInt(limit))) : null;
    const skip = limitNum ? (pageNum - 1) * limitNum : 0;

    console.log('Pagination:', { 
      page: pageNum, 
      limit: limitNum || 'no limit', 
      skip,
      paginationEnabled: !!limitNum 
    });
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
      
      // Use Promise.race for timeout handling with longer timeout for production
      let wardQuery = Ward.find(query)
        .populate('coordinator', 'name email district')
        .populate('wardAdmin', 'name email district')
        .sort({ district: 1, name: 1 });
      
      // Apply default pagination for production performance
      const defaultLimit = 1000; // Reasonable default limit
      const actualLimit = limitNum || defaultLimit;
      wardQuery = wardQuery.skip(skip).limit(actualLimit);
      
      const queryPromise = wardQuery.lean().exec();

      // Increased timeout for production
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 30000)
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

    // Get total count with timeout - skip if not needed for performance
    let totalCount = wards.length;
    if (limitNum) {
      try {
        const countPromise = Ward.countDocuments(query).exec();
        const countTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Count timeout')), 10000)
        );
        
        totalCount = await Promise.race([countPromise, countTimeoutPromise]);
      } catch (countError) {
        console.warn('Count query failed, using result length:', countError.message);
        // Use wards.length as fallback for pagination
        totalCount = wards.length;
      }
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
    console.error('=== WARDS API GET ERROR ===');
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
    const { name, wardNumber, panchayath, district, coordinatorId, wardAdminId, isSittingWard, isActive } = req.body;

    console.log('=== WARDS API CREATE DEBUG ===');
    console.log('Creating ward:', { name, wardNumber, panchayath, district, coordinatorId, wardAdminId, isSittingWard, isActive });

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

    console.log('Normalized input:', { 
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
      console.log('Found existing ward with same name:', existingWard);
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
      console.log('Found existing ward with same number:', existingWardNumber);
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
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Ward data being saved:', wardData);

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

    console.log('Ward created successfully:', populatedWard._id);
    console.log('Ward isActive value saved:', populatedWard.isActive);

    res.status(201).json(populatedWard);
  } catch (error) {
    console.error('=== WARDS API CREATE ERROR ===');
    console.error('Error creating ward:', error);
    
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