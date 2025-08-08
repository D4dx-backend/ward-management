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

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    const coordinatorId = session.user.id;

    // Get coordinator's wards
    const wards = await Ward.find({
      coordinator: coordinatorId,
      isActive: true
    }).sort({ name: 1 });

    // Get House Visit data for each ward
    const wardVisitData = await Promise.all(
      wards.map(async (ward) => {
        // Get all clusters for this ward
        const clusters = await Cluster.find({
          ward: ward._id,
          isActive: true
        });

        const totalClusters = clusters.length;
        
        // Calculate visited clusters (clusters with recent lastVisited date)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const visitedClusters = clusters.filter(cluster => 
          cluster.lastVisited && cluster.lastVisited >= thirtyDaysAgo
        ).length;
        
        const pendingClusters = totalClusters - visitedClusters;
        const visitPercentage = totalClusters > 0 ? Math.round((visitedClusters / totalClusters) * 100) : 0;
        
        // Get the most recent visit date
        const lastVisitDate = clusters
          .filter(cluster => cluster.lastVisited)
          .sort((a, b) => new Date(b.lastVisited) - new Date(a.lastVisited))[0]?.lastVisited;

        // Determine status based on visit percentage
        let status = 'poor';
        if (visitPercentage >= 80) status = 'excellent';
        else if (visitPercentage >= 60) status = 'good';
        else if (visitPercentage >= 40) status = 'average';

        return {
          _id: ward._id,
          name: ward.name,
          wardNumber: ward.wardNumber,
          totalClusters,
          visitedClusters,
          pendingClusters,
          visitPercentage,
          lastVisitDate,
          status
        };
      })
    );

    // Sort by visit percentage (highest first)
    wardVisitData.sort((a, b) => b.visitPercentage - a.visitPercentage);

    res.status(200).json({
      wards: wardVisitData,
      summary: {
        totalWards: wards.length,
        totalClusters: wardVisitData.reduce((sum, ward) => sum + ward.totalClusters, 0),
        totalVisited: wardVisitData.reduce((sum, ward) => sum + ward.visitedClusters, 0),
        totalPending: wardVisitData.reduce((sum, ward) => sum + ward.pendingClusters, 0),
        overallPercentage: wardVisitData.length > 0 
          ? Math.round(wardVisitData.reduce((sum, ward) => sum + ward.visitPercentage, 0) / wardVisitData.length)
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching ward House Visit data:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}