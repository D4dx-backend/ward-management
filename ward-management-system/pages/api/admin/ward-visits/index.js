import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import WardVisit from '../../../../models/WardVisit';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    await dbConnect();

    // Get all ward visits with filters and hierarchical data
    const { coordinator, ward, dateFrom, dateTo, recordedBy } = req.query;
    
    const query = {};
    
    if (coordinator) query.coordinator = coordinator;
    if (ward) query.ward = ward;
    if (recordedBy) query.recordedBy = recordedBy;
    
    if (dateFrom || dateTo) {
      query.visitDate = {};
      if (dateFrom) query.visitDate.$gte = new Date(dateFrom);
      if (dateTo) query.visitDate.$lte = new Date(dateTo);
    }
    
    const visits = await WardVisit.find(query)
      .populate('ward', 'name wardNumber district panchayath')
      .populate('coordinator', 'name email role')
      .sort({ visitDate: -1, createdAt: -1 });

    res.status(200).json(visits);
  } catch (error) {
    console.error('Error fetching ward visits:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}