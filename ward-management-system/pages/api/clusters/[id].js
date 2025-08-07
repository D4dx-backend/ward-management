import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Cluster from '../../../models/Cluster';
import Ward from '../../../models/Ward';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  const { id } = req.query;
  
  if (req.method === 'GET') {
    try {
      const cluster = await Cluster.findById(id)
        .populate('ward', 'name district panchayath')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');
      
      if (!cluster) {
        return res.status(404).json({ message: 'Cluster not found' });
      }
      
      // Role-based access check
      if (session.user.role === 'wardAdmin') {
        const userWard = await Ward.findOne({ wardAdmin: session.user.id });
        if (!userWard || userWard._id.toString() !== cluster.ward._id.toString()) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else if (session.user.role === 'coordinator') {
        if (cluster.ward.district !== session.user.district) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      return res.status(200).json(cluster);
    } catch (error) {
      console.error('Cluster GET error:', error);
      return res.status(500).json({ message: 'Error fetching cluster', error: error.message });
    }
  }
  
  if (req.method === 'PUT') {
    // Only state admins and Ward Incharges can update clusters
    if (!['stateAdmin', 'wardAdmin'].includes(session.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const cluster = await Cluster.findById(id).populate('ward');
      
      if (!cluster) {
        return res.status(404).json({ message: 'Cluster not found' });
      }
      
      // Role-based access check
      if (session.user.role === 'wardAdmin') {
        const userWard = await Ward.findOne({ wardAdmin: session.user.id });
        if (!userWard || userWard._id.toString() !== cluster.ward._id.toString()) {
          return res.status(403).json({ message: 'You can only update clusters in your assigned ward' });
        }
      }
      
      const { name, clusterNumber, coordinator, isActive } = req.body;
      
      // Validate required fields
      if (!name || !clusterNumber || !coordinator) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      if (!coordinator.name) {
        return res.status(400).json({ message: 'Coordinator name is required' });
      }
      
      // Validate mobile number if provided
      if (coordinator.mobileNumber && !/^\d{10}$/.test(coordinator.mobileNumber)) {
        return res.status(400).json({ message: 'Mobile number must be exactly 10 digits' });
      }
      
      // Check if cluster number already exists in this ward (excluding current cluster)
      const existingCluster = await Cluster.findOne({ 
        ward: cluster.ward._id, 
        clusterNumber: clusterNumber.trim(),
        _id: { $ne: id }
      });
      
      if (existingCluster) {
        return res.status(400).json({ message: 'Cluster number already exists in this ward' });
      }
      
      // Update cluster
      const updatedCluster = await Cluster.findByIdAndUpdate(
        id,
        {
          name: name.trim(),
          clusterNumber: clusterNumber.trim(),
          coordinator: {
            name: coordinator.name.trim(),
            mobileNumber: coordinator.mobileNumber ? coordinator.mobileNumber.trim() : undefined,
            email: coordinator.email ? coordinator.email.trim() : undefined
          },
          isActive: isActive !== undefined ? isActive : cluster.isActive,
          updatedBy: session.user.id,
          updatedAt: new Date()
        },
        { new: true }
      ).populate('ward', 'name district panchayath')
       .populate('updatedBy', 'name');
      
      // Log the cluster update activity
      try {
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.CLUSTER_UPDATE,
          description: `Updated cluster: ${updatedCluster.name} (${updatedCluster.clusterNumber}) in ward ${updatedCluster.ward.name}`,
          entityType: 'Cluster',
          entityId: updatedCluster._id,
          metadata: { 
            clusterName: updatedCluster.name,
            clusterNumber: updatedCluster.clusterNumber,
            wardName: updatedCluster.ward.name,
            coordinatorName: updatedCluster.coordinator.name,
            coordinatorMobile: updatedCluster.coordinator.mobileNumber,
            isActive: updatedCluster.isActive
          },
          district: updatedCluster.ward.district,
          ward: updatedCluster.ward._id,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (logError) {
        console.error('Failed to log cluster update activity:', logError);
      }
      
      return res.status(200).json(updatedCluster);
    } catch (error) {
      console.error('Cluster update error:', error);
      return res.status(500).json({ message: 'Error updating cluster', error: error.message });
    }
  }
  
  if (req.method === 'DELETE') {
    // Only state admins can delete clusters
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Only state admins can delete clusters' });
    }
    
    try {
      const cluster = await Cluster.findById(id).populate('ward');
      
      if (!cluster) {
        return res.status(404).json({ message: 'Cluster not found' });
      }
      
      await Cluster.findByIdAndDelete(id);
      
      // Log the cluster deletion activity
      try {
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.CLUSTER_DELETE,
          description: `Deleted cluster: ${cluster.name} (${cluster.clusterNumber}) from ward ${cluster.ward.name}`,
          entityType: 'Cluster',
          entityId: cluster._id,
          metadata: { 
            clusterName: cluster.name,
            clusterNumber: cluster.clusterNumber,
            wardName: cluster.ward.name,
            coordinatorName: cluster.coordinator.name
          },
          district: cluster.ward.district,
          ward: cluster.ward._id,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (logError) {
        console.error('Failed to log cluster deletion activity:', logError);
      }
      
      return res.status(200).json({ message: 'Cluster deleted successfully' });
    } catch (error) {
      console.error('Cluster deletion error:', error);
      return res.status(500).json({ message: 'Error deleting cluster', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}