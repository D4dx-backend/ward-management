import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import connectToDatabase from '../../lib/mongodb';
import ActivityLog from '../../models/ActivityLog';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only state admin, coordinators, and ward admins can access activity logs
  if (session.user.role !== 'stateAdmin' && session.user.role !== 'coordinator' && session.user.role !== 'wardAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  await connectToDatabase();

  try {
    const {
      action,
      user,
      district,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = {};

    if (action) query.action = action;
    if (user) query.user = user;
    if (district) query.district = new RegExp(district, 'i');

    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo) query.timestamp.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    // Filter based on user role
    if (session.user.role === 'coordinator') {
      query.district = session.user.district;
    } else if (session.user.role === 'wardAdmin') {
      // Ward admins can only see their own activity logs
      query.user = session.user.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalLogs = await ActivityLog.countDocuments(query);
    const totalPages = Math.ceil(totalLogs / parseInt(limit));

    const logs = await ActivityLog.find(query)
      .populate('user', 'name email role')
      .populate('ward', 'name district')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      logs,
      totalPages,
      currentPage: parseInt(page),
      totalLogs
    });

  } catch (error) {
    console.error('Activity logs error:', error);
    return res.status(500).json({ message: 'Error fetching activity logs' });
  }
}