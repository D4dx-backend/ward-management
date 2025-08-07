import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';
import User from '../../../models/User';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only coordinators can access this endpoint
  if (session.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Access denied' });
  }

  await connectToDatabase();

  try {
    // Get all wards under this coordinator
    const coordinatorWards = await Ward.find({ 
      coordinator: session.user.id 
    }).select('_id name wardNumber');

    const wardIds = coordinatorWards.map(ward => ward._id);

    // Get all Ward Incharges in coordinator's district
    const wardAdmins = await User.find({
      role: 'wardAdmin',
      district: session.user.district
    }).select('_id name');

    const wardAdminIds = wardAdmins.map(admin => admin._id);

    // Find instructions that target Ward Incharges in this coordinator's district
    const instructions = await Instruction.find({
      isActive: true,
      $or: [
        { targetAudience: 'ward_admins' },
        { targetAudience: 'specific_wards', targetWards: { $in: wardIds } },
        { targetAudience: 'ward_or_group', targetWards: { $in: wardIds } }
      ]
    })
    .populate('createdBy', 'name email')
    .populate('targetWards', 'name wardNumber')
    .sort({ createdAt: -1 });

    // For each instruction, get reading and reply statistics
    const instructionsWithStats = await Promise.all(
      instructions.map(async (instruction) => {
        // Get all Ward Incharges who should see this instruction
        let targetWardAdmins = [];
        
        if (instruction.targetAudience === 'ward_admins') {
          // All Ward Incharges in coordinator's district
          targetWardAdmins = wardAdmins;
        } else if (instruction.targetAudience === 'specific_wards' || instruction.targetAudience === 'ward_or_group') {
          // Ward Incharges of specific wards
          const targetWards = await Ward.find({
            _id: { $in: instruction.targetWards },
            coordinator: session.user.id
          }).populate('wardAdmin', '_id name');
          
          targetWardAdmins = targetWards
            .filter(ward => ward.wardAdmin)
            .map(ward => ward.wardAdmin);
        }

        // Get Ward Incharge status details
        const wardAdminStatus = await Promise.all(
          targetWardAdmins.map(async (admin) => {
            const ward = await Ward.findOne({ wardAdmin: admin._id });
            
            // Check if this Ward Incharge has read the instruction
            const readRecord = instruction.readBy.find(record => 
              record.user.toString() === admin._id.toString()
            );
            
            // Count replies from this Ward Incharge
            const replyCount = instruction.replies ? 
              instruction.replies.filter(reply => 
                reply.user.toString() === admin._id.toString()
              ).length : 0;

            return {
              wardAdminId: admin._id,
              wardAdminName: admin.name,
              wardName: ward?.name || null,
              wardNumber: ward?.wardNumber || null,
              hasRead: !!readRecord,
              readAt: readRecord?.readAt || null,
              hasReplied: replyCount > 0,
              replyCount: replyCount
            };
          })
        );

        // Calculate statistics
        const readCount = wardAdminStatus.filter(status => status.hasRead).length;
        const replyCount = instruction.replies ? instruction.replies.length : 0;
        const uniqueRepliers = instruction.replies ? 
          new Set(instruction.replies.map(reply => reply.user.toString())).size : 0;

        return {
          ...instruction.toObject(),
          readingStats: {
            totalWardAdmins: targetWardAdmins.length,
            readCount: readCount,
            unreadCount: targetWardAdmins.length - readCount,
            replyCount: replyCount,
            uniqueRepliers: uniqueRepliers
          },
          wardAdminStatus: wardAdminStatus
        };
      })
    );

    return res.status(200).json(instructionsWithStats);

  } catch (error) {
    console.error('Error fetching coordinator instructions:', error);
    return res.status(500).json({ message: 'Error fetching instructions' });
  }
}