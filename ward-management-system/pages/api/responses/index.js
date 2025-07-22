import { getSession } from 'next-auth/react';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import Ward from '../../../models/Ward';
import User from '../../../models/User';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  const session = await getSession({ req });
  
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
      const { formTemplateId, responses, wardId } = req.body;
      
      // Validate required fields
      if (!formTemplateId || !responses) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Get form template
      const formTemplate = await FormTemplate.findById(formTemplateId);
      
      if (!formTemplate) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
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
      const requiredFields = formTemplate.fields.filter(field => field.required);
      
      for (const field of requiredFields) {
        const fieldValue = responses[field.label];
        
        // For checkbox fields, check if the value exists (can be true or false)
        if (field.type === 'checkbox') {
          if (fieldValue === undefined || fieldValue === null) {
            return res.status(400).json({ message: `Missing required field: ${field.label}` });
          }
        } else {
          // For other fields, check if value exists and is not empty
          if (!fieldValue && fieldValue !== 0 && fieldValue !== false) {
            return res.status(400).json({ message: `Missing required field: ${field.label}` });
          }
        }
      }
      
      // Create new response
      const newResponse = new Response({
        formTemplate: formTemplateId,
        respondent: session.user.id,
        ward: formTemplate.formType === 'wardReport' ? wardId : undefined,
        formType: formTemplate.formType,
        responses,
        weekNumber: formTemplate.weekNumber,
        year: formTemplate.year,
        district: session.user.district,
      });
      
      await newResponse.save();
      
      // Log the form submission activity
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
        district: session.user.district,
        ward: wardId || session.user.ward,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      
      // Populate response details
      const savedResponse = await Response.findById(newResponse._id)
        .populate('formTemplate', 'title formType weekNumber year')
        .populate('respondent', 'name email')
        .populate('ward', 'name district');
      
      return res.status(201).json(savedResponse);
    } catch (error) {
      return res.status(500).json({ message: 'Error creating response', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}