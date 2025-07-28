import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import Cluster from '../../../../models/Cluster';
import Ward from '../../../../models/Ward';

export default async function handler(req, res) {
  const { method } = req;

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

  switch (method) {
    case 'GET':
      try {
        const clusters = await Cluster.find({ ward: ward._id })
          .populate('ward', 'name wardNumber panchayath district')
          .sort({ clusterNumber: 1 });

        res.status(200).json(clusters);
      } catch (error) {
        console.error('Error fetching ward clusters:', error);
        res.status(500).json({ message: 'Error fetching clusters' });
      }
      break;

    case 'POST':
      try {
        const { name, clusterNumber, coordinator, isActive = true } = req.body;

        // Validate required fields
        if (!name || !clusterNumber || !coordinator?.name) {
          return res.status(400).json({ 
            message: 'Name, cluster number, and coordinator name are required' 
          });
        }

        // Check if cluster number already exists in this ward
        const existingCluster = await Cluster.findOne({ 
          ward: ward._id, 
          clusterNumber: parseInt(clusterNumber) 
        });

        if (existingCluster) {
          return res.status(400).json({ 
            message: 'Cluster number already exists in this ward' 
          });
        }

        // Create new cluster
        const cluster = new Cluster({
          name: name.trim(),
          clusterNumber: parseInt(clusterNumber),
          ward: ward._id,
          coordinator: {
            name: coordinator.name.trim(),
            mobileNumber: coordinator.mobileNumber?.trim() || ''
          },
          isActive,
          createdBy: session.user.id
        });

        await cluster.save();

        // Populate the ward information before returning
        await cluster.populate('ward', 'name wardNumber panchayath district');

        res.status(201).json(cluster);
      } catch (error) {
        console.error('Error creating cluster:', error);
        if (error.code === 11000) {
          res.status(400).json({ message: 'Cluster with this number already exists in the ward' });
        } else {
          res.status(500).json({ message: 'Error creating cluster' });
        }
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}