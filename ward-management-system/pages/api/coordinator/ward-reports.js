import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import Response from '../../../models/Response';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
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

    // Get reports with populated data
    const reports = await Response.find(query)
      .populate('ward', 'name wardNumber district panchayath')
      .populate('formTemplate', 'title description')
      .populate('respondent', 'name email role')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalReports = await Response.countDocuments(query);

    res.status(200).json({
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReports / parseInt(limit)),
        totalReports,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching ward reports:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}