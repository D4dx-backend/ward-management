import { getSession } from 'next-auth/react';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  const { id } = req.query;
  
  // Check if user has access to this ward
  const ward = await Ward.findById(id);
  
  if (!ward) {
    return res.status(404).json({ message: 'Ward not found' });
  }
  
  // Check permissions
  const isStateAdmin = session.user.role === 'stateAdmin';
  const isCoordinator = session.user.role === 'coordinator' && ward.coordinator.toString() === session.user.id;
  const isWardAdmin = session.user.role === 'wardAdmin' && ward.wardAdmin && ward.wardAdmin.toString() === session.user.id;
  
  if (!isStateAdmin && !isCoordinator && !isWardAdmin) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  if (req.method === 'GET') {
    try {
      const populatedWard = await Ward.findById(id)
        .populate('coordinator', 'name email')
        .populate('wardAdmin', 'name email');
      
      return res.status(200).json(populatedWard);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching ward', error: error.message });
    }
  }
  
  if (req.method === 'PUT') {
    // Only state admin and coordinator can update wards
    if (!isStateAdmin && !isCoordinator) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const { name, district, coordinatorId, wardAdminId } = req.body;
      
      // Update fields
      if (name) ward.name = name;
      if (district) ward.district = district;
      
      // Update coordinator if provided and user is state admin
      if (coordinatorId && isStateAdmin) {
        const coordinatorUser = await User.findById(coordinatorId);
        if (!coordinatorUser || coordinatorUser.role !== 'coordinator') {
          return res.status(400).json({ message: 'Invalid coordinator ID' });
        }
        
        ward.coordinator = coordinatorId;
      }
      
      // Update ward admin if provided
      if (wardAdminId !== undefined) {
        if (wardAdminId) {
          const wardAdminUser = await User.findById(wardAdminId);
          if (!wardAdminUser || wardAdminUser.role !== 'wardAdmin') {
            return res.status(400).json({ message: 'Invalid ward admin ID' });
          }
          
          ward.wardAdmin = wardAdminId;
        } else {
          // Remove ward admin if null is provided
          ward.wardAdmin = null;
        }
      }
      
      await ward.save();
      
      // Populate coordinator and ward admin details
      const updatedWard = await Ward.findById(id)
        .populate('coordinator', 'name email')
        .populate('wardAdmin', 'name email');
      
      return res.status(200).json(updatedWard);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating ward', error: error.message });
    }
  }
  
  if (req.method === 'DELETE') {
    // Only state admin can delete wards
    if (!isStateAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      await Ward.findByIdAndDelete(id);
      
      return res.status(200).json({ message: 'Ward deleted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting ward', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}