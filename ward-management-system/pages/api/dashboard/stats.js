import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import Ward from '../../../models/Ward';
import FormTemplate from '../../../models/FormTemplate';
import Response from '../../../models/Response';
import ActivityLog from '../../../models/ActivityLog';
import LoginHistory from '../../../models/LoginHistory';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  try {
    const stats = {};
    const recentLogs = [];
    const recentReports = [];
    const recentLogins = [];

    if (session.user.role === 'stateAdmin') {
      // State Admin Dashboard Stats
      const [users, wards, forms, responses] = await Promise.all([
        User.countDocuments(),
        Ward.countDocuments(),
        FormTemplate.countDocuments({ isActive: true }),
        Response.countDocuments()
      ]);

      stats.users = users;
      stats.wards = wards;
      stats.forms = forms;
      stats.reports = responses;

      // Get recent activity logs (last 10)
      const logs = await ActivityLog.find()
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ timestamp: -1 })
        .limit(10);

      recentLogs.push(...logs);

      // Get recent reports (last 10)
      const reports = await Response.find()
        .populate('formTemplate', 'title formType')
        .populate('respondent', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ submittedAt: -1 })
        .limit(10);

      // Transform the reports to match the expected format
      const transformedReports = reports.map(report => ({
        ...report.toObject(),
        form: report.formTemplate, // Map formTemplate to form for compatibility
        user: report.respondent     // Map respondent to user for compatibility
      }));

      recentReports.push(...transformedReports);

      // Get recent login history (last 10)
      const logins = await LoginHistory.find()
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ loginTime: -1 })
        .limit(10);

      recentLogins.push(...logins);

    } else if (session.user.role === 'coordinator') {
      // Coordinator Dashboard Stats - only count wards assigned to this coordinator
      const [totalWards, activeWards, totalReports, activeForms] = await Promise.all([
        Ward.countDocuments({ coordinator: session.user.id }),
        Ward.countDocuments({ coordinator: session.user.id, wardAdmin: { $ne: null } }),
        Response.countDocuments({ district: session.user.district }),
        FormTemplate.countDocuments({ isActive: true })
      ]);

      // Calculate pending reports for current week
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      // Calculate current week number (ISO week)
      const startOfYear = new Date(currentYear, 0, 1);
      const pastDaysOfYear = (currentDate - startOfYear) / 86400000;
      const currentWeek = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
      
      // Get ward admins in coordinator's district
      const wardAdmins = await User.find({ 
        role: 'wardAdmin', 
        district: session.user.district 
      }).select('_id name');
      
      const wardAdminIds = wardAdmins.map(admin => admin._id);
      
      // Get all active forms
      const activeFormsList = await FormTemplate.find({ isActive: true });
      
      let pendingReports = 0;
      const pendingReportsList = [];
      
      for (const form of activeFormsList) {
        if (form.formType === 'wardReport') {
          // For ward reports, check current week submissions
          const submittedThisWeek = await Response.find({
            formTemplate: form._id,
            respondent: { $in: wardAdminIds },
            weekNumber: currentWeek,
            year: currentYear
          }).populate('respondent', '_id name');
          
          const submittedAdminIds = submittedThisWeek.map(r => r.respondent._id.toString());
          
          // Find ward admins who haven't submitted this week
          const pendingAdmins = wardAdmins.filter(admin => 
            !submittedAdminIds.includes(admin._id.toString())
          );
          
          for (const admin of pendingAdmins) {
            const adminWard = await Ward.findOne({ wardAdmin: admin._id });
            if (adminWard) { // Only count if admin has an assigned ward
              pendingReportsList.push({
                formTitle: form.title,
                formType: form.formType,
                adminName: admin.name,
                wardName: adminWard.name,
                dueDate: form.dueDate || null,
                weekNumber: currentWeek,
                year: currentYear
              });
              pendingReports++;
            }
          }
        } else if (form.formType === 'coordinatorReport') {
          // For coordinator reports, check current week submission
          const coordinatorSubmittedThisWeek = await Response.countDocuments({
            formTemplate: form._id,
            respondent: session.user.id,
            weekNumber: currentWeek,
            year: currentYear
          });
          
          if (coordinatorSubmittedThisWeek === 0) {
            pendingReportsList.push({
              formTitle: form.title,
              formType: form.formType,
              adminName: session.user.name,
              wardName: null,
              dueDate: form.dueDate || null,
              weekNumber: currentWeek,
              year: currentYear
            });
            pendingReports += 1;
          }
        }
      }

      stats.totalWards = totalWards;
      stats.activeWards = activeWards;
      stats.totalReports = totalReports;
      stats.pendingReports = pendingReports;

      // Get coordinator's wards with detailed information
      const coordinatorWards = await Ward.find({ 
        coordinator: session.user.id 
      }).populate('wardAdmin', 'name mobileNumber');

      // Get recent activity logs from coordinator's district (last 10)
      const logs = await ActivityLog.find({ district: session.user.district })
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ timestamp: -1 })
        .limit(10);

      recentLogs.push(...logs);

      // Get recent reports from coordinator's district (last 10)
      const reports = await Response.find({ district: session.user.district })
        .populate('formTemplate', 'title formType')
        .populate('respondent', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ submittedAt: -1 })
        .limit(10);
      
      // Transform reports to match component expectations
      const transformedReports = reports.map(report => ({
        _id: report._id,
        form: {
          title: report.formTemplate?.title || 'Unknown Form',
          type: report.formTemplate?.formType || 'unknown'
        },
        user: {
          name: report.respondent?.name || 'Unknown User',
          role: report.respondent?.role || 'unknown'
        },
        ward: report.ward ? {
          name: report.ward.name,
          district: report.ward.district
        } : null,
        submittedAt: report.submittedAt,
        weekNumber: report.weekNumber,
        year: report.year
      }));
      
      recentReports.push(...transformedReports);

      // Get recent login history from coordinator's district (last 10)
      const logins = await LoginHistory.find({ district: session.user.district })
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ loginTime: -1 })
        .limit(10);

      recentLogins.push(...logins);

      // Add coordinator's wards to stats for detailed view
      stats.coordinatorWards = coordinatorWards.map(ward => ({
        _id: ward._id,
        name: ward.name,
        wardNumber: ward.wardNumber,
        panchayath: ward.panchayath,
        district: ward.district,
        hasAdmin: !!ward.wardAdmin,
        adminName: ward.wardAdmin?.name || null,
        adminMobile: ward.wardAdmin?.mobileNumber || null,
        population: ward.population,
        area: ward.area,
        isActive: ward.isActive
      }));

      // Add pending reports list to stats
      stats.pendingReportsList = pendingReportsList;

    } else if (session.user.role === 'wardAdmin') {
      // Ward Admin Dashboard Stats
      
      // Get ward admin's wards
      const userWards = await Ward.find({ wardAdmin: session.user.id });
      const wardIds = userWards.map(ward => ward._id);
      
      // Get clusters count for the ward admin's wards
      const Cluster = require('../../../models/Cluster').default;
      const totalClusters = await Cluster.countDocuments({ 
        ward: { $in: wardIds } 
      });
      stats.clusters = totalClusters;

      // Get the district from the ward admin's ward
      const userDistrict = userWards.length > 0 ? userWards[0].district : session.user.district;

      // Count all reports submitted by this ward admin
      const totalSubmittedReports = await Response.countDocuments({ 
        respondent: session.user.id 
      });
      stats.reports = totalSubmittedReports;

      // Count pending reports (active forms that haven't been submitted)
      const activeForms = await FormTemplate.find({
        formType: 'wardReport',
        isActive: true,
        enableDateTime: { $lte: new Date() },
        closeDateTime: { $gte: new Date() }
      });

      // Check which forms have been submitted by this user
      const submittedFormIds = await Response.distinct('formTemplate', {
        respondent: session.user.id
      });

      const pendingReports = activeForms.filter(form =>
        !submittedFormIds.some(id => id.toString() === form._id.toString())
      ).length;

      stats.pendingReports = pendingReports;

      // Get recent activity logs for ward admin (last 10)
      const logs = await ActivityLog.find({
        $or: [
          { user: session.user.id },
          { district: userDistrict }
        ]
      })
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ timestamp: -1 })
        .limit(10);

      recentLogs.push(...logs);

      // Get recent reports by ward admin (last 10)
      const reports = await Response.find({ respondent: session.user.id })
        .populate('formTemplate', 'title formType')
        .populate('respondent', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ submittedAt: -1 })
        .limit(10);

      // Transform the reports to match the expected format
      const transformedReports = reports.map(report => ({
        ...report.toObject(),
        form: report.formTemplate, // Map formTemplate to form for compatibility
        user: report.respondent     // Map respondent to user for compatibility
      }));

      recentReports.push(...transformedReports);

      // Get recent login history for ward admin (last 10)
      const logins = await LoginHistory.find({ user: session.user.id })
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ loginTime: -1 })
        .limit(10);

      recentLogins.push(...logins);
    }

    return res.status(200).json({
      stats,
      recentLogs,
      recentReports,
      recentLogins
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ message: 'Error fetching dashboard data' });
  }
}