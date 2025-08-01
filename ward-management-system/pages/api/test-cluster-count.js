import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import connectToDatabase from '../../lib/mongodb';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'wardAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  try {
    // Get the ward admin's ward
    const ward = await Ward.findOne({ wardAdmin: session.user.id });
    
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found for this admin' });
    }

    // Get all clusters for this ward
    const Cluster = require('../../models/Cluster').default;
    const allClusters = await Cluster.find({ ward: ward._id });
    const activeClusters = await Cluster.find({ ward: ward._id, isActive: { $ne: false } });
    
    const result = {
      timestamp: new Date().toISOString(),
      ward: {
        id: ward._id,
        name: ward.name
      },
      clusters: {
        total: allClusters.length,
        active: activeClusters.length,
        list: allClusters.map(c => ({
          name: c.name,
          number: c.clusterNumber,
          isActive: c.isActive
        }))
      }
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Test cluster count error:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
}