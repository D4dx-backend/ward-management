import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import WardVisit from '../../../models/WardVisit';

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

    const { wardId, limit = 10, page = 1 } = req.query;
    const coordinatorId = session.user.id;

    // Build query
    let query = {};
    
    if (wardId) {
      // Verify ward belongs to coordinator
      const ward = await Ward.findOne({ _id: wardId, coordinator: coordinatorId });
      if (!ward) {
        return res.status(403).json({ message: 'Access denied to this ward' });
      }
      query.ward = wardId;
    } else {
      // Get all wards for coordinator
      const wards = await Ward.find({ coordinator: coordinatorId }).select('_id');
      query.ward = { $in: wards.map(w => w._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get visits with populated data
    const visits = await WardVisit.find(query)
      .populate('ward', 'name wardNumber district panchayath')
      .populate('coordinator', 'name email')
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalVisits = await WardVisit.countDocuments(query);

    // For now, return just the visits array to match frontend expectations
    // Later we can enhance the frontend to use pagination
    res.status(200).json(visits);

  } catch (error) {
    console.error('Error fetching ward visits:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}