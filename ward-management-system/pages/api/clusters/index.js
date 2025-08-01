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
  
  if (req.method === 'GET') {
    try {
      const { wardId, isActive } = req.query;
      
      // Build query
      const query = {};
      if (wardId) query.ward = wardId;
      if (isActive !== undefined) query.isActive = isActive === 'true';
      
      // Role-based filtering
      if (session.user.role === 'wardAdmin') {
        // Ward admins can only see clusters in their ward
        const ward = await Ward.findOne({ wardAdmin: session.user.id });
        if (!ward) {
          console.log('Ward admin has no ward assigned:', session.user.id);
          return res.status(200).json([]); // Return empty array instead of error
        }
        query.ward = ward._id;
      } else if (session.user.role === 'coordinator') {
        // Coordinators can see clusters in their district
        const wards = await Ward.find({ district: session.user.district });
        query.ward = { $in: wards.map(w => w._id) };
      }
      // State admins can see all clusters
      
      const clusters = await Cluster.find(query)
        .populate('ward', 'name district panchayath')
        .populate('createdBy', 'name')
        .sort({ 'ward.name': 1, clusterNumber: 1 });
      
      return res.status(200).json(clusters);
    } catch (error) {
      console.error('Clusters GET error:', error);
      return res.status(500).json({ message: 'Error fetching clusters', error: error.message });
    }
  }
  
  if (req.method === 'POST') {
    // Only state admins and ward admins can create clusters
    if (!['stateAdmin', 'wardAdmin'].includes(session.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    try {
      const { name, clusterNumber, wardId, coordinator } = req.body;
      
      // Validate required fields
      if (!name || !clusterNumber || !wardId || !coordinator) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      // Coordinator name is optional
      // if (!coordinator.name) {
      //   return res.status(400).json({ message: 'Coordinator name is required' });
      // }
      
      // Validate mobile number if provided
      if (coordinator.mobileNumber && !/^\d{10}$/.test(coordinator.mobileNumber)) {
        return res.status(400).json({ message: 'Mobile number must be exactly 10 digits' });
      }
      
      // Check if ward exists
      const ward = await Ward.findById(wardId);
      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }
      
      // Role-based ward access check
      if (session.user.role === 'wardAdmin') {
        const userWard = await Ward.findOne({ wardAdmin: session.user.id });
        if (!userWard || userWard._id.toString() !== wardId) {
          return res.status(403).json({ message: 'You can only create clusters in your assigned ward' });
        }
      }
      
      // Check if cluster number already exists in this ward
      const existingCluster = await Cluster.findOne({ 
        ward: wardId, 
        clusterNumber: clusterNumber.trim() 
      });
      
      if (existingCluster) {
        return res.status(400).json({ message: 'Cluster number already exists in this ward' });
      }
      
      // Create new cluster
      const newCluster = new Cluster({
        name: name.trim(),
        clusterNumber: clusterNumber.trim(),
        ward: wardId,
        coordinator: {
          name: coordinator.name.trim(),
          mobileNumber: coordinator.mobileNumber ? coordinator.mobileNumber.trim() : undefined,
          email: coordinator.email ? coordinator.email.trim() : undefined
        },
        createdBy: session.user.id,
        updatedBy: session.user.id
      });
      
      await newCluster.save();
      
      // Populate the saved cluster for response
      await newCluster.populate('ward', 'name district panchayath');
      await newCluster.populate('createdBy', 'name');
      
      // Log the cluster creation activity
      try {
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.CLUSTER_CREATE,
          description: `Created cluster: ${newCluster.name} (${newCluster.clusterNumber}) in ward ${ward.name}`,
          entityType: 'Cluster',
          entityId: newCluster._id,
          metadata: { 
            clusterName: newCluster.name,
            clusterNumber: newCluster.clusterNumber,
            wardName: ward.name,
            coordinatorName: newCluster.coordinator.name,
            coordinatorMobile: newCluster.coordinator.mobileNumber
          },
          district: ward.district,
          ward: ward._id,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (logError) {
        console.error('Failed to log cluster creation activity:', logError);
      }
      
      return res.status(201).json(newCluster);
    } catch (error) {
      console.error('Cluster creation error:', error);
      return res.status(500).json({ message: 'Error creating cluster', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}