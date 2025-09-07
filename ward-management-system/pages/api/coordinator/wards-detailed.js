import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Ward from '../../../models/Ward';
import WardVisit from '../../../models/WardVisit';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    console.log('Fetching wards for coordinator:', session.user.id);
    
    // Get wards where this user is the coordinator with detailed information
    const wards = await Ward.find({
      coordinator: session.user.id,
      isActive: true
    })
    .populate('wardAdmin', 'name email mobileNumber lastLogin')
    .populate('coordinator', 'name email')
    .select('name district wardNumber panchayath population totalHouseholds totalClusters status wardAdmin coordinator createdAt updatedAt')
    .sort({ name: 1 });

    console.log(`Found ${wards.length} wards for coordinator ${session.user.id}`);

    // Get visit statistics for each ward
    const wardsWithStats = await Promise.all(
      wards.map(async (ward) => {
        try {
          // Get visit statistics
          const visitStats = await WardVisit.aggregate([
            { 
              $match: { 
                ward: ward._id,
                coordinator: session.user.id 
              } 
            },
            {
              $group: {
                _id: null,
                totalVisits: { $sum: 1 },
                lastVisitDate: { $max: '$visitDate' }
              }
            }
          ]);

          const stats = visitStats[0] || { totalVisits: 0, lastVisitDate: null };

          return {
            ...ward.toObject(),
            totalVisits: stats.totalVisits,
            lastVisitDate: stats.lastVisitDate,
            reportsSubmitted: 0 // This would need to be calculated from actual reports
          };
        } catch (error) {
          console.error(`Error getting stats for ward ${ward._id}:`, error);
          return {
            ...ward.toObject(),
            totalVisits: 0,
            lastVisitDate: null,
            reportsSubmitted: 0
          };
        }
      })
    );

    console.log('Returning wards with stats:', wardsWithStats.length);
    res.status(200).json(wardsWithStats);
  } catch (error) {
    console.error('Error fetching coordinator wards detailed:', error);
    res.status(500).json({ 
      message: 'Failed to fetch wards',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}