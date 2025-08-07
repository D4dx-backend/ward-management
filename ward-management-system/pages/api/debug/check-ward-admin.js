import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await connectToDatabase();

    // Get current user details
    const user = await User.findById(session.user.id);
    
    // Check ward assignment for current user
    let userWard = null;
    if (session.user.role === 'wardAdmin') {
      userWard = await Ward.findOne({ wardAdmin: session.user.id });
    }

    // Get all Ward Incharges and their assignments
    const allWardAdmins = await User.find({ role: 'wardAdmin' });
    const wardAssignments = await Ward.find({ wardAdmin: { $exists: true, $ne: null } })
      .populate('wardAdmin', 'name email');

    // Find unassigned Ward Incharges
    const assignedAdminIds = wardAssignments.map(w => w.wardAdmin._id.toString());
    const unassignedAdmins = allWardAdmins.filter(admin => 
      !assignedAdminIds.includes(admin._id.toString())
    );

    // Find wards without admins
    const wardsWithoutAdmins = await Ward.find({ 
      $or: [
        { wardAdmin: { $exists: false } },
        { wardAdmin: null }
      ]
    });

    return res.status(200).json({
      currentUser: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district
      },
      currentUserWard: userWard ? {
        id: userWard._id,
        name: userWard.name,
        district: userWard.district,
        panchayath: userWard.panchayath
      } : null,
      summary: {
        totalWardAdmins: allWardAdmins.length,
        assignedWardAdmins: wardAssignments.length,
        unassignedWardAdmins: unassignedAdmins.length,
        wardsWithoutAdmins: wardsWithoutAdmins.length
      },
      unassignedAdmins: unassignedAdmins.map(admin => ({
        id: admin._id,
        name: admin.name,
        email: admin.email
      })),
      wardsWithoutAdmins: wardsWithoutAdmins.map(ward => ({
        id: ward._id,
        name: ward.name,
        district: ward.district,
        panchayath: ward.panchayath
      })),
      wardAssignments: wardAssignments.map(ward => ({
        wardId: ward._id,
        wardName: ward.name,
        adminId: ward.wardAdmin._id,
        adminName: ward.wardAdmin.name,
        adminEmail: ward.wardAdmin.email
      }))
    });

  } catch (error) {
    console.error('Check Ward Incharge error:', error);
    return res.status(500).json({ 
      message: 'Check failed', 
      error: error.message 
    });
  }
}