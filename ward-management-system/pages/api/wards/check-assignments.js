import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only state admins can check assignments
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Only state admins can check assignments' });
  }

  try {
    await connectToDatabase();
    console.log('Database connected for ward assignment check');

    // Find all wards with Ward Incharges
    const wards = await Ward.find({ wardAdmin: { $ne: null } })
      .populate('wardAdmin', 'name email')
      .populate('coordinator', 'name email')
      .sort({ createdAt: 1 });

    console.log(`Found ${wards.length} wards with Ward Incharges`);

    // Group wards by Ward Incharge
    const wardAdminAssignments = {};
    const duplicateAssignments = [];

    wards.forEach(ward => {
      if (ward.wardAdmin) {
        const wardAdminId = ward.wardAdmin._id.toString();
        
        if (!wardAdminAssignments[wardAdminId]) {
          wardAdminAssignments[wardAdminId] = {
            user: ward.wardAdmin,
            wards: []
          };
        }
        
        wardAdminAssignments[wardAdminId].wards.push({
          id: ward._id,
          name: ward.name,
          district: ward.district,
          panchayath: ward.panchayath,
          createdAt: ward.createdAt
        });
      }
    });

    // Find duplicates
    for (const [wardAdminId, assignment] of Object.entries(wardAdminAssignments)) {
      if (assignment.wards.length > 1) {
        duplicateAssignments.push({
          wardAdmin: {
            id: assignment.user._id,
            name: assignment.user.name,
            email: assignment.user.email
          },
          assignedWards: assignment.wards
        });
      }
    }

    return res.status(200).json({
      message: 'Ward Incharge assignments check completed',
      summary: {
        totalWardsWithAdmins: wards.length,
        totalUniqueAdmins: Object.keys(wardAdminAssignments).length,
        duplicateAdminsFound: duplicateAssignments.length,
        totalDuplicateAssignments: duplicateAssignments.reduce((sum, dup) => sum + dup.assignedWards.length - 1, 0)
      },
      duplicateAssignments,
      allAssignments: Object.values(wardAdminAssignments).map(assignment => ({
        wardAdmin: {
          id: assignment.user._id,
          name: assignment.user.name,
          email: assignment.user.email
        },
        assignedWards: assignment.wards,
        wardCount: assignment.wards.length,
        isDuplicate: assignment.wards.length > 1
      }))
    });

  } catch (error) {
    console.error('Error checking ward assignments:', error);
    return res.status(500).json({ 
      message: 'Error checking ward assignments', 
      error: error.message 
    });
  }
}