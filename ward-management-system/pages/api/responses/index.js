import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import Ward from '../../../models/Ward';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      const { formType, weekNumber, year, wardId, coordinatorId } = req.query;
      
      // Build query
      const query = {};
      
      if (formType) query.formType = formType;
      if (weekNumber) query.weekNumber = parseInt(weekNumber);
      if (year) query.year = parseInt(year);
      if (wardId) query.ward = wardId;
      if (coordinatorId) query.respondent = coordinatorId;
      
      // Filter based on user role
      if (session.user.role === 'coordinator') {
        // Coordinators can only see their district's responses
        query.district = session.user.district;
      } else if (session.user.role === 'wardAdmin') {
        // Ward admins can only see their own responses
        const userWards = await Ward.find({ wardAdmin: session.user.id });
        const wardIds = userWards.map(ward => ward._id);
        
        if (formType === 'wardReport') {
          query.ward = { $in: wardIds };
        } else {
          // Ward admins can't see coordinator reports
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      
      // Get responses
      const responses = await Response.find(query)
        .populate('formTemplate', 'title formType weekNumber year')
        .populate('respondent', 'name email district role')
        .populate('ward', 'name district')
        .sort({ submittedAt: -1 });
      
      // Log the report view activity
      await logActivity({
        userId: session.user.id,
        action: ACTIONS.REPORT_VIEW,
        description: `Viewed reports with filters: ${JSON.stringify({ formType, weekNumber, year, wardId, coordinatorId })}`,
        metadata: { filters: { formType, weekNumber, year, wardId, coordinatorId } },
        district: session.user.district,
        ward: session.user.ward,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json(responses);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching responses', error: error.message });
    }
  }
  
  if (req.method === 'POST') {
    try {
      console.log('Response API - Request body:', req.body);
      console.log('Response API - Session user:', session.user);
      
      const { formTemplateId, responses, wardId } = req.body;
      
      // Validate required fields
      if (!formTemplateId || !responses) {
        console.log('Response API - Missing required fields:', { formTemplateId: !!formTemplateId, responses: !!responses });
        return res.status(400).json({ message: 'Missing required fields: formTemplateId and responses are required' });
      }
      
      console.log('Response API - Looking for form template:', formTemplateId);
      
      // Get form template
      const formTemplate = await FormTemplate.findById(formTemplateId);
      
      if (!formTemplate) {
        console.log('Response API - Form template not found:', formTemplateId);
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      console.log('Response API - Found form template:', formTemplate.title);
      
      // Check if form is active
      if (!formTemplate.isActive) {
        return res.status(400).json({ message: 'Form is no longer active' });
      }
      
      // Check permissions based on form type
      if (formTemplate.formType === 'coordinatorReport') {
        // Only coordinators can submit coordinator reports
        if (session.user.role !== 'coordinator') {
          return res.status(403).json({ message: 'Only coordinators can submit coordinator reports' });
        }
      } else if (formTemplate.formType === 'wardReport') {
        // Only ward admins can submit ward reports
        if (session.user.role !== 'wardAdmin') {
          return res.status(403).json({ message: 'Only ward admins can submit ward reports' });
        }
        
        // Validate ward ID
        if (!wardId) {
          return res.status(400).json({ message: 'Ward ID is required for ward reports' });
        }
        
        // Check if ward exists and user is the ward admin
        const ward = await Ward.findById(wardId);
        
        if (!ward) {
          return res.status(404).json({ message: 'Ward not found' });
        }
        
        if (ward.wardAdmin.toString() !== session.user.id) {
          return res.status(403).json({ message: 'You are not authorized to submit reports for this ward' });
        }
      }
      
      // Validate responses against form fields
      console.log('Response API - Form fields:', formTemplate.fields);
      console.log('Response API - Received responses:', responses);
      
      const requiredFields = formTemplate.fields.filter(field => field.required).map(field => field.label);
      console.log('Response API - Required fields:', requiredFields);
      
      for (const field of requiredFields) {
        if (!responses[field] && responses[field] !== 0) {
          console.log('Response API - Missing required field:', field);
          return res.status(400).json({ message: `Missing required field: ${field}` });
        }
      }
      
      // Check if district is available
      console.log('Response API - Session user district:', session.user.district);
      console.log('Response API - Session user full object:', session.user);
      
      // Get district from session, ward, or use a default
      let userDistrict = session.user.district;
      
      if (!userDistrict && formTemplate.formType === 'wardReport' && wardId) {
        // For ward reports, get district from the ward
        const ward = await Ward.findById(wardId);
        if (ward && ward.district) {
          userDistrict = ward.district;
          console.log('Response API - Got district from ward:', userDistrict);
        }
      }
      
      if (!userDistrict) {
        console.log('Response API - No district found, using default');
        userDistrict = 'Default'; // Use a valid default district
      }
      
      console.log('Response API - Final district value:', userDistrict);
      
      // Create new response - keep as object
      const responseData = {
        formTemplate: formTemplateId,
        respondent: session.user.id,
        formType: formTemplate.formType,
        responses: responses,
        weekNumber: formTemplate.weekNumber,
        year: formTemplate.year,
        district: userDistrict,
      };
      
      // Only add ward if it's a ward report and wardId is provided
      if (formTemplate.formType === 'wardReport' && wardId) {
        responseData.ward = wardId;
      }
      
      console.log('Response API - Creating response with data:', responseData);
      console.log('Response API - District value:', responseData.district, typeof responseData.district);
      
      // Create and save response directly without pre-validation
      const newResponse = new Response(responseData);
      
      console.log('Response API - Saving response...');
      await newResponse.save();
      console.log('Response API - Response saved successfully:', newResponse._id);
      
      // Log the form submission activity (wrapped in try-catch to prevent failure)
      try {
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.FORM_SUBMIT,
          description: `Submitted ${formTemplate.formType} for week ${formTemplate.weekNumber}, ${formTemplate.year}`,
          entityType: 'Response',
          entityId: newResponse._id,
          metadata: { 
            formType: formTemplate.formType, 
            weekNumber: formTemplate.weekNumber, 
            year: formTemplate.year,
            wardId: wardId || null
          },
          district: userDistrict, // Use the same district we used for the response
          ward: wardId || null,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (logError) {
        console.error('Failed to log activity, but continuing:', logError);
      }
      
      // Populate response details
      const savedResponse = await Response.findById(newResponse._id)
        .populate('formTemplate', 'title formType weekNumber year')
        .populate('respondent', 'name email')
        .populate('ward', 'name district');
      
      return res.status(201).json(savedResponse);
    } catch (error) {
      console.error('Response API - Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      
      // Handle specific MongoDB errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          message: 'Validation failed', 
          error: validationErrors.join(', '),
          details: validationErrors
        });
      }
      
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'Duplicate entry', 
          error: 'A response for this form may already exist'
        });
      }
      
      return res.status(500).json({ 
        message: 'Error creating response', 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}