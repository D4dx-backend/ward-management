import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only state admins can run this fix
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Only state admins can run this operation' });
  }

  await connectToDatabase();

  try {
    // Find all wards with ward admins
    const wards = await Ward.find({ wardAdmin: { $ne: null } })
      .populate('wardAdmin', 'name email')
      .sort({ createdAt: 1 }); // Sort by creation date, keep the oldest assignment

    // Group wards by ward admin
    const wardAdminAssignments = {};
    const duplicateAssignments = [];
    const fixedAssignments = [];

    wards.forEach(ward => {
      const wardAdminId = ward.wardAdmin._id.toString();
      
      if (!wardAdminAssignments[wardAdminId]) {
        wardAdminAssignments[wardAdminId] = {
          user: ward.wardAdmin,
          wards: []
        };
      }
      
      wardAdminAssignments[wardAdminId].wards.push(ward);
    });

    // Find duplicates and fix them
    for (const [wardAdminId, assignment] of Object.entries(wardAdminAssignments)) {
      if (assignment.wards.length > 1) {
        duplicateAssignments.push({
          wardAdmin: assignment.user,
          assignedWards: assignment.wards.map(w => ({ id: w._id, name: w.name }))
        });

        // Keep the first (oldest) assignment, remove others
        const wardsToFix = assignment.wards.slice(1); // Skip the first one
        
        for (const ward of wardsToFix) {
          await Ward.findByIdAndUpdate(ward._id, { wardAdmin: null });
          fixedAssignments.push({
            wardId: ward._id,
            wardName: ward.name,
            wardAdminName: assignment.user.name,
            action: 'Removed duplicate assignment'
          });
        }
      }
    }

    return res.status(200).json({
      message: 'Duplicate ward admin assignments check completed',
      duplicatesFound: duplicateAssignments.length,
      duplicateAssignments,
      fixedAssignments,
      summary: {
        totalWardsChecked: wards.length,
        duplicateAdminsFound: duplicateAssignments.length,
        assignmentsFixed: fixedAssignments.length
      }
    });

  } catch (error) {
    console.error('Error fixing duplicate assignments:', error);
    return res.status(500).json({ 
      message: 'Error fixing duplicate assignments', 
      error: error.message 
    });
  }
}