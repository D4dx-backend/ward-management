import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';
import LoginHistory from '../../../models/LoginHistory';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let session;
    try {
      session = await getServerSession(req, res, authOptions);
    } catch (sessionError) {
      console.error('Session error:', sessionError);
      return res.status(401).json({ 
        message: 'Session authentication failed',
        error: process.env.NODE_ENV === 'development' ? sessionError.message : 'Authentication error'
      });
    }
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await dbConnect();

    const { district, coordinator, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query based on user role
    let wardQuery = { isActive: true };
    
    if (session.user.role === 'coordinator') {
      wardQuery.coordinator = session.user.id;
    } else if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Apply filters
    if (district) {
      wardQuery.district = district;
    }
    if (coordinator) {
      wardQuery.coordinator = coordinator;
    }

    // Get wards with populated data
    const wards = await Ward.find(wardQuery)
      .populate('coordinator', 'name email mobileNumber lastLogin')
      .populate('wardAdmin', 'name email mobileNumber lastLogin')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalWards = await Ward.countDocuments(wardQuery);

    // Get current week and year for report counting
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();

    // Get all form templates to count total expected reports
    const formTemplates = await FormTemplate.find({ isActive: true });
    const totalExpectedReports = formTemplates.length;

    // Process each ward to get status information
    const wardStatusList = await Promise.all(
      wards.map(async (ward) => {
        // Get last login for Ward Incharge
        const lastLogin = await LoginHistory.findOne({
          user: ward.wardAdmin?._id,
          isActive: false
        }).sort({ loginTime: -1 });

        // Get submitted reports count for current week
        const submittedReports = await Response.countDocuments({
          ward: ward._id,
          weekNumber: currentWeek,
          year: currentYear
        });

        // Calculate status based on last login
        const lastLoginDate = lastLogin?.loginTime || ward.wardAdmin?.lastLogin;
        const daysSinceLogin = lastLoginDate 
          ? Math.floor((now - new Date(lastLoginDate)) / (1000 * 60 * 60 * 24))
          : null;

        let statusColor = 'gray'; // Default for no login data
        if (daysSinceLogin !== null) {
          if (daysSinceLogin >= 7) {
            statusColor = 'red';
          } else if (daysSinceLogin >= 4) {
            statusColor = 'orange';
          } else {
            statusColor = 'green';
          }
        }

        return {
          _id: ward._id,
          name: ward.name,
          wardNumber: ward.wardNumber,
          panchayath: ward.panchayath,
          district: ward.district,
          coordinator: {
            _id: ward.coordinator._id,
            name: ward.coordinator.name,
            email: ward.coordinator.email,
            mobileNumber: ward.coordinator.mobileNumber
          },
          wardAdmin: ward.wardAdmin ? {
            _id: ward.wardAdmin._id,
            name: ward.wardAdmin.name,
            email: ward.wardAdmin.email,
            mobileNumber: ward.wardAdmin.mobileNumber
          } : null,
          lastLogin: lastLoginDate,
          daysSinceLogin,
          statusColor,
          submittedReports,
          totalExpectedReports,
          reportCompletionRate: totalExpectedReports > 0 
            ? Math.round((submittedReports / totalExpectedReports) * 100) 
            : 0
        };
      })
    );

    // Apply status filter if provided
    let filteredWards = wardStatusList;
    if (status) {
      filteredWards = wardStatusList.filter(ward => ward.statusColor === status);
    }

    res.status(200).json({
      wards: filteredWards,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalWards / parseInt(limit)),
        totalWards,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching ward status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}