import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import User from '../../models/User';
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
    console.log('Users API - Session debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email,
      method: req.method
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
    return handleGetUsers(req, res, session);
  } else if (req.method === 'POST') {
    return handleCreateUser(req, res, session);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Handle GET requests - fetch users
async function handleGetUsers(req, res, session) {
  try {
    const { role, district, page = 1, limit } = req.query;

    console.log('=== USERS API GET DEBUG ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('User role:', session.user.role);
    console.log('User ID:', session.user.id);
    console.log('Request method:', req.method);
    console.log('Query params:', { role, district, page, limit });

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

    // Build query based on user role and permissions
    let query = {};
    
    // For Ward Incharges, only return their own data
    if (session.user.role === 'wardAdmin') {
      query._id = new mongoose.Types.ObjectId(session.user.id);
      console.log('Ward admin query:', { _id: session.user.id });
    } else if (session.user.role === 'coordinator') {
      // For coordinators, return users in their district
      if (session.user.district) {
        query.district = session.user.district;
      }
      console.log('Coordinator query:', query);
    }
    // stateAdmin can see all users

    // Apply role filter if provided
    if (role) {
      query.role = role;
    }

    // Apply district filter if provided (for stateAdmin)
    if (district && session.user.role === 'stateAdmin') {
      query.district = district;
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = limit ? Math.min(1000, Math.max(1, parseInt(limit))) : 1000;
    const skip = (pageNum - 1) * limitNum;

    console.log('Pagination:', { 
      page: pageNum, 
      limit: limitNum, 
      skip
    });
    
    // Test database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected, state:', mongoose.connection.readyState);
      return res.status(503).json({ message: 'Database connection not ready' });
    }
    
    // Fetch users with production-optimized query
    let users;
    try {
      console.log('Executing users query...');
      
      const userQuery = User.find(query)
        .select('-password -pinCode') // Exclude sensitive fields
        .sort({ role: 1, name: 1 })
        .skip(skip)
        .limit(limitNum);
      
      const queryPromise = userQuery.lean().exec();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 30000)
      );

      users = await Promise.race([queryPromise, timeoutPromise]);
      
      console.log(`Query successful: Found ${users.length} users`);
      
    } catch (queryError) {
      console.error('Database query error:', queryError);
      
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
    if (!Array.isArray(users)) {
      console.error('Invalid query result:', typeof users);
      return res.status(500).json({ message: 'Invalid query result format' });
    }

    // For each user, get their assigned wards if they are coordinators or wardAdmins
    const usersWithWards = await Promise.all(
      users.map(async (user) => {
        const userObj = { ...user };
        
        if (user.role === 'coordinator' || user.role === 'wardAdmin') {
          try {
            let assignedWards = [];
            
            if (user.role === 'coordinator') {
              // Find wards where this user is the coordinator
              assignedWards = await Ward.find({ coordinator: user._id })
                .select('name wardNumber panchayath district isSittingWard')
                .lean();
            } else if (user.role === 'wardAdmin') {
              // Find ward where this user is the wardAdmin
              const ward = await Ward.findOne({ wardAdmin: user._id })
                .select('name wardNumber panchayath district isSittingWard')
                .lean();
              
              if (ward) {
                assignedWards = [ward];
              }
            }
            
            userObj.assignedWards = assignedWards;
          } catch (wardError) {
            console.warn(`Error fetching wards for user ${user._id}:`, wardError.message);
            userObj.assignedWards = [];
          }
        }
        
        return userObj;
      })
    );

    console.log(`Found ${usersWithWards.length} users for user ${session.user.id}`);
    
    // Get total count for pagination
    let totalCount = usersWithWards.length;
    if (limitNum < 1000) { // Only count if we're using pagination
      try {
        const countPromise = User.countDocuments(query).exec();
        const countTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Count timeout')), 10000)
        );
        
        totalCount = await Promise.race([countPromise, countTimeoutPromise]);
      } catch (countError) {
        console.warn('Count query failed, using result length:', countError.message);
        totalCount = usersWithWards.length;
      }
    }

    console.log('Total count:', totalCount);

    // Set cache headers for production
    res.setHeader('Cache-Control', 'private, max-age=60');
    
    // Return users with metadata
    const response = {
      users: usersWithWards,
      meta: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        hasMore: totalCount > (pageNum * limitNum)
      }
    };

    // For backward compatibility, return just the users array
    res.status(200).json(usersWithWards);
  } catch (error) {
    console.error('=== USERS API GET ERROR ===');
    console.error('Error fetching users:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Session user:', session?.user);
    console.error('Database state:', require('mongoose').connection.readyState);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch users';
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

// Handle POST requests - create user
async function handleCreateUser(req, res, session) {
  // Only allow stateAdmin to create users
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Access denied - Only state admin can create users' });
  }

  try {
    const { name, email, mobileNumber, role, district, pinCode } = req.body;

    console.log('=== USERS API CREATE DEBUG ===');
    console.log('Creating user:', { name, email, mobileNumber, role, district });

    // Validate required fields
    if (!name || !email || !mobileNumber || !role) {
      return res.status(400).json({ 
        message: 'Name, email, mobile number, and role are required' 
      });
    }

    // Validate role
    if (!['stateAdmin', 'coordinator', 'wardAdmin'].includes(role)) {
      return res.status(400).json({ 
        message: 'Invalid role. Must be stateAdmin, coordinator, or wardAdmin' 
      });
    }

    // Validate district for coordinators and wardAdmins
    if ((role === 'coordinator' || role === 'wardAdmin') && !district) {
      return res.status(400).json({ 
        message: 'District is required for coordinators and ward admins' 
      });
    }

    const mongoose = require('mongoose');

    // Check if user with same email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'User with this email already exists',
        conflictingUser: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }

    // Check if user with same mobile number already exists
    const existingMobile = await User.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(409).json({ 
        message: 'User with this mobile number already exists',
        conflictingUser: {
          id: existingMobile._id,
          name: existingMobile.name,
          mobileNumber: existingMobile.mobileNumber,
          role: existingMobile.role
        }
      });
    }

    // Create new user
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      role,
      district: district ? district.trim() : undefined,
      pinCode: pinCode ? pinCode.trim() : undefined,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newUser = new User(userData);
    await newUser.save();

    // Remove sensitive fields from response
    const userResponse = newUser.toObject();
    delete userResponse.password;
    delete userResponse.pinCode;

    console.log('User created successfully:', userResponse._id);

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('=== USERS API CREATE ERROR ===');
    console.error('Error creating user:', error);
    
    let errorMessage = 'Failed to create user';
    let statusCode = 500;
    
    if (error.name === 'ValidationError') {
      errorMessage = 'User validation failed';
      statusCode = 400;
    } else if (error.code === 11000) {
      errorMessage = 'User with this email or mobile number already exists';
      statusCode = 409;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Creation failed'
    });
  }
}
