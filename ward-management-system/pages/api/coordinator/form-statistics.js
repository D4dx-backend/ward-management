import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import FormTemplate from '../../../models/FormTemplate';
import WardBasicForm from '../../../models/WardBasicForm';
import Response from '../../../models/Response';
import WardBasicData from '../../../models/WardBasicData';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Set CORS headers for production
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('=== COORDINATOR FORM STATISTICS API ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Request method:', req.method);

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
      console.log('No session found');
      return res.status(401).json({ message: 'Unauthorized - No session' });
    }

    if (!session.user) {
      console.log('No user in session');
      return res.status(401).json({ message: 'Unauthorized - No user in session' });
    }

    console.log('User role:', session.user.role);
    console.log('User ID:', session.user.id);

    if (session.user.role !== 'coordinator') {
      console.log('Access denied - not coordinator role');
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    // Connect to database with error handling
    try {
      await dbConnect();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(503).json({ 
        message: 'Database connection failed',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Service unavailable'
      });
    }

    await dbConnect();

    const { timeframe = 'all' } = req.query;
    const coordinatorId = session.user.id;

    console.log('Coordinator ID:', coordinatorId);
    console.log('Timeframe:', timeframe);

    // Validate coordinator ID
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(coordinatorId)) {
      console.error('Invalid coordinator ID format:', coordinatorId);
      return res.status(400).json({ message: 'Invalid coordinator ID format' });
    }

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = null;

    switch (timeframe) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last-month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = lastMonth;
        now.setTime(lastMonthEnd.getTime());
        break;
      case 'last-3-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      default:
        startDate = null;
    }

    // Get coordinator's wards with timeout handling
    let wards;
    try {
      console.log('Fetching coordinator wards...');
      
      const wardsQuery = Ward.find({ 
        coordinator: new mongoose.Types.ObjectId(coordinatorId), 
        isActive: { $ne: false }
      })
      .populate('wardAdmin', 'name email mobileNumber lastLogin')
      .sort({ name: 1 })
      .lean();

      const wardsPromise = wardsQuery.exec();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Wards query timeout')), 10000)
      );

      wards = await Promise.race([wardsPromise, timeoutPromise]);
      console.log(`Found ${wards.length} wards for coordinator`);
      
    } catch (wardsError) {
      console.error('Error fetching coordinator wards:', wardsError);
      return res.status(500).json({ 
        message: 'Failed to fetch coordinator wards',
        error: process.env.NODE_ENV === 'development' ? wardsError.message : 'Query error'
      });
    }

    const wardIds = wards.map(w => w._id);

    // Get all active form templates and ward basic forms
    const [formTemplates, wardBasicForms] = await Promise.all([
      FormTemplate.find({ 
        isActive: true,
        isPublished: true 
      }).populate('createdBy', 'name'),
      WardBasicForm.find({ isActive: true }).populate('createdBy', 'name')
    ]);
    
    // Combine all forms for total count
    const allForms = [...formTemplates, ...wardBasicForms];

    // Build date filter for responses
    let dateFilter = {};
    if (startDate) {
      dateFilter.submittedAt = { $gte: startDate, $lte: now };
    }

    // Get all responses for coordinator's wards with detailed population
    const responses = await Response.find({
      ward: { $in: wardIds },
      ...dateFilter
    })
    .populate('formTemplate', 'title formType weekNumber year enableDateTime closeDateTime')
    .populate('ward', 'name wardNumber')
    .populate('respondent', 'name email')
    .sort({ submittedAt: -1 });

    // Get ward basic data submissions with detailed population
    const wardBasicDataSubmissions = await WardBasicData.find({
      ward: { $in: wardIds },
      ...(startDate ? { submittedAt: { $gte: startDate, $lte: now } } : {})
    })
    .populate('form', 'title description')
    .populate('ward', 'name wardNumber')
    .populate('submittedBy', 'name email');

    // Combine all submissions with enhanced data
    const allSubmissions = [
      ...responses.map(r => ({
        _id: r._id,
        ward: r.ward,
        form: r.formTemplate,
        submittedAt: r.submittedAt,
        submittedBy: r.respondent,
        status: 'submitted',
        type: 'response',
        formType: r.formTemplate?.formType || 'wardReport',
        weekNumber: r.weekNumber,
        year: r.year,
        responses: r.responses
      })),
      ...wardBasicDataSubmissions.map(w => ({
        _id: w._id,
        ward: w.ward,
        form: w.form,
        submittedAt: w.submittedAt,
        submittedBy: w.submittedBy,
        status: w.status,
        type: 'ward-basic-data',
        formType: 'wardBasic',
        data: w.data,
        clusterData: w.clusterData
      }))
    ];

    // Calculate overview statistics
    const totalWards = wards.length;
    const totalForms = allForms.length;
    const totalSubmissions = allSubmissions.length;
    const expectedSubmissions = totalWards * totalForms;
    const pendingSubmissions = expectedSubmissions - totalSubmissions;
    const completionRate = expectedSubmissions > 0 ? Math.round((totalSubmissions / expectedSubmissions) * 100) : 0;

    // Calculate ward-wise statistics
    const wardWiseStats = await Promise.all(
      wards.map(async (ward) => {
        const wardSubmissions = allSubmissions.filter(s => s.ward._id.toString() === ward._id.toString());
        const submittedForms = wardSubmissions.length;
        const pendingForms = totalForms - submittedForms;
        const wardCompletionRate = totalForms > 0 ? Math.round((submittedForms / totalForms) * 100) : 0;
        
        const lastSubmission = wardSubmissions.length > 0 
          ? wardSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]
          : null;

        // Get form breakdown for this ward
        const formBreakdown = await Promise.all(
          allForms.map(async (form) => {
            const submission = wardSubmissions.find(s => s.form._id.toString() === form._id.toString());
            
            if (submission) {
              return {
                formId: form._id,
                formTitle: form.title,
                formType: submission.formType,
                status: submission.status,
                submittedAt: submission.submittedAt,
                submittedBy: submission.submittedBy,
                submissionId: submission._id,
                type: submission.type
              };
            } else {
              // Check if it's overdue based on form close date
              const isOverdue = form.closeDateTime && new Date() > new Date(form.closeDateTime);
              return {
                formId: form._id,
                formTitle: form.title,
                formType: form.formType || 'wardBasic',
                status: isOverdue ? 'overdue' : 'pending',
                dueDate: form.closeDateTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              };
            }
          })
        );

        return {
          wardId: ward._id,
          wardName: ward.name,
          wardNumber: ward.wardNumber,
          totalForms,
          submittedForms,
          pendingForms,
          completionRate: wardCompletionRate,
          lastSubmission: lastSubmission?.submittedAt,
          wardAdmin: {
            name: ward.wardAdmin?.name,
            email: ward.wardAdmin?.email
          },
          formBreakdown
        };
      })
    );

    // Calculate form-wise statistics
    const formWiseStats = await Promise.all(
      allForms.map(async (form) => {
        const formSubmissions = allSubmissions.filter(s => s.form._id.toString() === form._id.toString());
        const submittedCount = formSubmissions.length;
        const pendingCount = totalWards - submittedCount;
        const overdueCount = 0; // Simplified for now
        const formCompletionRate = totalWards > 0 ? Math.round((submittedCount / totalWards) * 100) : 0;

        // Calculate average submission time (simplified)
        const avgSubmissionTime = formSubmissions.length > 0 ? '2.5 days' : 'N/A';

        // Get ward breakdown for this form
        const wardBreakdown = await Promise.all(
          wards.map(async (ward) => {
            const submission = formSubmissions.find(s => s.ward._id.toString() === ward._id.toString());
            
            if (submission) {
              return {
                wardId: ward._id,
                wardName: ward.name,
                wardNumber: ward.wardNumber,
                status: submission.status,
                submittedAt: submission.submittedAt,
                submittedBy: submission.submittedBy,
                submissionId: submission._id,
                type: submission.type
              };
            } else {
              // Check if it's overdue based on form close date
              const isOverdue = form.closeDateTime && new Date() > new Date(form.closeDateTime);
              return {
                wardId: ward._id,
                wardName: ward.name,
                wardNumber: ward.wardNumber,
                status: isOverdue ? 'overdue' : 'pending',
                dueDate: form.closeDateTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              };
            }
          })
        );

        return {
          formId: form._id,
          formTitle: form.title,
          formType: form.type || 'one-time',
          totalWards,
          submittedCount,
          pendingCount,
          overdueCount,
          completionRate: formCompletionRate,
          avgSubmissionTime,
          wardBreakdown
        };
      })
    );

    const statistics = {
      overview: {
        totalWards,
        totalForms,
        totalSubmissions,
        pendingSubmissions,
        completionRate
      },
      wardWiseStats: wardWiseStats.sort((a, b) => b.completionRate - a.completionRate),
      formWiseStats: formWiseStats.sort((a, b) => b.completionRate - a.completionRate),
      timeframe,
      generatedAt: new Date().toISOString()
    };

    res.status(200).json(statistics);

  } catch (error) {
    console.error('Error fetching form statistics:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      coordinatorId: session?.user?.id
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}