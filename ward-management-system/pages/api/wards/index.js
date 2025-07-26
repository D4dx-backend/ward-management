import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    await connectToDatabase();
    console.log('Database connected successfully');
  } catch (dbError) {
    console.error('Database connection failed:', dbError);
    return res.status(500).json({ 
      message: 'Database connection failed', 
      error: dbError.message 
    });
  }
  
  if (req.method === 'GET') {
    try {
      let wards;
      
      // Filter wards based on user role
      if (session.user.role === 'stateAdmin') {
        // State admin can see all wards
        wards = await Ward.find({})
          .populate('coordinator', 'name email')
          .populate('wardAdmin', 'name email');
      } else if (session.user.role === 'coordinator') {
        // Coordinator can only see their wards
        wards = await Ward.find({ coordinator: session.user.id })
          .populate('coordinator', 'name email')
          .populate('wardAdmin', 'name email');
      } else {
        // Ward admin can only see their ward
        wards = await Ward.find({ wardAdmin: session.user.id })
          .populate('coordinator', 'name email')
          .populate('wardAdmin', 'name email');
      }
      
      return res.status(200).json(wards);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching wards', error: error.message });
    }
  }
  
  if (req.method === 'POST') {
    // Only state admin and coordinators can create wards
    if (session.user.role !== 'stateAdmin' && session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      console.log('Ward creation request body:', req.body);
      console.log('Session user:', session.user);
      
      const { name, wardNumber, panchayath, district, coordinatorId, wardAdminId, population, area, description } = req.body;
      
      // Validate required fields
      if (!name || !wardNumber || !panchayath || !district) {
        console.log('Validation failed - missing required fields:', { name, wardNumber, panchayath, district });
        return res.status(400).json({ message: 'Name, ward number, panchayath, and district are required' });
      }

      // Coordinators can only create wards in their assigned district
      if (session.user.role === 'coordinator' && district !== session.user.district) {
        console.log('District restriction violation:', { userDistrict: session.user.district, requestedDistrict: district });
        return res.status(403).json({ 
          message: `Forbidden: You can only create wards in your assigned district (${session.user.district})` 
        });
      }
      
      // Determine coordinator ID
      let coordinator;
      if (session.user.role === 'coordinator') {
        coordinator = session.user.id;
      } else {
        if (!coordinatorId) {
          return res.status(400).json({ message: 'Coordinator ID is required' });
        }
        
        // Verify coordinator exists and is a coordinator
        const coordinatorUser = await User.findById(coordinatorId);
        if (!coordinatorUser || coordinatorUser.role !== 'coordinator') {
          return res.status(400).json({ message: 'Invalid coordinator ID' });
        }
        
        coordinator = coordinatorId;
      }
      
      // Verify ward admin if provided
      let wardAdmin = null;
      if (wardAdminId) {
        const wardAdminUser = await User.findById(wardAdminId);
        if (!wardAdminUser || wardAdminUser.role !== 'wardAdmin') {
          return res.status(400).json({ message: 'Invalid ward admin ID' });
        }
        
        // Check if this ward admin is already assigned to another ward
        const existingAssignment = await Ward.findOne({ wardAdmin: wardAdminId });
        if (existingAssignment) {
          return res.status(400).json({ 
            message: `Ward admin ${wardAdminUser.name} is already assigned to ward "${existingAssignment.name}". Each ward admin can only be assigned to one ward.` 
          });
        }
        
        wardAdmin = wardAdminId;
      }
      
      // Create new ward
      console.log('Creating ward with data:', {
        name,
        wardNumber,
        panchayath,
        district,
        coordinator,
        wardAdmin,
        population: population ? parseInt(population) : undefined,
        area,
        description,
        createdBy: session.user.id,
      });
      
      const newWard = new Ward({
        name,
        wardNumber,
        panchayath,
        district,
        coordinator,
        wardAdmin,
        population: population ? parseInt(population) : undefined,
        area,
        description,
        createdBy: session.user.id,
      });
      
      console.log('Saving ward to database...');
      await newWard.save();
      console.log('Ward saved successfully:', newWard._id);
      
      // Populate coordinator and ward admin details
      const savedWard = await Ward.findById(newWard._id)
        .populate('coordinator', 'name email')
        .populate('wardAdmin', 'name email');
      
      console.log('Ward creation completed:', savedWard);
      return res.status(201).json(savedWard);
    } catch (error) {
      console.error('Ward creation error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      
      // Handle specific MongoDB errors
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'Ward with this number already exists in this panchayath and district',
          error: 'Duplicate ward number'
        });
      }
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          message: 'Validation failed',
          error: validationErrors.join(', ')
        });
      }
      
      return res.status(500).json({ 
        message: 'Error creating ward', 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}