import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Cluster from '../../../models/Cluster';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  try {
    let query = {};
    
    // Role-based filtering
    if (session.user.role === 'wardAdmin') {
      // Ward admins can only see clusters in their ward
      const ward = await Ward.findOne({ wardAdmin: session.user.id });
      if (!ward) {
        return res.status(200).json({
          totalClusters: 0,
          activeClusters: 0,
          inactiveClusters: 0,
          clustersByWard: []
        });
      }
      query.ward = ward._id;
    } else if (session.user.role === 'coordinator') {
      // Coordinators can see clusters in their district
      const wards = await Ward.find({ district: session.user.district });
      query.ward = { $in: wards.map(w => w._id) };
    }
    // State admins can see all clusters
    
    // Get total counts
    const totalClusters = await Cluster.countDocuments(query);
    const activeClusters = await Cluster.countDocuments({ ...query, isActive: true });
    const inactiveClusters = totalClusters - activeClusters;
    
    // Get clusters by ward
    const clustersByWard = await Cluster.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$ward',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'wards',
          localField: '_id',
          foreignField: '_id',
          as: 'ward'
        }
      },
      {
        $unwind: '$ward'
      },
      {
        $project: {
          wardName: '$ward.name',
          district: '$ward.district',
          totalClusters: '$count',
          activeClusters: '$activeCount',
          inactiveClusters: { $subtract: ['$count', '$activeCount'] }
        }
      },
      {
        $sort: { 'ward.name': 1 }
      }
    ]);
    
    return res.status(200).json({
      totalClusters,
      activeClusters,
      inactiveClusters,
      clustersByWard
    });
    
  } catch (error) {
    console.error('Cluster stats error:', error);
    return res.status(500).json({ message: 'Error fetching cluster statistics', error: error.message });
  }
}