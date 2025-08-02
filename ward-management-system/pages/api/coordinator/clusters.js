import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import Cluster from '../../../models/Cluster';

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

    const coordinatorId = session.user.id;

    switch (req.method) {
      case 'GET':
        return await getClusters(coordinatorId, res);
      case 'POST':
        return await createCluster(req.body, coordinatorId, res);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in coordinator clusters API:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getClusters(coordinatorId, res) {
  try {
    // Get wards under coordinator
    const wards = await Ward.find({ 
      coordinator: coordinatorId, 
      isActive: true 
    }).select('_id');

    const wardIds = wards.map(w => w._id);

    // Get clusters for these wards
    const clusters = await Cluster.find({ 
      ward: { $in: wardIds },
      isActive: true 
    })
    .populate('ward', 'name wardNumber district panchayath')
    .populate('coordinator', 'name mobileNumber')
    .sort({ 'ward.name': 1, clusterNumber: 1 });

    res.status(200).json(clusters);
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({ message: 'Failed to fetch clusters' });
  }
}

async function createCluster(data, coordinatorId, res) {
  try {
    const { name, clusterNumber, wardId, coordinator, isActive = true } = data;

    // Verify ward belongs to coordinator
    const ward = await Ward.findOne({ 
      _id: wardId, 
      coordinator: coordinatorId,
      isActive: true 
    });

    if (!ward) {
      return res.status(403).json({ message: 'Access denied. This ward is not under your coordination.' });
    }

    // Check if cluster number already exists in this ward
    const existingCluster = await Cluster.findOne({
      ward: wardId,
      clusterNumber: clusterNumber
    });

    if (existingCluster) {
      return res.status(400).json({ message: 'Cluster number already exists in this ward' });
    }

    // Create new cluster
    const newCluster = new Cluster({
      name,
      clusterNumber,
      ward: wardId,
      coordinator: {
        name: coordinator.name,
        mobileNumber: coordinator.mobileNumber || null
      },
      isActive
    });

    await newCluster.save();

    // Populate the response
    const populatedCluster = await Cluster.findById(newCluster._id)
      .populate('ward', 'name wardNumber district panchayath')
      .populate('coordinator', 'name mobileNumber');

    res.status(201).json(populatedCluster);
  } catch (error) {
    console.error('Error creating cluster:', error);
    res.status(500).json({ message: 'Failed to create cluster' });
  }
}