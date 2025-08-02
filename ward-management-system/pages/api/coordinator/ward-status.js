import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import Response from '../../../models/Response';
import WardVisit from '../../../models/WardVisit';
import WardBasicData from '../../../models/WardBasicData';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (session.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      // Get coordinator's wards with enhanced data
      const wards = await Ward.find({ coordinator: session.user.id })
        .populate('wardAdmin', 'name email mobileNumber lastLogin')
        .populate('coordinator', 'name email')
        .sort({ wardNumber: 1 });

      // Get all ward IDs for this coordinator
      const wardIds = wards.map(ward => ward._id);

      // Fetch related data in parallel
      const [responses, visits, basicData] = await Promise.all([
        Response.find({ ward: { $in: wardIds } })
          .populate('ward', 'name wardNumber')
          .sort({ submittedAt: -1 }),
        WardVisit.find({ ward: { $in: wardIds } })
          .populate('ward', 'name wardNumber')
          .sort({ visitDate: -1 }),
        WardBasicData.find({ ward: { $in: wardIds } })
          .populate('ward', 'name wardNumber')
          .populate('form', 'title')
          .sort({ submittedAt: -1 })
      ]);

      // Process ward data with enhanced information
      const processedWards = wards.map(ward => {
        // Get ward admin's last login
        const lastLogin = ward.wardAdmin?.lastLogin;
        const daysSinceLogin = lastLogin ? 
          Math.floor((new Date() - new Date(lastLogin)) / (1000 * 60 * 60 * 24)) : null;

        // Get last report submission
        const wardResponses = responses.filter(r => r.ward?._id.toString() === ward._id.toString());
        const lastReport = wardResponses.length > 0 ? wardResponses[0] : null;

        // Get last visit
        const wardVisits = visits.filter(v => v.ward?._id.toString() === ward._id.toString());
        const lastVisit = wardVisits.length > 0 ? wardVisits[0] : null;
        const daysSinceLastVisit = lastVisit ? 
          Math.floor((new Date() - new Date(lastVisit.visitDate)) / (1000 * 60 * 60 * 24)) : null;

        // Calculate report completion status
        const currentWeek = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24 * 7));
        const expectedReports = Math.min(currentWeek, 52);
        const submittedReports = wardResponses.length;
        const reportCompletionRate = expectedReports > 0 ? Math.round((submittedReports / expectedReports) * 100) : 0;

        // Determine ward status color based on recent activity
        let statusColor = 'gray';
        if (lastReport) {
          const daysSinceReport = Math.floor((new Date() - new Date(lastReport.submittedAt)) / (1000 * 60 * 60 * 24));
          if (daysSinceReport <= 7) statusColor = 'green';
          else if (daysSinceReport <= 14) statusColor = 'orange';
          else statusColor = 'red';
        }

        // Check form completion status
        const wardForms = basicData.filter(f => f.ward?._id.toString() === ward._id.toString());
        const docketStatus = wardForms.some(f => f.form?.title?.toLowerCase().includes('docket')) ? 'completed' : 'notStarted';
        const basicSurveyStatus = wardForms.some(f => f.form?.title?.toLowerCase().includes('basic') || f.form?.title?.toLowerCase().includes('survey')) ? 'completed' : 'notStarted';

        return {
          ...ward.toObject(),
          lastLogin,
          daysSinceLogin,
          lastReportDate: lastReport?.submittedAt,
          lastVisitDate: lastVisit?.visitDate,
          daysSinceLastVisit,
          submittedReports,
          expectedReports,
          reportCompletionRate,
          statusColor,
          docketStatus,
          basicSurveyStatus,
          recentReportStatus: lastReport ? 'completed' : 'notCompleted'
        };
      });

      // Calculate report consolidation
      const consolidation = {
        docket: { completed: 0, ongoing: 0, notStarted: 0 },
        basicSurvey: { completed: 0, ongoing: 0, notStarted: 0 }
      };

      processedWards.forEach(ward => {
        consolidation.docket[ward.docketStatus]++;
        consolidation.basicSurvey[ward.basicSurveyStatus]++;
      });

      return res.status(200).json({
        wards: processedWards,
        consolidation,
        summary: {
          totalWards: processedWards.length,
          totalResponses: responses.length,
          totalVisits: visits.length,
          totalForms: basicData.length
        }
      });
    } catch (error) {
      console.error('Error fetching coordinator ward status:', error);
      return res.status(500).json({ message: 'Error fetching ward status data', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}