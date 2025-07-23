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
        .populate('ward', 'name district')
        .sort({ timestamp: -1 })
        .limit(10);

      recentLogs.push(...logs);

      // Get recent reports (last 10)
      const reports = await Response.find()
        .populate('formTemplate', 'title')
        .populate('respondent', 'name role')
        .populate('ward', 'name district')
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
        .populate('ward', 'name district')
        .sort({ loginTime: -1 })
        .limit(10);

      recentLogins.push(...logins);

    } else if (session.user.role === 'coordinator') {
      // Coordinator Dashboard Stats
      const [wards, responses] = await Promise.all([
        Ward.countDocuments({ district: session.user.district }),
        Response.countDocuments({ district: session.user.district })
      ]);

      stats.wards = wards;
      stats.reports = responses;

      // Get recent activity logs from coordinator's district (last 10)
      const logs = await ActivityLog.find({ district: session.user.district })
        .populate('user', 'name role')
        .populate('ward', 'name district')
        .sort({ timestamp: -1 })
        .limit(10);

      recentLogs.push(...logs);

      // Get recent reports from coordinator's district (last 10)
      const reports = await Response.find({ district: session.user.district })
        .populate('formTemplate', 'title')
        .populate('respondent', 'name role')
        .populate('ward', 'name district')
        .sort({ submittedAt: -1 })
        .limit(10);

      // Transform the reports to match the expected format
      const transformedReports = reports.map(report => ({
        ...report.toObject(),
        form: report.formTemplate, // Map formTemplate to form for compatibility
        user: report.respondent     // Map respondent to user for compatibility
      }));

      recentReports.push(...transformedReports);

      // Get recent login history from coordinator's district (last 10)
      const logins = await LoginHistory.find({ district: session.user.district })
        .populate('user', 'name role')
        .populate('ward', 'name district')
        .sort({ loginTime: -1 })
        .limit(10);

      recentLogins.push(...logins);

    } else if (session.user.role === 'wardAdmin') {
      // Ward Admin Dashboard Stats

      // Get ward admin's wards
      const userWards = await Ward.find({ wardAdmin: session.user.id });
      const wardIds = userWards.map(ward => ward._id);

      // Get the district from the ward admin's ward (for logging purposes)
      const userDistrict = userWards.length > 0 ? userWards[0].district : session.user.district;

      // Count submitted reports (responses that exist)
      const submittedReports = await Response.countDocuments({
        respondent: session.user.id,
        formType: 'wardReport'
      });

      // Count pending reports (active forms that haven't been submitted)
      const activeForms = await FormTemplate.find({
        formType: 'wardReport',
        isActive: true,
        enableDateTime: { $lte: new Date() },
        closeDateTime: { $gte: new Date() }
      });

      // Check which forms have been submitted
      const submittedFormIds = await Response.distinct('formTemplate', {
        respondent: session.user.id,
        formType: 'wardReport'
      });

      const pendingReports = activeForms.filter(form =>
        !submittedFormIds.some(id => id.toString() === form._id.toString())
      ).length;

      stats.submittedReports = submittedReports;
      stats.pendingReports = pendingReports;
      stats.totalReports = submittedReports + pendingReports;

      // Get recent activity logs for ward admin (last 10)
      const logs = await ActivityLog.find({
        $or: [
          { user: session.user.id },
          { district: userDistrict }
        ]
      })
        .populate('user', 'name role')
        .populate('ward', 'name district')
        .sort({ timestamp: -1 })
        .limit(10);

      recentLogs.push(...logs);

      // Get recent reports by ward admin (last 10)
      const reports = await Response.find({ respondent: session.user.id })
        .populate('formTemplate', 'title')
        .populate('respondent', 'name role')
        .populate('ward', 'name district')
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