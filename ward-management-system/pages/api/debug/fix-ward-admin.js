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
    
    if (!session || session.user.role !== 'stateAdmin') {
      return res.status(401).json({ message: 'Unauthorized - State admin only' });
    }

    await connectToDatabase();

    // Find Ward Incharges without ward assignments
    const wardAdmins = await User.find({ role: 'wardAdmin' });
    const wardsWithAdmins = await Ward.find({ wardAdmin: { $exists: true, $ne: null } });
    const assignedAdminIds = wardsWithAdmins.map(w => w.wardAdmin.toString());
    
    const unassignedAdmins = wardAdmins.filter(admin => 
      !assignedAdminIds.includes(admin._id.toString())
    );

    // Find wards without Ward Incharges
    const wardsWithoutAdmins = await Ward.find({ 
      $or: [
        { wardAdmin: { $exists: false } },
        { wardAdmin: null }
      ]
    });

    // Auto-assign if possible
    const assignments = [];
    for (let i = 0; i < Math.min(unassignedAdmins.length, wardsWithoutAdmins.length); i++) {
      const admin = unassignedAdmins[i];
      const ward = wardsWithoutAdmins[i];
      
      await Ward.findByIdAndUpdate(ward._id, { wardAdmin: admin._id });
      assignments.push({
        adminName: admin.name,
        adminEmail: admin.email,
        wardName: ward.name,
        wardId: ward._id
      });
    }

    return res.status(200).json({
      message: 'Ward Incharge assignment check completed',
      unassignedAdmins: unassignedAdmins.map(a => ({ name: a.name, email: a.email, id: a._id })),
      wardsWithoutAdmins: wardsWithoutAdmins.map(w => ({ name: w.name, id: w._id })),
      newAssignments: assignments,
      summary: {
        totalWardAdmins: wardAdmins.length,
        assignedAdmins: assignedAdminIds.length,
        unassignedAdmins: unassignedAdmins.length,
        wardsWithoutAdmins: wardsWithoutAdmins.length,
        newAssignments: assignments.length
      }
    });

  } catch (error) {
    console.error('Ward Incharge fix error:', error);
    return res.status(500).json({ 
      message: 'Fix failed', 
      error: error.message 
    });
  }
}