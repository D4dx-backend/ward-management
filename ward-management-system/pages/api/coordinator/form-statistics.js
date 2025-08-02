import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import FormTemplate from '../../../models/FormTemplate';
import WardBasicForm from '../../../models/WardBasicForm';
import Response from '../../../models/Response';
import WardBasicData from '../../../models/WardBasicData';

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

    const { timeframe = 'all' } = req.query;
    const coordinatorId = session.user.id;

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

    // Get coordinator's wards
    const wards = await Ward.find({ 
      coordinator: coordinatorId, 
      isActive: true 
    })
    .populate('wardAdmin', 'name email mobileNumber lastLogin')
    .sort({ name: 1 });

    const wardIds = wards.map(w => w._id);

    // Get all active form templates and ward basic forms
    const [formTemplates, wardBasicForms] = await Promise.all([
      FormTemplate.find({ isActive: true }),
      WardBasicForm.find({ isActive: true })
    ]);
    
    // Combine all forms for total count
    const allForms = [...formTemplates, ...wardBasicForms];

    // Build date filter for responses
    let dateFilter = {};
    if (startDate) {
      dateFilter.submittedAt = { $gte: startDate, $lte: now };
    }

    // Get all responses for coordinator's wards
    const responses = await Response.find({
      ward: { $in: wardIds },
      ...dateFilter
    })
    .populate('formTemplate', 'title type')
    .populate('ward', 'name wardNumber')
    .sort({ submittedAt: -1 });

    // Get ward basic data submissions
    const wardBasicDataSubmissions = await WardBasicData.find({
      ward: { $in: wardIds },
      ...(startDate ? { submittedAt: { $gte: startDate, $lte: now } } : {})
    })
    .populate('form', 'title type')
    .populate('ward', 'name wardNumber');

    // Combine all submissions
    const allSubmissions = [
      ...responses.map(r => ({
        _id: r._id,
        ward: r.ward,
        form: r.formTemplate,
        submittedAt: r.submittedAt,
        status: 'submitted',
        type: 'response'
      })),
      ...wardBasicDataSubmissions.map(w => ({
        _id: w._id,
        ward: w.ward,
        form: w.form,
        submittedAt: w.submittedAt,
        status: 'submitted',
        type: 'ward-basic-data'
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
                status: 'submitted',
                submittedAt: submission.submittedAt
              };
            } else {
              // Check if it's overdue (this would need more complex logic based on form due dates)
              const isOverdue = false; // Simplified for now
              return {
                formId: form._id,
                formTitle: form.title,
                status: isOverdue ? 'overdue' : 'pending',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Mock due date
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
                status: 'submitted',
                submittedAt: submission.submittedAt
              };
            } else {
              // Check if it's overdue (simplified)
              const isOverdue = false;
              return {
                wardId: ward._id,
                wardName: ward.name,
                status: isOverdue ? 'overdue' : 'pending',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Mock due date
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