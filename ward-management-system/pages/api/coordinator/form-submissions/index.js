import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import Ward from '../../../../models/Ward';
import Response from '../../../../models/Response';
import WardBasicData from '../../../../models/WardBasicData';
import FormTemplate from '../../../../models/FormTemplate';
import WardBasicForm from '../../../../models/WardBasicForm';

export default async function handler(req, res) {
  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    const coordinatorId = session.user.id;

    // Get coordinator's wards for security check
    const coordinatorWards = await Ward.find({ 
      coordinator: coordinatorId, 
      isActive: true 
    }).select('_id');
    
    const wardIds = coordinatorWards.map(w => w._id);

    switch (req.method) {
      case 'GET':
        return await handleGetSubmissions(req, res, wardIds);
      case 'DELETE':
        return await handleDeleteSubmission(req, res, wardIds);
      case 'PUT':
        return await handleUpdateSubmission(req, res, wardIds);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in form submissions API:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function handleGetSubmissions(req, res, wardIds) {
  const { 
    page = 1, 
    limit = 10, 
    wardId, 
    formId, 
    type, 
    status,
    startDate,
    endDate 
  } = req.query;

  // Build filter
  let filter = { ward: { $in: wardIds } };
  
  if (wardId) {
    filter.ward = wardId;
  }
  
  if (startDate || endDate) {
    filter.submittedAt = {};
    if (startDate) filter.submittedAt.$gte = new Date(startDate);
    if (endDate) filter.submittedAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  let submissions = [];
  let totalCount = 0;

  if (!type || type === 'response') {
    let responseFilter = { ...filter };
    if (formId) responseFilter.formTemplate = formId;

    const responses = await Response.find(responseFilter)
      .populate('formTemplate', 'title formType weekNumber year')
      .populate('ward', 'name wardNumber')
      .populate('respondent', 'name email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const responseCount = await Response.countDocuments(responseFilter);

    submissions.push(...responses.map(r => ({
      _id: r._id,
      type: 'response',
      form: r.formTemplate,
      ward: r.ward,
      submittedBy: r.respondent,
      submittedAt: r.submittedAt,
      status: 'submitted',
      weekNumber: r.weekNumber,
      year: r.year
    })));

    totalCount += responseCount;
  }

  if (!type || type === 'ward-basic-data') {
    let wardBasicFilter = { ...filter };
    if (formId) wardBasicFilter.form = formId;
    if (status) wardBasicFilter.status = status;

    const wardBasicData = await WardBasicData.find(wardBasicFilter)
      .populate('form', 'title description')
      .populate('ward', 'name wardNumber')
      .populate('submittedBy', 'name email')
      .sort({ submittedAt: -1 })
      .skip(type === 'ward-basic-data' ? skip : 0)
      .limit(type === 'ward-basic-data' ? parseInt(limit) : parseInt(limit) - submissions.length);

    const wardBasicCount = await WardBasicData.countDocuments(wardBasicFilter);

    submissions.push(...wardBasicData.map(w => ({
      _id: w._id,
      type: 'ward-basic-data',
      form: w.form,
      ward: w.ward,
      submittedBy: w.submittedBy,
      submittedAt: w.submittedAt,
      status: w.status
    })));

    totalCount += wardBasicCount;
  }

  // Sort combined results by submission date
  submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  // If no type filter, apply pagination to combined results
  if (!type) {
    submissions = submissions.slice(skip, skip + parseInt(limit));
  }

  res.status(200).json({
    submissions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      pages: Math.ceil(totalCount / parseInt(limit))
    }
  });
}

async function handleDeleteSubmission(req, res, wardIds) {
  const { id, type } = req.body;

  if (!id || !type) {
    return res.status(400).json({ message: 'Submission ID and type are required' });
  }

  let result = null;

  if (type === 'response') {
    result = await Response.findOneAndDelete({
      _id: id,
      ward: { $in: wardIds }
    });
  } else if (type === 'ward-basic-data') {
    result = await WardBasicData.findOneAndDelete({
      _id: id,
      ward: { $in: wardIds }
    });
  }

  if (!result) {
    return res.status(404).json({ message: 'Submission not found' });
  }

  res.status(200).json({ message: 'Submission deleted successfully' });
}

async function handleUpdateSubmission(req, res, wardIds) {
  const { id, type, status, reviewComments } = req.body;

  if (!id || !type) {
    return res.status(400).json({ message: 'Submission ID and type are required' });
  }

  let result = null;

  if (type === 'ward-basic-data') {
    const updateData = {};
    if (status) updateData.status = status;
    if (reviewComments !== undefined) updateData.reviewComments = reviewComments;
    if (status === 'approved' || status === 'rejected') {
      updateData.reviewedBy = req.session?.user?.id;
      updateData.reviewedAt = new Date();
    }

    result = await WardBasicData.findOneAndUpdate(
      { _id: id, ward: { $in: wardIds } },
      updateData,
      { new: true }
    )
    .populate('form', 'title')
    .populate('ward', 'name wardNumber')
    .populate('submittedBy', 'name email');
  } else {
    return res.status(400).json({ message: 'Update not supported for this submission type' });
  }

  if (!result) {
    return res.status(404).json({ message: 'Submission not found' });
  }

  res.status(200).json({
    message: 'Submission updated successfully',
    submission: result
  });
}