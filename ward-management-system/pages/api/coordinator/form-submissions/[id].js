import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import Ward from '../../../../models/Ward';
import Response from '../../../../models/Response';
import WardBasicData from '../../../../models/WardBasicData';
import FormTemplate from '../../../../models/FormTemplate';
import WardBasicForm from '../../../../models/WardBasicForm';

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

    const { id } = req.query;
    const { type } = req.query; // 'response' or 'ward-basic-data'
    const coordinatorId = session.user.id;

    // Get coordinator's wards for security check
    const coordinatorWards = await Ward.find({ 
      coordinator: coordinatorId, 
      isActive: true 
    }).select('_id');
    
    const wardIds = coordinatorWards.map(w => w._id);

    let submission = null;

    if (type === 'response') {
      submission = await Response.findOne({
        _id: id,
        ward: { $in: wardIds }
      })
      .populate('formTemplate', 'title description fields formType weekNumber year')
      .populate('ward', 'name wardNumber district')
      .populate('respondent', 'name email');

      if (submission) {
        submission = {
          _id: submission._id,
          type: 'response',
          form: {
            _id: submission.formTemplate._id,
            title: submission.formTemplate.title,
            description: submission.formTemplate.description,
            fields: submission.formTemplate.fields,
            formType: submission.formTemplate.formType,
            weekNumber: submission.formTemplate.weekNumber,
            year: submission.formTemplate.year
          },
          ward: submission.ward,
          submittedBy: submission.respondent,
          submittedAt: submission.submittedAt,
          weekNumber: submission.weekNumber,
          year: submission.year,
          district: submission.district,
          responses: submission.responses,
          formType: submission.formType
        };
      }
    } else if (type === 'ward-basic-data') {
      submission = await WardBasicData.findOne({
        _id: id,
        ward: { $in: wardIds }
      })
      .populate('form', 'title description fields')
      .populate('ward', 'name wardNumber district')
      .populate('submittedBy', 'name email');

      if (submission) {
        submission = {
          _id: submission._id,
          type: 'ward-basic-data',
          form: {
            _id: submission.form._id,
            title: submission.form.title,
            description: submission.form.description,
            fields: submission.form.fields
          },
          ward: submission.ward,
          submittedBy: submission.submittedBy,
          submittedAt: submission.submittedAt,
          status: submission.status,
          data: submission.data,
          clusterData: submission.clusterData,
          reviewedBy: submission.reviewedBy,
          reviewedAt: submission.reviewedAt,
          reviewComments: submission.reviewComments
        };
      }
    }

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.status(200).json(submission);

  } catch (error) {
    console.error('Error fetching form submission:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}