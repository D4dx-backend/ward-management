import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || session.user.role !== 'wardAdmin') {
      return res.status(403).json({ error: 'Access denied - Only ward admin can debug dashboard' });
    }

    await connectToDatabase();

    const debugInfo = {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      userRole: session.user.role,
      checks: {}
    };

    // 1. Check user's wards
    const userWards = await Ward.find({ wardAdmin: session.user.id })
      .select('_id name district wardNumber')
      .lean();
    
    debugInfo.checks.userWards = {
      count: userWards.length,
      wards: userWards
    };

    // 2. Check user's responses
    const userResponses = await Response.find({ respondent: session.user.id })
      .select('submittedAt weekNumber year formTemplate ward')
      .populate('formTemplate', 'title formType weekNumber year')
      .populate('ward', 'name district')
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean();

    debugInfo.checks.userResponses = {
      count: userResponses.length,
      responses: userResponses.map(r => ({
        id: r._id,
        submittedAt: r.submittedAt,
        formTitle: r.formTemplate?.title,
        formType: r.formTemplate?.formType,
        weekNumber: r.weekNumber,
        year: r.year,
        wardName: r.ward?.name
      }))
    };

    // 3. Check active forms for ward admin
    const activeForms = await FormTemplate.find({
      formType: 'wardReport',
      isPublished: true,
      enableDateTime: { $lte: new Date() },
      closeDateTime: { $gte: new Date() }
    })
      .select('title weekNumber year enableDateTime closeDateTime')
      .sort({ createdAt: -1 })
      .lean();

    debugInfo.checks.activeForms = {
      count: activeForms.length,
      forms: activeForms
    };

    // 4. Check pending forms
    const submittedFormsMap = new Map();
    userResponses.forEach(response => {
      if (response.formTemplate) {
        const key = `${response.formTemplate._id}_${response.weekNumber}_${response.year}`;
        submittedFormsMap.set(key, true);
      }
    });

    const pendingForms = activeForms.filter(form => {
      const key = `${form._id}_${form.weekNumber}_${form.year}`;
      return !submittedFormsMap.has(key);
    });

    debugInfo.checks.pendingForms = {
      count: pendingForms.length,
      forms: pendingForms
    };

    // 5. Test dashboard stats API call
    try {
      const axios = require('axios');
      const baseUrl = req.headers.host ? `http://${req.headers.host}` : 'http://localhost:3000';
      
      const dashboardResponse = await axios.get(`${baseUrl}/api/dashboard/stats?refresh=true`, {
        headers: {
          cookie: req.headers.cookie
        }
      });

      debugInfo.checks.dashboardApi = {
        status: 'success',
        statsKeys: Object.keys(dashboardResponse.data.stats || {}),
        recentReportsCount: dashboardResponse.data.recentReports?.length || 0,
        recentReportsSample: (dashboardResponse.data.recentReports || []).slice(0, 3).map(r => ({
          id: r._id,
          formTitle: r.form?.title || r.formTemplate?.title,
          submittedAt: r.submittedAt
        }))
      };
    } catch (apiError) {
      debugInfo.checks.dashboardApi = {
        status: 'error',
        error: apiError.message
      };
    }

    // 6. Summary and recommendations
    debugInfo.summary = {
      hasWards: userWards.length > 0,
      hasResponses: userResponses.length > 0,
      hasPendingForms: pendingForms.length > 0,
      totalSubmittedReports: userResponses.length,
      totalPendingReports: pendingForms.length
    };

    debugInfo.recommendations = [];
    
    if (userWards.length === 0) {
      debugInfo.recommendations.push('User is not assigned to any wards - contact coordinator');
    }
    
    if (userResponses.length === 0) {
      debugInfo.recommendations.push('User has not submitted any reports yet');
    }
    
    if (pendingForms.length > 0) {
      debugInfo.recommendations.push(`User has ${pendingForms.length} pending form(s) to submit`);
    }

    res.status(200).json(debugInfo);

  } catch (error) {
    console.error('Ward dashboard debug error:', error);
    res.status(500).json({ 
      error: 'Debug failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}