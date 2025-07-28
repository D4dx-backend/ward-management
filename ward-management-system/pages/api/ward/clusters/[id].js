import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import Cluster from '../../../../models/Cluster';
import Ward from '../../../../models/Ward';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  await dbConnect();

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only ward admins can access this endpoint
  if (session.user.role !== 'wardAdmin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Get the ward admin's ward
  const ward = await Ward.findOne({ wardAdmin: session.user.id });
  if (!ward) {
    return res.status(404).json({ message: 'Ward not found for this admin' });
  }

  // Find the cluster and verify it belongs to this ward
  const cluster = await Cluster.findOne({ _id: id, ward: ward._id });
  if (!cluster) {
    return res.status(404).json({ message: 'Cluster not found or access denied' });
  }

  switch (method) {
    case 'GET':
      try {
        await cluster.populate('ward', 'name wardNumber panchayath district');
        res.status(200).json(cluster);
      } catch (error) {
        console.error('Error fetching cluster:', error);
        res.status(500).json({ message: 'Error fetching cluster' });
      }
      break;

    case 'PUT':
      try {
        const { name, clusterNumber, coordinator, isActive } = req.body;

        // Validate required fields
        if (!name || !clusterNumber || !coordinator?.name) {
          return res.status(400).json({ 
            message: 'Name, cluster number, and coordinator name are required' 
          });
        }

        // Check if cluster number already exists in this ward (excluding current cluster)
        const existingCluster = await Cluster.findOne({ 
          ward: ward._id, 
          clusterNumber: parseInt(clusterNumber),
          _id: { $ne: id }
        });

        if (existingCluster) {
          return res.status(400).json({ 
            message: 'Cluster number already exists in this ward' 
          });
        }

        // Update cluster
        cluster.name = name.trim();
        cluster.clusterNumber = parseInt(clusterNumber);
        cluster.coordinator = {
          name: coordinator.name.trim(),
          mobileNumber: coordinator.mobileNumber?.trim() || ''
        };
        cluster.isActive = isActive !== undefined ? isActive : cluster.isActive;
        cluster.updatedBy = session.user.id;
        cluster.updatedAt = new Date();

        await cluster.save();

        // Populate the ward information before returning
        await cluster.populate('ward', 'name wardNumber panchayath district');

        res.status(200).json(cluster);
      } catch (error) {
        console.error('Error updating cluster:', error);
        if (error.code === 11000) {
          res.status(400).json({ message: 'Cluster with this number already exists in the ward' });
        } else {
          res.status(500).json({ message: 'Error updating cluster' });
        }
      }
      break;

    case 'DELETE':
      try {
        await Cluster.findByIdAndDelete(id);
        res.status(200).json({ message: 'Cluster deleted successfully' });
      } catch (error) {
        console.error('Error deleting cluster:', error);
        res.status(500).json({ message: 'Error deleting cluster' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}