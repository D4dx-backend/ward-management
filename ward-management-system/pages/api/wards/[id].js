import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';

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
    
    console.log('Ward [id] API - Session debug:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email,
      method: req.method,
      wardId: req.query.id
    });
    
    if (!session) {
      console.error('No session found in ward [id] API');
      return res.status(401).json({ message: 'Unauthorized - No session' });
    }

    if (!session.user || !session.user.id) {
      console.error('Invalid session data in ward [id] API');
      return res.status(401).json({ message: 'Unauthorized - Invalid session data' });
    }
    
    await dbConnect();
  } catch (error) {
    console.error('Initial setup error:', error);
    return res.status(500).json({ message: 'Server initialization error', error: error.message });
  }
  
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      // Find the ward by ID
      const ward = await Ward.findById(id)
        .populate('coordinator', 'name email')
        .populate('wardAdmin', 'name email role')
        .lean();
      
      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }
      
      // Check access permissions
      if (session.user.role === 'coordinator') {
        // Coordinators can only access wards in their district or wards they coordinate
        if (ward.district !== session.user.district && 
            ward.coordinator?._id?.toString() !== session.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else if (session.user.role === 'wardAdmin') {
        // Ward Incharges can only access their own ward
        if (ward.wardAdmin?._id?.toString() !== session.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      // stateAdmin can access all wards
      
      return res.status(200).json(ward);
      
    } catch (error) {
      console.error('Error fetching ward:', error);
      
      // Handle invalid ObjectId
      if (error.name === 'CastError') {
        return res.status(404).json({ message: 'Ward not found' });
      }
      
      return res.status(500).json({ message: 'Error fetching ward', error: error.message });
    }
  }

  if (req.method === 'PUT') {
    return handleUpdateWard(req, res, session);
  }

  if (req.method === 'DELETE') {
    return handleDeleteWard(req, res, session);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

// Handle PUT requests - update ward
async function handleUpdateWard(req, res, session) {
  try {
    const { id } = req.query;
    const { name, wardNumber, panchayath, district, coordinatorId, wardAdminId, isSittingWard } = req.body;

    console.log('=== WARD UPDATE DEBUG ===');
    console.log('Updating ward:', id, { name, wardNumber, panchayath, district, coordinatorId, wardAdminId, isSittingWard });

    // Only allow stateAdmin to update ward details
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied - Only state admin can update wards' });
    }

    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ward ID format' });
    }

    // Validate required fields
    if (!name || !wardNumber || !panchayath || !district || !coordinatorId) {
      return res.status(400).json({ 
        message: 'Ward name, number, panchayath, district, and coordinator are required' 
      });
    }

    // Validate coordinator ID
    if (!mongoose.Types.ObjectId.isValid(coordinatorId)) {
      return res.status(400).json({ message: 'Invalid coordinator ID format' });
    }

    // Validate ward admin ID if provided
    if (wardAdminId && !mongoose.Types.ObjectId.isValid(wardAdminId)) {
      return res.status(400).json({ message: 'Invalid ward admin ID format' });
    }

    // Check if ward exists
    const existingWard = await Ward.findById(id);
    if (!existingWard) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    // Normalize input data for consistent comparison
    const normalizedName = name.trim().toLowerCase();
    const normalizedWardNumber = wardNumber.trim();
    const normalizedPanchayath = panchayath.trim().toLowerCase();
    const normalizedDistrict = district.trim().toLowerCase();

    console.log('Update - Normalized input:', { 
      normalizedName, 
      normalizedWardNumber, 
      normalizedPanchayath, 
      normalizedDistrict 
    });

    // Check if another ward with same name and district already exists (excluding current ward, case-insensitive)
    const duplicateWard = await Ward.findOne({ 
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
      district: { $regex: new RegExp(`^${normalizedDistrict}$`, 'i') },
      isActive: { $ne: false }
    });

    if (duplicateWard) {
      console.log('Found duplicate ward with same name:', duplicateWard);
      return res.status(409).json({ 
        message: `Another ward "${name}" already exists in ${district} district`,
        conflictingWard: {
          id: duplicateWard._id,
          name: duplicateWard.name,
          wardNumber: duplicateWard.wardNumber,
          panchayath: duplicateWard.panchayath,
          district: duplicateWard.district
        }
      });
    }

    // Check if another ward with same number exists in the same panchayath (excluding current ward, case-insensitive)
    const duplicateWardNumber = await Ward.findOne({ 
      _id: { $ne: id },
      wardNumber: normalizedWardNumber,
      panchayath: { $regex: new RegExp(`^${normalizedPanchayath}$`, 'i') },
      district: { $regex: new RegExp(`^${normalizedDistrict}$`, 'i') },
      isActive: { $ne: false }
    });

    if (duplicateWardNumber) {
      console.log('Found duplicate ward with same number:', duplicateWardNumber);
      return res.status(409).json({ 
        message: `Ward with this number already exists in this panchayath and district`,
        details: `Another ward with number "${wardNumber}" already exists in ${panchayath}, ${district}`,
        conflictingWard: {
          id: duplicateWardNumber._id,
          name: duplicateWardNumber.name,
          wardNumber: duplicateWardNumber.wardNumber,
          panchayath: duplicateWardNumber.panchayath,
          district: duplicateWardNumber.district
        }
      });
    }

    // Update ward data
    const updateData = {
      name: name.trim(),
      wardNumber: wardNumber.trim(),
      panchayath: panchayath.trim(),
      district: district.trim(),
      coordinator: new mongoose.Types.ObjectId(coordinatorId),
      isSittingWard: Boolean(isSittingWard),
      updatedAt: new Date()
    };

    // Handle ward admin assignment
    if (wardAdminId) {
      updateData.wardAdmin = new mongoose.Types.ObjectId(wardAdminId);
    } else {
      updateData.$unset = { wardAdmin: 1 };
    }

    const updatedWard = await Ward.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('coordinator', 'name email district')
    .populate('wardAdmin', 'name email district')
    .lean();

    console.log('Ward updated successfully:', updatedWard._id);

    res.status(200).json(updatedWard);
  } catch (error) {
    console.error('=== WARD UPDATE ERROR ===');
    console.error('Error updating ward:', error);
    
    let errorMessage = 'Failed to update ward';
    let statusCode = 500;
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Ward validation failed';
      statusCode = 400;
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid ward ID';
      statusCode = 400;
    } else if (error.code === 11000) {
      errorMessage = 'Ward with this name or number already exists';
      statusCode = 409;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Update failed'
    });
  }
}

// Handle DELETE requests - delete ward
async function handleDeleteWard(req, res, session) {
  try {
    const { id } = req.query;

    console.log('=== WARD DELETE DEBUG ===');
    console.log('Deleting ward:', id);

    // Only allow stateAdmin to delete wards
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied - Only state admin can delete wards' });
    }

    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ward ID format' });
    }

    // Check if ward exists
    const existingWard = await Ward.findById(id);
    if (!existingWard) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    // Soft delete - mark as inactive instead of actually deleting
    const deletedWard = await Ward.findByIdAndUpdate(
      id,
      { 
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    console.log('Ward soft deleted successfully:', deletedWard._id);

    res.status(200).json({ 
      message: 'Ward deleted successfully',
      wardId: deletedWard._id 
    });
  } catch (error) {
    console.error('=== WARD DELETE ERROR ===');
    console.error('Error deleting ward:', error);
    
    let errorMessage = 'Failed to delete ward';
    let statusCode = 500;
    
    if (error.name === 'CastError') {
      errorMessage = 'Invalid ward ID';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Deletion failed'
    });
  }
}