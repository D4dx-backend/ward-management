import { getSession } from 'next-auth/react';
import connectToDatabase from '../../lib/mongodb';
import FormTemplate from '../../models/FormTemplate';
import Response from '../../models/Response';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  try {
    // Get all forms
    const forms = await FormTemplate.find({}).sort({ createdAt: -1 });
    
    // Get all responses
    const responses = await Response.find({})
      .populate('formTemplate', 'title')
      .populate('respondent', 'name email')
      .sort({ submittedAt: -1 });
    
    return res.status(200).json({
      forms: forms.map(form => ({
        id: form._id,
        title: form.title,
        formType: form.formType,
        weekNumber: form.weekNumber,
        year: form.year,
        isActive: form.isActive,
        enableDateTime: form.enableDateTime,
        closeDateTime: form.closeDateTime,
        createdAt: form.createdAt,
        fieldsCount: form.fields.length
      })),
      responses: responses.map(response => ({
        id: response._id,
        formTemplateId: response.formTemplate?._id,
        formTitle: response.formTemplate?.title,
        respondentName: response.respondent?.name,
        respondentEmail: response.respondent?.email,
        district: response.district,
        submittedAt: response.submittedAt,
        responseKeys: Object.keys(response.responses || {})
      })),
      summary: {
        totalForms: forms.length,
        activeForms: forms.filter(f => f.isActive).length,
        totalResponses: responses.length,
        formsWithResponses: [...new Set(responses.map(r => r.formTemplate?._id?.toString()))].length
      }
    });

  } catch (error) {
    console.error('Error checking forms:', error);
    return res.status(500).json({ message: 'Error checking forms', error: error.message });
  }
}