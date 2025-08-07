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

    // Fetch clusters for this ward
    const clusters = await Cluster.find({
      ward: wardId,
      isActive: true
    })
    .select('name description status householdCount population area lastVisited createdAt')
    .sort({ name: 1 });

    // Calculate cluster statistics
    const totalClusters = clusters.length;
    const activeClusters = clusters.filter(c => c.status === 'active').length;
    const totalHouseholds = clusters.reduce((sum, c) => sum + (c.householdCount || 0), 0);
    const totalPopulation = clusters.reduce((sum, c) => sum + (c.population || 0), 0);

    res.status(200).json({
      ward: {
        _id: ward._id,
        name: ward.name,
        wardNumber: ward.wardNumber
      },
      clusters: clusters.map(cluster => ({
        _id: cluster._id,
        name: cluster.name,
        description: cluster.description,
        status: cluster.status || 'active',
        householdCount: cluster.householdCount || 0,
        population: cluster.population || 0,
        area: cluster.area,
        lastVisited: cluster.lastVisited,
        createdAt: cluster.createdAt
      })),
      statistics: {
        totalClusters,
        activeClusters,
        totalHouseholds,
        totalPopulation
      }
    });

  } catch (error) {
    console.error('Error fetching ward clusters:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}