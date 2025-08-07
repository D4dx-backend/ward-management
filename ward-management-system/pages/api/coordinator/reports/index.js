import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import Response from '../../../../models/Response';
import FormTemplate from '../../../../models/FormTemplate';

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

    const { type = 'submitted', limit = 10 } = req.query;
    const coordinatorId = session.user.id;

    let reports = [];

    if (type === 'submitted') {
      // Get submitted coordinator reports
      reports = await Response.find({
        respondent: coordinatorId,
        formType: 'coordinatorReport'
      })
      .populate('formTemplate', 'title formType weekNumber year fields')
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit));

      reports = reports.map(report => ({
        _id: report._id,
        formTemplate: report.formTemplate,
        title: report.formTemplate?.title,
        formType: report.formType,
        weekNumber: report.weekNumber,
        year: report.year,
        district: report.district,
        submittedAt: report.submittedAt,
        responses: report.responses
      }));

    } else if (type === 'pending') {
      // Get pending coordinator reports
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      // Calculate current week number (ISO week)
      const startOfYear = new Date(currentYear, 0, 1);
      const pastDaysOfYear = (currentDate - startOfYear) / 86400000;
      const currentWeek = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

      // Get all active coordinator forms
      const activeForms = await FormTemplate.find({
        formType: 'coordinatorReport',
        isPublished: true,
        isActive: true,
        enableDateTime: { $lte: currentDate },
        closeDateTime: { $gte: currentDate }
      }).sort({ createdAt: -1 });

      // Get all responses by this coordinator
      const coordinatorResponses = await Response.find({
        respondent: coordinatorId,
        formType: 'coordinatorReport'
      }).select('formTemplate weekNumber year');

      // Create a map of submitted forms for efficient lookup
      const submittedFormsMap = new Map();
      coordinatorResponses.forEach(response => {
        if (response.formTemplate) {
          const key = `${response.formTemplate}_${response.weekNumber}_${response.year}`;
          submittedFormsMap.set(key, true);
        }
      });

      // Filter out forms that have been submitted
      reports = activeForms.filter(form => {
        const key = `${form._id}_${form.weekNumber}_${form.year}`;
        return !submittedFormsMap.has(key);
      }).slice(0, parseInt(limit));

      reports = reports.map(form => ({
        _id: form._id,
        title: form.title,
        formType: form.formType,
        weekNumber: form.weekNumber,
        year: form.year,
        enableDateTime: form.enableDateTime,
        closeDateTime: form.closeDateTime,
        fields: form.fields,
        isSubmitted: false
      }));
    }

    res.status(200).json({
      reports,
      type,
      total: reports.length
    });

  } catch (error) {
    console.error('Error fetching coordinator reports:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}