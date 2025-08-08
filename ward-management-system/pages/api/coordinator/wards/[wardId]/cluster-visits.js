import { getSession } from 'next-auth/react';
import dbConnect from '../../../../../lib/mongodb';
import Ward from '../../../../../models/Ward';
import Cluster from '../../../../../models/Cluster';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    const { wardId } = req.query;
    const coordinatorId = session.user.id;

    // Verify that the ward belongs to this coordinator
    const ward = await Ward.findOne({
      _id: wardId,
      coordinator: coordinatorId,
      isActive: true
    });

    if (!ward) {
      return res.status(403).json({ message: 'Access denied to this ward' });
    }

    // Get all clusters for this ward
    const clusters = await Cluster.find({
      ward: wardId,
      isActive: true
    }).sort({ name: 1 });

    // Process clusters to add visit status
    const processedClusters = clusters.map(cluster => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let status = 'pending';
      if (cluster.lastVisited) {
        if (cluster.lastVisited >= thirtyDaysAgo) {
          status = 'visited';
        } else {
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
          status = cluster.lastVisited < sixtyDaysAgo ? 'overdue' : 'pending';
        }
      }

      return {
        ...cluster.toObject(),
        status,
        visitCount: cluster.visitCount || 0
      };
    });

    // Calculate summary statistics
    const summary = {
      totalClusters: clusters.length,
      visitedClusters: processedClusters.filter(c => c.status === 'visited').length,
      pendingClusters: processedClusters.filter(c => c.status === 'pending').length,
      overdueClusters: processedClusters.filter(c => c.status === 'overdue').length,
      totalHouseholds: processedClusters.reduce((sum, c) => sum + (c.householdCount || 0), 0),
      totalPopulation: processedClusters.reduce((sum, c) => sum + (c.population || 0), 0)
    };

    res.status(200).json({
      ward: {
        _id: ward._id,
        name: ward.name,
        wardNumber: ward.wardNumber
      },
      clusters: processedClusters,
      summary
    });

  } catch (error) {
    console.error('Error fetching ward House Visits:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}