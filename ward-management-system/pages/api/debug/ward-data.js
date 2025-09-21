import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import Response from '../../../models/Response';
import Cluster from '../../../models/Cluster';
import WardBasicData from '../../../models/WardBasicData';
import RecurringQuestion from '../../../models/RecurringQuestion';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Only allow stateAdmin and coordinator
    if (!['stateAdmin', 'coordinator'].includes(session.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await dbConnect();

    const { wardId } = req.query;

    if (!wardId) {
      return res.status(400).json({ message: 'Ward ID is required' });
    }

    console.log('=== DEBUGGING WARD DATA ===');
    console.log('Ward ID:', wardId);
    console.log('User:', session.user.role, session.user.id);

    // Test all data sources
    const debugData = {};

    // 1. Ward Basic Data
    try {
      const ward = await Ward.findById(wardId)
        .populate('coordinator', 'name email mobileNumber district lastLogin')
        .populate('wardAdmin', 'name email mobileNumber role lastLogin')
        .lean();
      debugData.wardBasicData = {
        found: !!ward,
        data: ward
      };
    } catch (error) {
      debugData.wardBasicData = {
        found: false,
        error: error.message
      };
    }

    // 2. All Responses for this ward
    try {
      const responses = await Response.find({ ward: wardId })
        .populate('formTemplate', 'title formType weekNumber year')
        .populate('respondent', 'name email district role')
        .sort({ submittedAt: -1 })
        .lean();

      const wardAdminResponses = responses.filter(r => r.respondent?.role === 'wardAdmin');
      const coordinatorResponses = responses.filter(r => r.respondent?.role === 'coordinator');

      debugData.responses = {
        total: responses.length,
        wardAdminReports: wardAdminResponses.length,
        coordinatorReports: coordinatorResponses.length,
        allResponses: responses.map(r => ({
          id: r._id,
          title: r.formTemplate?.title,
          respondent: r.respondent?.name,
          role: r.respondent?.role,
          week: r.weekNumber,
          year: r.year,
          submittedAt: r.submittedAt
        }))
      };
    } catch (error) {
      debugData.responses = {
        found: false,
        error: error.message
      };
    }

    // 3. Clusters
    try {
      const clusters = await Cluster.find({ ward: wardId })
        .populate('ward', 'name district panchayath')
        .lean();
      debugData.clusters = {
        count: clusters.length,
        data: clusters
      };
    } catch (error) {
      debugData.clusters = {
        found: false,
        error: error.message
      };
    }

    // 4. Advanced Data
    try {
      const advancedData = await WardBasicData.find({ ward: wardId })
        .populate('ward', 'name wardNumber panchayath district')
        .populate('form', 'title version fields')
        .populate('submittedBy', 'name email')
        .sort({ submittedAt: -1 })
        .lean();
      debugData.advancedData = {
        count: advancedData.length,
        data: advancedData
      };
    } catch (error) {
      debugData.advancedData = {
        found: false,
        error: error.message
      };
    }

    // 5. House Visit Data (Cluster Visits)
    try {
      const ClusterVisit = require('../../../models/ClusterVisit').default;
      const clusterVisits = await ClusterVisit.find({ ward: wardId })
        .populate('ward', 'name wardNumber')
        .sort({ createdAt: -1 })
        .lean();
      
      debugData.houseVisits = {
        count: clusterVisits.length,
        data: clusterVisits.map(cv => ({
          id: cv._id,
          clusterName: cv.clusterName,
          totalHouses: cv.totalHouses,
          housesVisited: cv.housesVisited,
          visitDays: cv.visitDays,
          status: cv.status,
          lastUpdated: cv.updatedAt
        }))
      };
    } catch (error) {
      debugData.houseVisits = {
        found: false,
        error: error.message
      };
    }

    // 6. Recurring Questions Analysis
    try {
      const recurringQuestions = await RecurringQuestion.find({ isActive: true });
      const responses = await Response.find({ ward: wardId })
        .populate('formTemplate', 'title')
        .populate('respondent', 'name role')
        .sort({ submittedAt: -1 })
        .limit(50)
        .lean();

      const recurringResponses = [];
      responses.forEach(response => {
        if (response.responses) {
          Object.entries(response.responses).forEach(([question, answer]) => {
            if (question.toLowerCase().includes('recurring') || 
                question.toLowerCase().includes('weekly') ||
                question.toLowerCase().includes('regular')) {
              recurringResponses.push({
                question,
                answer,
                formTitle: response.formTemplate?.title,
                submittedAt: response.submittedAt,
                user: response.respondent
              });
            }
          });
        }
      });

      debugData.recurringQuestions = {
        totalQuestions: recurringQuestions.length,
        responses: recurringResponses.length,
        data: recurringResponses
      };
    } catch (error) {
      debugData.recurringQuestions = {
        found: false,
        error: error.message
      };
    }

    // Summary
    debugData.summary = {
      wardExists: !!debugData.wardBasicData?.found,
      hasReports: debugData.responses?.total > 0,
      hasClusters: debugData.clusters?.count > 0,
      hasAdvancedData: debugData.advancedData?.count > 0,
      hasHouseVisits: debugData.houseVisits?.count > 0,
      hasRecurringData: debugData.recurringQuestions?.responses > 0
    };

    console.log('Debug summary:', debugData.summary);

    res.status(200).json(debugData);

  } catch (error) {
    console.error('Error in ward data debug:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
