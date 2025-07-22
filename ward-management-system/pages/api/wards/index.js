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
  
  await connectToDatabase();
  
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
      const { name, wardNumber, panchayath, district, coordinatorId, wardAdminId, population, area, description } = req.body;
      
      // Validate required fields
      if (!name || !wardNumber || !panchayath || !district) {
        return res.status(400).json({ message: 'Name, ward number, panchayath, and district are required' });
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
        
        wardAdmin = wardAdminId;
      }
      
      // Create new ward
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
      
      await newWard.save();
      
      // Populate coordinator and ward admin details
      const savedWard = await Ward.findById(newWard._id)
        .populate('coordinator', 'name email')
        .populate('wardAdmin', 'name email');
      
      return res.status(201).json(savedWard);
    } catch (error) {
      return res.status(500).json({ message: 'Error creating ward', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}