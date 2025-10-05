import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import Cluster from '../../../models/Cluster';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Allow state admin, ward admin, and coordinator access
    if (!['stateAdmin', 'wardAdmin', 'coordinator'].includes(session.user.role)) {
      return res.status(403).json({ message: 'Access denied. Admin or coordinator role required.' });
    }

    await dbConnect();

    // Fetch all active wards with their coordinator details
    const wards = await Ward.find({ isActive: true })
      .populate('coordinator', 'name email mobileNumber district')
      .populate('wardAdmin', 'name email mobileNumber')
      .sort({ district: 1, panchayath: 1, name: 1 })
      .lean();

    // For each ward, count the clusters
    const consolidatedData = await Promise.all(
      wards.map(async (ward) => {
        const clusterCount = await Cluster.countDocuments({
          ward: ward._id,
          isActive: true
        });

        const clusters = await Cluster.find({
          ward: ward._id,
          isActive: true
        })
        .select('name clusterNumber coordinator householdCount population status')
        .sort({ clusterNumber: 1 })
        .lean();

        return {
          _id: ward._id,
          wardName: ward.name,
          wardNumber: ward.wardNumber,
          district: ward.district,
          localBody: ward.panchayath, // panchayath is the local body
          state: 'Chanreg', // As per requirement
          isSittingWard: ward.isSittingWard || false,
          clusterCount: clusterCount,
          clusters: clusters,
          coordinator: ward.coordinator ? {
            name: ward.coordinator.name,
            mobileNumber: ward.coordinator.mobileNumber,
            email: ward.coordinator.email
          } : null,
          wardAdmin: ward.wardAdmin ? {
            name: ward.wardAdmin.name,
            mobileNumber: ward.wardAdmin.mobileNumber,
            email: ward.wardAdmin.email
          } : null,
          population: ward.population,
          area: ward.area
        };
      })
    );

    // Get unique districts and panchayaths for filters
    const uniqueDistricts = [...new Set(consolidatedData.map(item => item.district))].sort();
    const uniqueLocalBodies = [...new Set(consolidatedData.map(item => item.localBody))].sort();

    res.status(200).json({
      data: consolidatedData,
      filters: {
        districts: uniqueDistricts,
        localBodies: uniqueLocalBodies
      },
      summary: {
        totalWards: consolidatedData.length,
        totalClusters: consolidatedData.reduce((sum, item) => sum + item.clusterCount, 0),
        sittingWards: consolidatedData.filter(item => item.isSittingWard).length,
        regularWards: consolidatedData.filter(item => !item.isSittingWard).length
      }
    });

  } catch (error) {
    console.error('Error fetching cluster consolidation data:', error);
    res.status(500).json({ 
      message: 'Failed to fetch cluster consolidation data', 
      error: error.message 
    });
  }
}
