import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import WardVisit from '../../../models/WardVisit';
import ClusterVisit from '../../../models/ClusterVisit';

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

    const { timeframe = 'month', ward = 'all' } = req.query;
    const coordinatorId = session.user.id;

    // Calculate date ranges based on timeframe
    const now = new Date();
    let startDate, endDate = now;

    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Build ward query
    let wardQuery = { coordinator: coordinatorId, isActive: true };
    if (ward !== 'all') {
      wardQuery._id = ward;
    }

    // Get coordinator's wards
    const wards = await Ward.find(wardQuery)
      .populate('wardAdmin', 'name email mobileNumber lastLogin')
      .sort({ name: 1 });

    const wardIds = wards.map(w => w._id);

    // Get overview statistics
    const [
      totalReports,
      pendingReports,
      overdueReports,
      formTemplates,
      wardVisits,
      clusterVisits
    ] = await Promise.all([
      Response.countDocuments({
        ward: { $in: wardIds },
        submittedAt: { $gte: startDate, $lte: endDate }
      }),
      Response.countDocuments({
        ward: { $in: wardIds },
        status: 'pending'
      }),
      Response.countDocuments({
        ward: { $in: wardIds },
        status: 'overdue'
      }),
      FormTemplate.find({ isActive: true }),
      WardVisit.find({
        ward: { $in: wardIds },
        visitDate: { $gte: startDate, $lte: endDate }
      }).populate('ward', 'name'),
      ClusterVisit.find({
        ward: { $in: wardIds },
        createdAt: { $gte: startDate, $lte: endDate }
      })
    ]);

    // Calculate completion rate
    const expectedReports = wards.length * formTemplates.length;
    const completionRate = expectedReports > 0 ? Math.round((totalReports / expectedReports) * 100) : 0;

    // Ward performance analysis
    const wardPerformance = await Promise.all(
      wards.map(async (ward) => {
        const wardReports = await Response.countDocuments({
          ward: ward._id,
          submittedAt: { $gte: startDate, $lte: endDate }
        });

        const lastActivity = await Response.findOne({
          ward: ward._id
        }).sort({ submittedAt: -1 });

        const expectedForWard = formTemplates.length;
        const wardCompletion = expectedForWard > 0 ? Math.round((wardReports / expectedForWard) * 100) : 0;

        return {
          wardId: ward._id,
          name: ward.name,
          reports: wardReports,
          completion: wardCompletion,
          lastActivity: lastActivity?.submittedAt || ward.createdAt,
          wardAdmin: ward.wardAdmin
        };
      })
    );

    // Form analytics
    const formAnalytics = await Promise.all(
      formTemplates.map(async (form) => {
        const submitted = await Response.countDocuments({
          formTemplate: form._id,
          ward: { $in: wardIds },
          submittedAt: { $gte: startDate, $lte: endDate }
        });

        const pending = await Response.countDocuments({
          formTemplate: form._id,
          ward: { $in: wardIds },
          status: 'pending'
        });

        const total = submitted + pending;
        const completion = total > 0 ? Math.round((submitted / total) * 100) : 0;

        return {
          formType: form.title,
          submitted,
          pending,
          completion
        };
      })
    );

    // Cluster analytics
    const totalClusters = clusterVisits.length;
    const visitedClusters = clusterVisits.filter(cv => cv.status === 'completed').length;
    
    const housesVisited = clusterVisits.reduce((total, cv) => {
      return total + (cv.housesVisited || 0);
    }, 0);

    const visitDays = clusterVisits.reduce((total, cv) => {
      return total + (cv.visitDays || 0);
    }, 0);

    const averageHousesPerDay = visitDays > 0 ? Math.round((housesVisited / visitDays) * 10) / 10 : 0;

    // Trends analysis
    const reportTrends = await Response.aggregate([
      {
        $match: {
          ward: { $in: wardIds },
          submittedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            week: { $week: '$submittedAt' },
            year: { $year: '$submittedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.week': 1 }
      }
    ]);

    // Generate alerts
    const alerts = [];
    
    // Check for inactive wards
    const inactiveWards = wardPerformance.filter(wp => {
      const daysSinceActivity = Math.floor((now - new Date(wp.lastActivity)) / (1000 * 60 * 60 * 24));
      return daysSinceActivity > 14;
    });

    inactiveWards.forEach(ward => {
      alerts.push({
        type: 'warning',
        message: `${ward.name} has not submitted reports for more than 2 weeks`,
        wardId: ward.wardId
      });
    });

    // Check for wards with low completion rates
    const lowPerformanceWards = wardPerformance.filter(wp => wp.completion < 50);
    lowPerformanceWards.forEach(ward => {
      alerts.push({
        type: 'error',
        message: `${ward.name} has low completion rate (${ward.completion}%)`,
        wardId: ward.wardId
      });
    });

    // Check for ward admins who haven't logged in recently
    const inactiveAdmins = wards.filter(ward => {
      if (!ward.wardAdmin?.lastLogin) return true;
      const daysSinceLogin = Math.floor((now - new Date(ward.wardAdmin.lastLogin)) / (1000 * 60 * 60 * 24));
      return daysSinceLogin > 7;
    });

    inactiveAdmins.forEach(ward => {
      alerts.push({
        type: 'warning',
        message: `${ward.name} admin has not logged in for more than a week`,
        wardId: ward._id
      });
    });

    const analytics = {
      overview: {
        totalWards: wards.length,
        activeWards: wards.filter(w => w.wardAdmin).length,
        inactiveWards: wards.filter(w => !w.wardAdmin).length,
        totalReports,
        pendingReports,
        overdueReports,
        completionRate
      },
      wardPerformance: wardPerformance.sort((a, b) => b.completion - a.completion),
      formAnalytics,
      clusterAnalytics: {
        totalClusters,
        visitedClusters,
        housesVisited,
        visitDays,
        averageHousesPerDay
      },
      trends: {
        reportSubmissions: reportTrends.map(trend => ({
          period: `Week ${trend._id.week}`,
          count: trend.count
        })),
        wardActivity: wardPerformance.map(wp => ({
          ward: wp.name,
          completion: wp.completion
        }))
      },
      alerts: alerts.slice(0, 10), // Limit to top 10 alerts
      timeframe,
      dateRange: {
        start: startDate,
        end: endDate
      }
    };

    res.status(200).json(analytics);

  } catch (error) {
    console.error('Error fetching coordinator analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}