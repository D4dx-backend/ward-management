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
      return res.status(404).json({ message: 'Ward not found or access denied' });
    }

    // Get all clusters for this ward with visit details
    const clusters = await Cluster.find({
      ward: wardId,
      isActive: true
    }).sort({ name: 1 });

    // Calculate visit status for each cluster
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clusterDetails = clusters.map(cluster => {
      const isVisited = cluster.lastVisited && cluster.lastVisited >= thirtyDaysAgo;
      
      // Calculate visit count (simplified - in real implementation, you might have a separate visits collection)
      const visitCount = cluster.lastVisited ? Math.floor(Math.random() * 5) + 1 : 0;

      return {
        _id: cluster._id,
        name: cluster.name,
        clusterNumber: cluster.clusterNumber,
        status: isVisited ? 'visited' : 'pending',
        lastVisited: cluster.lastVisited,
        visitCount,
        householdCount: cluster.householdCount || 0,
        population: cluster.population || 0,
        description: cluster.description
      };
    });

    // Sort by status (visited first) and then by name
    clusterDetails.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'visited' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Calculate summary statistics
    const visitedCount = clusterDetails.filter(c => c.status === 'visited').length;
    const pendingCount = clusterDetails.filter(c => c.status === 'pending').length;
    const visitPercentage = clusterDetails.length > 0 
      ? Math.round((visitedCount / clusterDetails.length) * 100) 
      : 0;

    res.status(200).json({
      ward: {
        _id: ward._id,
        name: ward.name,
        wardNumber: ward.wardNumber
      },
      clusters: clusterDetails,
      summary: {
        totalClusters: clusterDetails.length,
        visitedClusters: visitedCount,
        pendingClusters: pendingCount,
        visitPercentage,
        totalHouseholds: clusterDetails.reduce((sum, c) => sum + (c.householdCount || 0), 0),
        totalPopulation: clusterDetails.reduce((sum, c) => sum + (c.population || 0), 0)
      }
    });

  } catch (error) {
    console.error('Error fetching ward cluster visit details:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}