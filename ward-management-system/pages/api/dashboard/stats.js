import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import Ward from '../../../models/Ward';
import FormTemplate from '../../../models/FormTemplate';
import Response from '../../../models/Response';
import ActivityLog from '../../../models/ActivityLog';
import LoginHistory from '../../../models/LoginHistory';
import Instruction from '../../../models/Instruction';
import Cluster from '../../../models/Cluster';
import { getServerCache, setServerCache } from '../../../lib/serverCache';

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
    const cacheKey = `dashboard-stats:${session.user.role}:${session.user.id || 'na'}:${session.user.district || 'na'}`;
    const forceRefresh = req.query.refresh === 'true';
    
    // For ward admins, use shorter cache or bypass cache if refresh requested
    const shouldUseCache = !forceRefresh && session.user.role !== 'wardAdmin';
    
    if (shouldUseCache) {
      const cached = getServerCache(cacheKey);
      if (cached) {
        console.log(`Returning cached dashboard data for ${session.user.role}`);
        return res.status(200).json(cached);
      }
    }
    
    console.log(`Fetching fresh dashboard data for ${session.user.role} (cache bypassed: ${!shouldUseCache})`);

    const stats = {};
    const recentLogs = [];
    const recentReports = [];
    const recentLogins = [];

    if (session.user.role === 'stateAdmin') {
      // State Admin Dashboard Stats
      // Debug: Log the exact query being used
      const wardQuery = { isActive: { $ne: false } };
      console.log('Dashboard ward count query:', JSON.stringify(wardQuery));
      
      const [users, wards, forms, responses, clusters] = await Promise.all([
        User.countDocuments(),
        Ward.countDocuments(wardQuery), // Only count active wards
        FormTemplate.countDocuments({ isPublished: true }),
        Response.countDocuments(),
        Cluster.countDocuments()
      ]);

      console.log('Dashboard ward count result:', wards);

      stats.users = users;
      stats.wards = wards;
      stats.forms = forms;
      stats.reports = responses;
      stats.totalUsers = users;
      stats.totalWards = wards;
      stats.totalForms = forms;
      stats.totalClusters = clusters;

      // Get recent activity logs (last 10)
      const logs = await ActivityLog.find()
        .select('-__v')
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      recentLogs.push(...logs);

      // Get recent reports (last 10)
      const reports = await Response.find()
        .select('submittedAt weekNumber year formTemplate respondent ward')
        .populate('formTemplate', 'title formType')
        .populate('respondent', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean();

      // Transform the reports to match the expected format (reports are already lean objects)
      const transformedReports = reports.map(report => ({
        ...report,
        form: report.formTemplate, // Map formTemplate to form for compatibility
        user: report.respondent     // Map respondent to user for compatibility
      }));

      recentReports.push(...transformedReports);

      // Get recent login history (last 10)
      const logins = await LoginHistory.find()
        .select('loginTime user ward')
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ loginTime: -1 })
        .limit(10)
        .lean();

      recentLogins.push(...logins);

    } else if (session.user.role === 'coordinator') {
      // Coordinator Dashboard Stats - only count wards assigned to this coordinator
      const [totalWards, activeWards, totalReports] = await Promise.all([
        Ward.countDocuments({ coordinator: session.user.id }),
        Ward.countDocuments({ coordinator: session.user.id, wardAdmin: { $ne: null } }),
        Response.countDocuments({ district: session.user.district })
      ]);

      // Calculate pending reports for current week
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      // Calculate current week number (ISO week)
      const startOfYear = new Date(currentYear, 0, 1);
      const pastDaysOfYear = (currentDate - startOfYear) / 86400000;
      const currentWeek = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
      
      // Get Ward Incharges in coordinator's district
      const wardAdmins = await User.find({ 
        role: 'wardAdmin', 
        district: session.user.district 
      }).select('_id name').lean();
      
      const wardAdminIds = wardAdmins.map(admin => admin._id);
      
      // Get all published forms
      const activeFormsList = await FormTemplate.find({ isPublished: true });
      
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
          }).select('respondent').lean();

          const submittedAdminIds = submittedThisWeek.map(r => r.respondent.toString());
          
          // Find Ward Incharges who haven't submitted this week
          const pendingAdmins = wardAdmins.filter(admin => 
            !submittedAdminIds.includes(admin._id.toString())
          );
          
          const pendingAdminIds = pendingAdmins.map(a => a._id);
          const pendingAdminWards = await Ward.find({ wardAdmin: { $in: pendingAdminIds } })
            .select('name wardAdmin')
            .lean();
          const wardByAdminId = new Map(pendingAdminWards.map(w => [w.wardAdmin.toString(), w.name]));

          for (const admin of pendingAdmins) {
            const wardName = wardByAdminId.get(admin._id.toString());
            if (wardName) {
              pendingReportsList.push({
                formTitle: form.title,
                formType: form.formType,
                adminName: admin.name,
                wardName,
                dueDate: form.dueDate || null,
                weekNumber: currentWeek,
                year: currentYear
              });
              pendingReports += 1;
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
      })
        .select('name wardNumber panchayath district wardAdmin population area isActive isSittingWard')
        .populate('wardAdmin', 'name mobileNumber')
        .lean();

      // Get cluster counts for each ward
      const Cluster = require('../../../models/Cluster').default;
      const wardIds = coordinatorWards.map(w => w._id);
      const clusterCountAgg = await Cluster.aggregate([
        { $match: { ward: { $in: wardIds }, isActive: true } },
        { $group: { _id: '$ward', count: { $sum: 1 } } }
      ]);
      const wardClusterCounts = clusterCountAgg.map(({ _id, count }) => ({ wardId: _id, clusterCount: count }));

      // Create a map for quick lookup
      const clusterCountMap = new Map();
      wardClusterCounts.forEach(({ wardId, clusterCount }) => {
        clusterCountMap.set(wardId.toString(), clusterCount);
      });

      // Get recent activity logs from coordinator's district (last 10)
      const logs = await ActivityLog.find({ district: session.user.district })
        .select('-__v')
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      recentLogs.push(...logs);

      // Get recent reports from coordinator's district (last 10)
      const reports = await Response.find({ district: session.user.district })
        .select('submittedAt weekNumber year formTemplate respondent ward')
        .populate('formTemplate', 'title formType')
        .populate('respondent', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean();
      
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
        .select('loginTime user ward')
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ loginTime: -1 })
        .limit(10)
        .lean();

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
        isActive: ward.isActive,
        clusterCount: clusterCountMap.get(ward._id.toString()) || 0
      }));

      // Add pending reports list to stats
      stats.pendingReportsList = pendingReportsList;

    } else if (session.user.role === 'wardAdmin') {
      // Ward Incharge Dashboard Stats
      
      // Get Ward Incharge's wards
      const userWards = await Ward.find({ wardAdmin: session.user.id }).select('_id district').lean();
      const wardIds = userWards.map(ward => ward._id);
      
      // Get clusters count for the Ward Incharge's wards
      const Cluster = require('../../../models/Cluster').default;
      const totalClusters = await Cluster.countDocuments({ 
        ward: { $in: wardIds } 
      });
      stats.clusters = totalClusters;

      // Get instructions count for Ward Incharge
      const ward = userWards[0]; // Get the first ward
      const instructionsCount = await Instruction.countDocuments({
        isActive: true,
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'ward_admins' },
          { targetWards: ward ? ward._id : null }
        ].filter(condition => condition.targetWards !== null)
      });
      stats.instructions = instructionsCount;

      // Get recent instructions for Ward Incharge (last 3)
      const recentInstructions = await Instruction.find({
        isActive: true,
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'ward_admins' },
          { targetWards: ward ? ward._id : null }
        ].filter(condition => condition.targetWards !== null)
      })
        .select('createdAt createdBy title isActive')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      stats.recentInstructions = recentInstructions;

      // Get the district from the Ward Incharge's ward
      const userDistrict = userWards.length > 0 ? userWards[0].district : session.user.district;

      // Count all reports submitted by this Ward Incharge
      const totalSubmittedReports = await Response.countDocuments({ 
        respondent: session.user.id 
      });
      stats.reports = totalSubmittedReports;

      // Count pending reports (active forms that haven't been submitted)
      const activeForms = await FormTemplate.find({
        formType: 'wardReport',
        isPublished: true,
        enableDateTime: { $lte: new Date() },
        closeDateTime: { $gte: new Date() }
      }).sort({ createdAt: -1 }); // Sort by creation date, newest first

      // Get all responses by this user with form template details
      const userResponses = await Response.find({
        respondent: session.user.id
      })
        .select('formTemplate weekNumber year')
        .populate('formTemplate', '_id title weekNumber year')
        .lean();

      // Create a map of submitted forms for efficient lookup
      const submittedFormsMap = new Map();
      userResponses.forEach(response => {
        if (response.formTemplate) {
          const key = `${response.formTemplate._id}_${response.weekNumber}_${response.year}`;
          submittedFormsMap.set(key, true);
        }
      });

      // Filter out forms that have been submitted
      const pendingFormsList = activeForms.filter(form => {
        const key = `${form._id}_${form.weekNumber}_${form.year}`;
        return !submittedFormsMap.has(key);
      });

      stats.pendingReports = pendingFormsList.length;
      stats.pendingFormsList = pendingFormsList.map(form => ({
        _id: form._id,
        title: form.title,
        formType: form.formType,
        enableDateTime: form.enableDateTime,
        closeDateTime: form.closeDateTime,
        weekNumber: form.weekNumber,
        year: form.year,
        isSubmitted: false
      }));

      // Get recent activity logs for Ward Incharge (last 10)
      const logs = await ActivityLog.find({
        $or: [
          { user: session.user.id },
          { district: userDistrict }
        ]
      })
        .select('-__v')
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      recentLogs.push(...logs);

      // Get recent reports by Ward Incharge (last 10) - sorted by submission date, newest first
      const reports = await Response.find({ respondent: session.user.id })
        .select('submittedAt weekNumber year formTemplate respondent ward')
        .populate('formTemplate', 'title formType weekNumber year')
        .populate('respondent', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean();

      console.log(`Found ${reports.length} recent reports for ward admin ${session.user.id}`);

      // Transform the reports to match the expected format (fixed for lean queries)
      const transformedReports = reports.map(report => ({
        _id: report._id,
        submittedAt: report.submittedAt,
        weekNumber: report.weekNumber,
        year: report.year,
        formTemplate: report.formTemplate,
        respondent: report.respondent,
        ward: report.ward,
        // Add compatibility mappings for dashboard component
        form: report.formTemplate, // Map formTemplate to form for compatibility
        user: report.respondent     // Map respondent to user for compatibility
      }));

      console.log(`Transformed ${transformedReports.length} reports for ward admin dashboard`);
      recentReports.push(...transformedReports);

      // Get recent login history for Ward Incharge (last 10)
      const logins = await LoginHistory.find({ user: session.user.id })
        .select('loginTime user ward')
        .populate('user', 'name role')
        .populate({
          path: 'ward',
          select: 'name district',
          strictPopulate: false
        })
        .sort({ loginTime: -1 })
        .limit(10)
        .lean();

      recentLogins.push(...logins);

      // Get ward visits count for Ward Incharge
      const WardVisit = require('../../../models/WardVisit').default;
      const wardVisitsCount = await WardVisit.countDocuments({ 
        ward: { $in: wardIds }
      });
      stats.wardVisits = wardVisitsCount;
    }

    const payload = { stats, recentLogs, recentReports, recentLogins };
    
    // Use shorter cache time for ward admins to ensure fresh data
    const cacheTime = session.user.role === 'wardAdmin' ? 10 * 1000 : 30 * 1000; // 10 seconds for ward admin
    setServerCache(cacheKey, payload, cacheTime);
    
    console.log(`Dashboard data refreshed for ${session.user.role}, cached for ${cacheTime}ms`);
    console.log(`Returning payload with ${recentReports.length} recent reports for ${session.user.role}`);
    
    // Debug logging for ward admin
    if (session.user.role === 'wardAdmin') {
      console.log('Ward admin dashboard payload:', {
        statsKeys: Object.keys(stats),
        recentReportsCount: recentReports.length,
        recentReportsSample: recentReports.slice(0, 2).map(r => ({
          id: r._id,
          formTitle: r.form?.title || r.formTemplate?.title,
          submittedAt: r.submittedAt
        }))
      });
    }
    
    return res.status(200).json(payload);

  } catch (error) {
    console.error('Dashboard stats error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userRole: session?.user?.role,
      userId: session?.user?.id
    });
    return res.status(500).json({ 
      message: 'Error fetching dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}