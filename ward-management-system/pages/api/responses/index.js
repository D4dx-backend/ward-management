import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import Ward from '../../../models/Ward';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  let session;
  
  try {
    session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    await connectToDatabase();
  } catch (error) {
    console.error('Initial setup error:', error);
    return res.status(500).json({ message: 'Server initialization error', error: error.message });
  }
  
  if (req.method === 'GET') {
    try {
      const { formType, weekNumber, year, wardId, coordinatorId, coordinatorOnly, formTemplate, sittingWardStatus } = req.query;
      
      // Build query
      const query = {};
      
      if (formType) query.formType = formType;
      if (weekNumber) query.weekNumber = parseInt(weekNumber);
      if (year) query.year = parseInt(year);
      if (wardId) query.ward = wardId;
      if (coordinatorId) query.respondent = coordinatorId;
      if (formTemplate) query.formTemplate = formTemplate;
      
      // Handle sitting ward status filter
      if (sittingWardStatus) {
        if (sittingWardStatus === 'sitting') {
          // Find wards that are sitting wards
          const sittingWards = await Ward.find({ isSittingWard: true }).select('_id');
          const sittingWardIds = sittingWards.map(ward => ward._id);
          if (sittingWardIds.length > 0) {
            query.ward = { $in: sittingWardIds };
          } else {
            // No sitting wards found, return empty result
            return res.status(200).json([]);
          }
        } else if (sittingWardStatus === 'regular') {
          // Find wards that are not sitting wards
          const regularWards = await Ward.find({ isSittingWard: { $ne: true } }).select('_id');
          const regularWardIds = regularWards.map(ward => ward._id);
          if (regularWardIds.length > 0) {
            query.ward = { $in: regularWardIds };
          } else {
            // No regular wards found, return empty result
            return res.status(200).json([]);
          }
        }
      }
      
      // Filter based on user role
      if (session.user.role === 'stateAdmin') {
        // State admin can see all responses - no additional filtering needed
        console.log('State admin access - no role-based filtering applied');
      } else if (session.user.role === 'coordinator') {
        if (coordinatorOnly === 'true') {
          // Get only responses from wards under this coordinator
          const coordinatorWards = await Ward.find({ coordinator: session.user.id });
          const wardIds = coordinatorWards.map(ward => ward._id);
          if (wardIds.length > 0) {
            query.ward = { $in: wardIds };
          } else {
            // If coordinator has no wards, return empty result
            return res.status(200).json([]);
          }
        } else {
          // Coordinators can only see their district's responses
          query.district = session.user.district;
        }
      } else if (session.user.role === 'wardAdmin') {
        // Ward Incharges can only see their own responses
        if (formType === 'wardReport') {
          query.respondent = session.user.id;
        } else {
          // Ward Incharges can't see coordinator reports
          return res.status(403).json({ message: 'Forbidden' });
        }
      }
      
      // Get responses
      console.log('Final query for responses:', JSON.stringify(query, null, 2));
      const responses = await Response.find(query)
        .populate('formTemplate', 'title formType weekNumber year')
        .populate('respondent', 'name email district role')
        .populate({
          path: 'ward',
          select: 'name district coordinator isSittingWard',
          populate: {
            path: 'coordinator',
            select: 'name _id'
          }
        })
        .sort({ submittedAt: -1 });
      
      console.log(`Found ${responses.length} responses matching query`);
      
      // Log the report view activity with better description
      try {
        let description = 'Viewed reports';
        if (formType) {
          description += ` (${formType.replace('Report', ' Reports')})`;
        }
        if (year) {
          description += ` for ${year}`;
        }
        if (weekNumber) {
          description += ` week ${weekNumber}`;
        }
        
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.REPORT_VIEW,
          description,
          metadata: { filters: { formType, weekNumber, year, wardId, coordinatorId } },
          district: session.user.district || 'Unknown',
          ward: session.user.ward || null,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (logError) {
        console.error('Failed to log report view activity:', logError);
      }
      
      return res.status(200).json(responses);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching responses', error: error.message });
    }
  }
  
  if (req.method === 'POST') {
    try {
      console.log('Response API - Request body:', req.body);
      console.log('Response API - Session user:', session.user);
      
      const { formTemplateId, responses, wardId, wardData } = req.body;
      
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

      // Check submission controls
      if (!formTemplate.allowMultipleSubmissions) {
        // Check if user has already submitted for this form
        const existingResponse = await Response.findOne({
          formTemplate: formTemplateId,
          respondent: session.user.id,
          ...(formTemplate.formType === 'wardReport' && wardId ? { ward: wardId } : {})
        });

        if (existingResponse) {
          return res.status(400).json({ 
            message: 'Multiple submissions are not allowed for this form. You have already submitted a response.' 
          });
        }
      }
      
      // Check permissions based on form type
      if (formTemplate.formType === 'coordinatorReport') {
        // Only coordinators can submit coordinator reports
        if (session.user.role !== 'coordinator') {
          return res.status(403).json({ message: 'Only coordinators can submit coordinator reports' });
        }
      } else if (formTemplate.formType === 'wardReport') {
        // Only Ward Incharges can submit ward reports
        if (session.user.role !== 'wardAdmin') {
          return res.status(403).json({ message: 'Only Ward Incharges can submit ward reports' });
        }
        
        // Validate ward ID
        if (!wardId) {
          return res.status(400).json({ message: 'Ward ID is required for ward reports' });
        }
        
        // Check if ward exists and user is the Ward Incharge
        const ward = await Ward.findById(wardId);
        
        if (!ward) {
          return res.status(404).json({ message: 'Ward not found' });
        }
        
        if (ward.wardAdmin && ward.wardAdmin.toString() !== session.user.id) {
          return res.status(403).json({ message: 'You are not authorized to submit reports for this ward' });
        }
      }
      
      // Validate responses against form fields
      for (const field of formTemplate.fields) {
        if (field.required) {
          const fieldValue = responses[field.label];
          
          // For checkbox fields, check if the value exists (can be true or false)
          if (field.type === 'checkbox') {
            if (fieldValue === undefined || fieldValue === null) {
              return res.status(400).json({ message: `Missing required field: ${field.label}` });
            }
          } else {
            // For other fields, check if value exists and is not empty
            const trimmedValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
            if (!trimmedValue && trimmedValue !== 0 && trimmedValue !== false) {
              return res.status(400).json({ message: `Missing required field: ${field.label}` });
            }
          }
        }
        
        // Validate sub-questions if they exist and should be visible
        if (field.subQuestions && field.subQuestions.length > 0) {
          const fieldValue = responses[field.label];
          
          // Check if sub-questions should be visible
          const shouldShowSubQuestions = field.showSubQuestionsWhen ? 
            (fieldValue?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || fieldValue === field.showSubQuestionsWhen) : true;
          
          if (shouldShowSubQuestions) {
            for (const subQuestion of field.subQuestions) {
              if (subQuestion.required) {
                const subKey = `${field.label}_${subQuestion.label}`;
                const subValue = responses[subKey];
                
                if (subQuestion.type === 'checkbox') {
                  if (subValue === undefined || subValue === null) {
                    return res.status(400).json({ message: `Missing required sub-question: ${subQuestion.label}` });
                  }
                } else {
                  const trimmedSubValue = typeof subValue === 'string' ? subValue.trim() : subValue;
                  if (!trimmedSubValue && trimmedSubValue !== 0 && trimmedSubValue !== false) {
                    return res.status(400).json({ message: `Missing required sub-question: ${subQuestion.label}` });
                  }
                }
              }
            }
          }
        }
      }
      
      // Validate ObjectIds
      const mongoose = require('mongoose');
      
      if (!mongoose.Types.ObjectId.isValid(formTemplateId)) {
        return res.status(400).json({ message: 'Invalid form template ID' });
      }
      
      if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      if (formTemplate.formType === 'wardReport' && wardId && !mongoose.Types.ObjectId.isValid(wardId)) {
        return res.status(400).json({ message: 'Invalid ward ID' });
      }
      
      // Create new response object
      const responseData = {
        formTemplate: formTemplateId,
        respondent: session.user.id,
        formType: formTemplate.formType,
        responses: responses,
        weekNumber: formTemplate.weekNumber,
        year: formTemplate.year,
        district: session.user.district || 'Unknown',
      };
      
      // Debug logging for response data
      console.log('Response API - Creating response with data:', {
        responses: responses,
        responsesType: typeof responses,
        responsesKeys: Object.keys(responses || {}),
        formFields: formTemplate.fields?.map(f => f.label)
      });
      
      // Add ward data for coordinator reports
      if (formTemplate.formType === 'coordinatorReport' && wardData) {
        console.log('Response API - Adding ward data:', wardData);
        responseData.wardData = wardData;
      }
      
      // Add ward only for ward reports
      if (formTemplate.formType === 'wardReport' && wardId) {
        responseData.ward = wardId;
      }
      
      const newResponse = new Response(responseData);
      
      // Validate the response object before saving
      const validationError = newResponse.validateSync();
      if (validationError) {
        console.error('Validation error:', validationError);
        return res.status(400).json({ 
          message: 'Validation error', 
          error: validationError.message,
          details: Object.keys(validationError.errors).map(key => ({
            field: key,
            message: validationError.errors[key].message
          }))
        });
      }
      
      // Save the response
      const savedResponse = await newResponse.save();
      
      // Log the form submission activity (wrapped in try-catch to prevent failure)
      try {
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.FORM_SUBMIT,
          description: `Submitted ${formTemplate.formType} for week ${formTemplate.weekNumber}, ${formTemplate.year}`,
          entityType: 'Response',
          entityId: savedResponse._id,
          metadata: { 
            formType: formTemplate.formType, 
            weekNumber: formTemplate.weekNumber, 
            year: formTemplate.year,
            wardId: wardId || null
          },
          district: session.user.district || 'Unknown',
          ward: wardId || null,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (logError) {
        console.error('Failed to log activity, but continuing:', logError);
      }
      
      // Populate response details
      const populatedResponse = await Response.findById(savedResponse._id)
        .populate('formTemplate', 'title formType weekNumber year')
        .populate('respondent', 'name email')
        .populate({
          path: 'ward',
          select: 'name district coordinator isSittingWard',
          populate: {
            path: 'coordinator',
            select: 'name _id'
          }
        });

      // Clear server-side cache for dashboard stats to ensure fresh data
      try {
        const { clearServerCache, clearServerCachePattern } = require('../../../lib/serverCache');
        
        // Clear dashboard cache patterns that might be affected by this submission
        const clearedKeys = clearServerCachePattern('dashboard-stats');
        console.log(`Cleared ${clearedKeys} dashboard cache entries after form submission`);
        
        // Also clear specific user cache
        clearServerCache(`user-${session.user.id}`);
        
        console.log('Dashboard cache cleared after form submission');
      } catch (cacheError) {
        console.warn('Failed to clear dashboard cache:', cacheError.message);
        // Don't fail the request if cache clearing fails
      }
      
      return res.status(201).json({
        ...populatedResponse.toObject(),
        _cacheInvalidated: true // Signal to frontend that cache should be refreshed
      });
    } catch (error) {
      console.error('Error in POST /api/responses:', error);
      return res.status(500).json({ 
        message: 'Error creating response', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}