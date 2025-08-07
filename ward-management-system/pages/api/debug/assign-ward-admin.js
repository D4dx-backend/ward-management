import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !['stateAdmin', 'coordinator'].includes(session.user.role)) {
      return res.status(401).json({ message: 'Unauthorized - State admin or coordinator only' });
    }

    await connectToDatabase();

    const { wardId, adminId } = req.body;

    if (!wardId || !adminId) {
      return res.status(400).json({ message: 'Ward ID and Admin ID are required' });
    }

    // Verify ward exists
    const ward = await Ward.findById(wardId);
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    // Verify admin exists and is a Ward Incharge
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'wardAdmin') {
      return res.status(400).json({ message: 'Invalid Ward Incharge' });
    }

    // Check if admin is already assigned to another ward
    const existingAssignment = await Ward.findOne({ wardAdmin: adminId });
    if (existingAssignment && existingAssignment._id.toString() !== wardId) {
      return res.status(400).json({ 
        message: `Admin ${admin.name} is already assigned to ward "${existingAssignment.name}"` 
      });
    }

    // Assign admin to ward
    await Ward.findByIdAndUpdate(wardId, { wardAdmin: adminId });

    const updatedWard = await Ward.findById(wardId).populate('wardAdmin', 'name email');

    return res.status(200).json({
      message: 'Ward Incharge assigned successfully',
      ward: {
        id: updatedWard._id,
        name: updatedWard.name,
        district: updatedWard.district,
        panchayath: updatedWard.panchayath,
        admin: {
          id: updatedWard.wardAdmin._id,
          name: updatedWard.wardAdmin.name,
          email: updatedWard.wardAdmin.email
        }
      }
    });

  } catch (error) {
    console.error('Assign Ward Incharge error:', error);
    return res.status(500).json({ 
      message: 'Assignment failed', 
      error: error.message 
    });
  }
}