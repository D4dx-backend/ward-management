import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import ClusterVisit from '../../../models/ClusterVisit';

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

    if (!wardId) {
      return res.status(400).json({ message: 'Ward ID is required' });
    }

    // Verify ward belongs to coordinator
    const ward = await Ward.findOne({ _id: wardId, coordinator: coordinatorId });
    if (!ward) {
      return res.status(403).json({ message: 'Access denied to this ward' });
    }

    // Get cluster visits for the ward
    const clusterVisits = await ClusterVisit.find({ ward: wardId })
      .populate('ward', 'name wardNumber')
      .sort({ createdAt: -1 });

    // Process cluster data to get summary
    const clusterSummary = clusterVisits.map(cluster => {
      const totalHouses = cluster.totalHouses || 0;
      const housesVisited = cluster.housesVisited || 0;
      const completionRate = totalHouses > 0 ? Math.round((housesVisited / totalHouses) * 100) : 0;

      return {
        _id: cluster._id,
        name: cluster.clusterName || cluster.name || 'Unknown Cluster',
        totalHouses,
        housesVisited,
        completionRate,
        visitDays: cluster.visitDays || 0,
        status: cluster.status || 'pending',
        lastUpdated: cluster.updatedAt || cluster.createdAt
      };
    });

    res.status(200).json(clusterSummary);

  } catch (error) {
    console.error('Error fetching ward clusters:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}