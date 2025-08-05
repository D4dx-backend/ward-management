import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import WardVisit from '../../../models/WardVisit';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

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

    const { 
      coordinator, 
      ward, 
      district,
      month, 
      year, 
      followUpStatus,
      limit = 50, 
      page = 1 
    } = req.query;

    // Build query
    let query = {};
    
    // Filter by coordinator
    if (coordinator) {
      query.coordinator = coordinator;
    }
    
    // Filter by ward
    if (ward) {
      query.ward = ward;
    }
    
    // Filter by district (need to get wards in that district first)
    if (district) {
      const wardsInDistrict = await Ward.find({ district }).select('_id');
      const wardIds = wardsInDistrict.map(w => w._id);
      query.ward = query.ward ? query.ward : { $in: wardIds };
    }
    
    // Filter by month/year
    if (month || year) {
      const dateFilter = {};
      if (year) {
        const startYear = new Date(parseInt(year), 0, 1);
        const endYear = new Date(parseInt(year) + 1, 0, 1);
        dateFilter.$gte = startYear;
        dateFilter.$lt = endYear;
      }
      if (month && year) {
        const startMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endMonth = new Date(parseInt(year), parseInt(month), 1);
        dateFilter.$gte = startMonth;
        dateFilter.$lt = endMonth;
      }
      if (Object.keys(dateFilter).length > 0) {
        query.visitDate = dateFilter;
      }
    }
    
    // Filter by follow-up status
    if (followUpStatus) {
      switch (followUpStatus) {
        case 'required':
          query.followUpRequired = true;
          break;
        case 'completed':
          query.followUpRequired = true;
          query.followUpCompleted = true;
          break;
        case 'pending':
          query.followUpRequired = true;
          query.followUpCompleted = { $ne: true };
          break;
        case 'overdue':
          query.followUpRequired = true;
          query.followUpCompleted = { $ne: true };
          query.followUpDate = { $lt: new Date() };
          break;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get visits with populated data
    const visits = await WardVisit.find(query)
      .populate('ward', 'name wardNumber district panchayath')
      .populate('coordinator', 'name email')
      .sort({ visitDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalVisits = await WardVisit.countDocuments(query);

    // For now, return just the visits array to match frontend expectations
    // Later we can enhance the frontend to use pagination
    res.status(200).json(visits);

  } catch (error) {
    console.error('Error fetching admin ward visits:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}