import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import Ward from '../../../../models/Ward';
import Cluster from '../../../../models/Cluster';

export default async function handler(req, res) {
  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    const { clusterId } = req.query;
    const coordinatorId = session.user.id;

    switch (req.method) {
      case 'PUT':
        return await updateCluster(clusterId, req.body, coordinatorId, res);
      case 'DELETE':
        return await deleteCluster(clusterId, coordinatorId, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in coordinator cluster API:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateCluster(clusterId, data, coordinatorId, res) {
  try {
    // Find cluster and verify it belongs to coordinator's ward
    const cluster = await Cluster.findById(clusterId).populate('ward');
    
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    // Verify ward belongs to coordinator
    if (cluster.ward.coordinator.toString() !== coordinatorId) {
      return res.status(403).json({ message: 'Access denied. This cluster is not under your coordination.' });
    }

    const { name, clusterNumber, wardId, coordinator, isActive } = data;

    // If ward is being changed, verify new ward belongs to coordinator
    if (wardId && wardId !== cluster.ward._id.toString()) {
      const newWard = await Ward.findOne({ 
        _id: wardId, 
        coordinator: coordinatorId,
        isActive: true 
      });

      if (!newWard) {
        return res.status(403).json({ message: 'Access denied. The new ward is not under your coordination.' });
      }
    }

    // Check if cluster number conflicts (if changed)
    if (clusterNumber && clusterNumber !== cluster.clusterNumber) {
      const existingCluster = await Cluster.findOne({
        ward: wardId || cluster.ward._id,
        clusterNumber: clusterNumber,
        _id: { $ne: clusterId }
      });

      if (existingCluster) {
        return res.status(400).json({ message: 'Cluster number already exists in this ward' });
      }
    }

    // Update cluster
    const updatedCluster = await Cluster.findByIdAndUpdate(
      clusterId,
      {
        name: name || cluster.name,
        clusterNumber: clusterNumber || cluster.clusterNumber,
        ward: wardId || cluster.ward._id,
        coordinator: {
          name: coordinator?.name || cluster.coordinator.name,
          mobileNumber: coordinator?.mobileNumber || cluster.coordinator.mobileNumber
        },
        isActive: isActive !== undefined ? isActive : cluster.isActive
      },
      { new: true }
    )
    .populate('ward', 'name wardNumber district panchayath')
    .populate('coordinator', 'name mobileNumber');

    res.status(200).json(updatedCluster);
  } catch (error) {
    console.error('Error updating cluster:', error);
    res.status(500).json({ message: 'Failed to update cluster' });
  }
}

async function deleteCluster(clusterId, coordinatorId, res) {
  try {
    // Find cluster and verify it belongs to coordinator's ward
    const cluster = await Cluster.findById(clusterId).populate('ward');
    
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    // Verify ward belongs to coordinator
    if (cluster.ward.coordinator.toString() !== coordinatorId) {
      return res.status(403).json({ message: 'Access denied. This cluster is not under your coordination.' });
    }

    // Delete cluster
    await Cluster.findByIdAndDelete(clusterId);

    res.status(200).json({ message: 'Cluster deleted successfully' });
  } catch (error) {
    console.error('Error deleting cluster:', error);
    res.status(500).json({ message: 'Failed to delete cluster' });
  }
}