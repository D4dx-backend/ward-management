import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  try {
    // Get the Ward Incharge's ward
    const ward = await Ward.findOne({ wardAdmin: session.user.id });
    
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found for this admin' });
    }

    // Get all clusters for this ward
    const Cluster = require('../../../models/Cluster').default;
    const allClusters = await Cluster.find({ ward: ward._id }).sort({ clusterNumber: 1 });
    const activeClusters = await Cluster.find({ ward: ward._id, isActive: true }).sort({ clusterNumber: 1 });
    
    const clusterInfo = {
      ward: {
        id: ward._id,
        name: ward.name,
        district: ward.district,
        panchayath: ward.panchayath
      },
      clusters: {
        total: allClusters.length,
        active: activeClusters.length,
        inactive: allClusters.length - activeClusters.length,
        list: allClusters.map(c => ({
          id: c._id,
          name: c.name,
          number: c.clusterNumber,
          isActive: c.isActive,
          coordinator: c.coordinator?.name || 'No coordinator'
        }))
      }
    };

    res.status(200).json(clusterInfo);
  } catch (error) {
    console.error('Ward clusters debug API error:', error);
    res.status(500).json({ message: 'Error fetching cluster info', error: error.message });
  }
}