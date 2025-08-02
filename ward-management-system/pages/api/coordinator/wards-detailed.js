import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import ClusterVisit from '../../../models/ClusterVisit';
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

    const coordinatorId = session.user.id;

    // Get coordinator's wards with populated data
    const wards = await Ward.find({ 
      coordinator: coordinatorId, 
      isActive: true 
    })
    .populate('coordinator', 'name email mobileNumber')
    .populate('wardAdmin', 'name email mobileNumber lastLogin')
    .sort({ name: 1 });

    // Get current date for calculations
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();

    // Get all form templates to calculate expected reports
    const formTemplates = await FormTemplate.find({ isActive: true });
    const totalExpectedReports = formTemplates.length;

    // Process each ward to get detailed information
    const detailedWards = await Promise.all(
      wards.map(async (ward) => {
        // Get submitted reports count
        const submittedReports = await Response.countDocuments({
          ward: ward._id,
          submittedAt: { $exists: true }
        });

        // Get recent reports for last activity
        const lastReport = await Response.findOne({
          ward: ward._id
        }).sort({ submittedAt: -1 });

        // Get cluster visit data
        const clusterVisits = await ClusterVisit.find({
          ward: ward._id
        });

        const totalClusters = clusterVisits.length;
        const visitedClusters = clusterVisits.filter(cv => 
          cv.status === 'completed' || (cv.housesVisited && cv.housesVisited > 0)
        ).length;

        const housesVisited = clusterVisits.reduce((total, cv) => {
          return total + (cv.housesVisited || 0);
        }, 0);

        // Get ward visits
        const wardVisits = await WardVisit.countDocuments({
          ward: ward._id,
          visitDate: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        });

        // Calculate completion rate
        const completionRate = totalExpectedReports > 0 
          ? Math.round((submittedReports / totalExpectedReports) * 100) 
          : 0;

        // Determine report status
        let reportStatus = 'up-to-date';
        if (completionRate < 30) {
          reportStatus = 'overdue';
        } else if (completionRate < 70) {
          reportStatus = 'behind';
        }

        // Calculate days since last activity
        const lastActivity = lastReport?.submittedAt || ward.createdAt;
        const daysSinceActivity = Math.floor((now - new Date(lastActivity)) / (1000 * 60 * 60 * 24));

        // Count pending tasks (this could be expanded based on your requirements)
        const pendingReports = await Response.countDocuments({
          ward: ward._id,
          status: 'pending'
        });

        const pendingTasks = pendingReports + (totalClusters - visitedClusters);

        return {
          _id: ward._id,
          name: ward.name,
          wardNumber: ward.wardNumber,
          district: ward.district,
          panchayath: ward.panchayath,
          isActive: ward.isActive,
          coordinator: ward.coordinator,
          wardAdmin: ward.wardAdmin,
          submittedReports,
          expectedReports: totalExpectedReports,
          completionRate,
          lastActivity,
          daysSinceActivity,
          reportStatus,
          totalClusters,
          visitedClusters,
          housesVisited,
          wardVisits,
          pendingTasks,
          createdAt: ward.createdAt,
          updatedAt: ward.updatedAt
        };
      })
    );

    res.status(200).json(detailedWards);

  } catch (error) {
    console.error('Error fetching detailed wards:', error);
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