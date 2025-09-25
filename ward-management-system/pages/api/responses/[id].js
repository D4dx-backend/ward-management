import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Response from '../../../models/Response';
import FormTemplate from '../../../models/FormTemplate';
import { logActivity, ACTIONS } from '../../../lib/logger';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'GET') {

    const { id } = req.query;

    try {
      console.log('Fetching response with ID:', id);
      console.log('User session:', { id: session.user.id, role: session.user.role, district: session.user.district });
      
      // Find the response by ID and populate related data
      const response = await Response.findById(id)
        .populate('respondent', 'name email role')
        .populate({
          path: 'ward',
          select: 'name district coordinator isSittingWard',
          populate: {
            path: 'coordinator',
            select: 'name _id'
          }
        })
        .populate('formTemplate', 'title fields sittingWardFields formType allowEditAfterSubmission closeDateTime')
        .lean();

      if (!response) {
        console.log('Response not found for ID:', id);
        return res.status(404).json({ error: 'Response not found' });
      }
      
      console.log('Found response:', {
        id: response._id,
        district: response.district,
        wardId: response.ward?._id,
        wardName: response.ward?.name,
        wardIsSittingWard: response.ward?.isSittingWard,
        wardCoordinator: response.ward?.coordinator?._id,
        respondentId: response.respondent._id
      });
      
      // Debug logging for responses data
      console.log('Response data structure:', {
        responses: response.responses,
        responsesType: typeof response.responses,
        responsesKeys: Object.keys(response.responses || {}),
        formFields: response.formTemplate?.fields?.map(f => f.label)
      });

      // Check if user has access to this response
      if (session.user.role === 'stateAdmin') {
        // State admin can view all responses
        return res.status(200).json(response);
      } else if (session.user.role === 'coordinator') {
        // Coordinators can view responses from their district or from wards they coordinate
        let hasAccess = false;
        
        // Check district match
        if (response.district === session.user.district) {
          hasAccess = true;
        }
        
        // Check if coordinator manages the ward (for ward reports)
        if (response.ward && response.ward.coordinator && 
            response.ward.coordinator._id.toString() === session.user.id) {
          hasAccess = true;
        }
        
        // Check if this is a coordinator's own response
        if (response.respondent._id.toString() === session.user.id) {
          hasAccess = true;
        }
        
        if (!hasAccess) {
          console.log('Coordinator access denied:', {
            responseDistrict: response.district,
            userDistrict: session.user.district,
            wardCoordinator: response.ward?.coordinator?._id,
            userId: session.user.id,
            respondentId: response.respondent._id.toString()
          });
          return res.status(403).json({ error: 'Access denied' });
        }
        
        return res.status(200).json(response);
      } else if (session.user.role === 'wardAdmin') {
        // Ward Incharges can only view their own responses
        if (response.respondent._id.toString() !== session.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
        return res.status(200).json(response);
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Handle invalid ObjectId
      if (error.name === 'CastError') {
        return res.status(404).json({ error: 'Response not found - Invalid ID format' });
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch response', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { responses: updatedResponses } = req.body;

    console.log('PUT /api/responses/[id] - Request details:', {
      id,
      hasResponses: !!updatedResponses,
      responsesKeys: updatedResponses ? Object.keys(updatedResponses) : [],
      userRole: session.user.role,
      userId: session.user.id
    });

    try {
      // Find the response
      console.log('Looking for response with ID:', id);
      const response = await Response.findById(id)
        .populate('formTemplate', 'title fields sittingWardFields formType allowEditAfterSubmission closeDateTime');
      
      console.log('Response found:', {
        found: !!response,
        responseId: response?._id,
        formTemplateId: response?.formTemplate?._id,
        formType: response?.formTemplate?.formType,
        respondent: response?.respondent?.toString(),
        ward: response?.ward?.toString()
      });

      if (!response) {
        return res.status(404).json({ error: 'Response not found' });
      }

      // Check permissions for editing
      let canEdit = false;
      
      console.log('Checking edit permissions:', {
        respondentId: response.respondent.toString(),
        currentUserId: session.user.id,
        userRole: session.user.role,
        formType: response.formTemplate.formType,
        wardId: response.ward?.toString()
      });
      
      // User can edit their own responses
      if (response.respondent.toString() === session.user.id) {
        canEdit = true;
        console.log('Permission granted: User owns this response');
      }
      // Coordinators can edit ward admin submitted forms in their district
      else if (session.user.role === 'coordinator' && response.formTemplate.formType === 'wardReport') {
        // Check if the coordinator has access to this ward
        const Ward = require('../../../models/Ward');
        const ward = await Ward.findOne({ 
          _id: response.ward, 
          coordinator: session.user.id 
        });
        canEdit = !!ward;
        console.log('Coordinator ward check:', { wardFound: !!ward, wardId: ward?._id });
      }
      // State admins can edit any response
      else if (session.user.role === 'stateAdmin') {
        canEdit = true;
        console.log('Permission granted: State admin');
      }
      
      console.log('Final permission result:', { canEdit });
      
      if (!canEdit) {
        return res.status(403).json({ error: 'You do not have permission to edit this response' });
      }

      // Check if editing is allowed for this form
      console.log('Checking if editing is allowed:', { 
        allowEditAfterSubmission: response.formTemplate.allowEditAfterSubmission 
      });
      
      if (!response.formTemplate.allowEditAfterSubmission) {
        return res.status(403).json({ error: 'Editing is not allowed for this form' });
      }

      // Validate updated responses against form fields
      console.log('Starting field validation...');
      console.log('Form fields count:', response.formTemplate.fields?.length || 0);
      
      // Fetch clusters if there are cluster-applicable fields for validation
      let clusters = [];
      const hasClusterFields = response.formTemplate.fields.some(field => field.applicableToClusters);
      if (hasClusterFields && response.ward) {
        try {
          const Cluster = require('../../../models/Cluster');
          clusters = await Cluster.find({ ward: response.ward }).lean();
          console.log('Loaded clusters for validation:', clusters.length);
        } catch (error) {
          console.error('Error loading clusters for validation:', error);
        }
      }
      
      for (const field of response.formTemplate.fields) {
        if (field.required) {
          if (field.applicableToClusters && clusters.length > 0) {
            // Validate cluster-applicable fields for each cluster
            console.log(`Validating cluster field: ${field.label} for ${clusters.length} clusters`);
            for (const cluster of clusters) {
              const clusterFieldKey = `${field.label}_cluster_${cluster._id}`;
              const clusterFieldValue = updatedResponses[clusterFieldKey];
              
              console.log(`Checking cluster field: ${clusterFieldKey}, value: ${clusterFieldValue}`);
              
              if (field.type === 'checkbox') {
                if (clusterFieldValue === undefined || clusterFieldValue === null) {
                  return res.status(400).json({ message: `Missing required field: ${field.label} for cluster ${cluster.name}` });
                }
              } else {
                const trimmedValue = typeof clusterFieldValue === 'string' ? clusterFieldValue.trim() : clusterFieldValue;
                if (!trimmedValue && trimmedValue !== 0 && trimmedValue !== false) {
                  return res.status(400).json({ message: `Missing required field: ${field.label} for cluster ${cluster.name}` });
                }
              }
              
              // Validate sub-questions for cluster fields
              if (field.subQuestions && field.subQuestions.length > 0) {
                const shouldShowSubQuestions = field.showSubQuestionsWhen ? 
                  (clusterFieldValue?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || clusterFieldValue === field.showSubQuestionsWhen) : true;
                
                if (shouldShowSubQuestions) {
                  for (let subIndex = 0; subIndex < field.subQuestions.length; subIndex++) {
                    const subQuestion = field.subQuestions[subIndex];
                    if (subQuestion.required) {
                      const subKey = `${field.label}_cluster_${cluster._id}_sub_${subIndex}`;
                      const subValue = updatedResponses[subKey];
                      
                      console.log(`Checking cluster sub-question: ${subKey}, value: ${subValue}`);
                      
                      if (subQuestion.type === 'checkbox') {
                        if (subValue === undefined || subValue === null) {
                          return res.status(400).json({ message: `Missing required sub-question: ${subQuestion.label} for cluster ${cluster.name}` });
                        }
                      } else {
                        const trimmedSubValue = typeof subValue === 'string' ? subValue.trim() : subValue;
                        if (!trimmedSubValue && trimmedSubValue !== 0 && trimmedSubValue !== false) {
                          return res.status(400).json({ message: `Missing required sub-question: ${subQuestion.label} for cluster ${cluster.name}` });
                        }
                      }
                    }
                  }
                }
              }
            }
          } else {
            // Regular field validation (not cluster-applicable)
            const fieldValue = updatedResponses[field.label];
            
            console.log(`Checking regular field: ${field.label}, value: ${fieldValue}`);
            
            if (field.type === 'checkbox') {
              if (fieldValue === undefined || fieldValue === null) {
                return res.status(400).json({ message: `Missing required field: ${field.label}` });
              }
            } else {
              const trimmedValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
              if (!trimmedValue && trimmedValue !== 0 && trimmedValue !== false) {
                return res.status(400).json({ message: `Missing required field: ${field.label}` });
              }
            }
            
            // Validate sub-questions for regular fields
            if (field.subQuestions && field.subQuestions.length > 0) {
              const shouldShowSubQuestions = field.showSubQuestionsWhen ? 
                (fieldValue?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || fieldValue === field.showSubQuestionsWhen) : true;
              
              if (shouldShowSubQuestions) {
                for (const subQuestion of field.subQuestions) {
                  if (subQuestion.required) {
                    // Try both key formats for backward compatibility
                    const subKey1 = `${field.label}_${subQuestion.label}`;
                    const subKey2 = `${field.label}_sub_${field.subQuestions.indexOf(subQuestion)}`;
                    const subValue = updatedResponses[subKey1] || updatedResponses[subKey2];
                    
                    console.log(`Checking regular sub-question: ${subKey2}, value: ${subValue}`);
                    
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
        }
      }

      // Update the response
      console.log('Updating response with new data...');
      console.log('Original responses count:', Object.keys(response.responses || {}).length);
      console.log('New responses count:', Object.keys(updatedResponses).length);
      
      response.responses = updatedResponses;
      response.updatedAt = new Date();
      
      console.log('Saving updated response...');
      console.log('Response object before save:', {
        id: response._id,
        responsesCount: Object.keys(response.responses).length,
        updatedAt: response.updatedAt,
        formTemplate: response.formTemplate?._id,
        respondent: response.respondent?._id,
        ward: response.ward?._id,
        formType: response.formType,
        weekNumber: response.weekNumber,
        year: response.year,
        district: response.district
      });
      
      // Validate required fields before saving
      if (!response.formTemplate) {
        throw new Error('Form template is required');
      }
      if (!response.respondent) {
        throw new Error('Respondent is required');
      }
      if (!response.formType) {
        throw new Error('Form type is required');
      }
      if (!response.weekNumber) {
        throw new Error('Week number is required');
      }
      if (!response.year) {
        throw new Error('Year is required');
      }
      if (!response.district) {
        throw new Error('District is required');
      }
      
      const updatedResponse = await response.save();
      console.log('Response saved successfully:', updatedResponse._id);

      // Log the edit activity
      try {
        console.log('Logging edit activity...');
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.FORM_EDIT,
          description: `Edited ${response.formTemplate.formType} for week ${response.weekNumber}, ${response.year}`,
          entityType: 'Response',
          entityId: updatedResponse._id,
          metadata: { 
            formType: response.formTemplate.formType, 
            weekNumber: response.weekNumber, 
            year: response.year
          },
          district: session.user.district || 'Unknown',
          ward: response.ward || null,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
        console.log('Edit activity logged successfully');
      } catch (logError) {
        console.error('Failed to log edit activity:', logError);
        // Don't fail the entire request if logging fails
      }

      // Return updated response with populated data
      console.log('Populating response data for return...');
      const populatedResponse = await Response.findById(updatedResponse._id)
        .populate('respondent', 'name email role')
        .populate({
          path: 'ward',
          select: 'name district coordinator isSittingWard',
          populate: {
            path: 'coordinator',
            select: 'name _id'
          }
        })
        .populate('formTemplate', 'title fields sittingWardFields formType allowEditAfterSubmission closeDateTime');

      console.log('Response populated successfully, returning data...');
      return res.status(200).json(populatedResponse);
    } catch (error) {
      console.error('Error updating response:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      });
      
      if (error.name === 'CastError') {
        return res.status(404).json({ error: 'Response not found' });
      }
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: error.message,
          errors: error.errors 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to update response',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;

    try {
      console.log('Deleting response with ID:', id);
      console.log('User session:', { id: session.user.id, role: session.user.role, district: session.user.district });
      
      // Only state admin can delete responses
      if (session.user.role !== 'stateAdmin') {
        console.log('Access denied: Only state admin can delete responses');
        return res.status(403).json({ error: 'Only state administrators can delete reports' });
      }

      // Find the response to get details for logging
      const response = await Response.findById(id)
        .populate('respondent', 'name email role')
        .populate({
          path: 'ward',
          select: 'name district coordinator isSittingWard',
          populate: {
            path: 'coordinator',
            select: 'name _id'
          }
        })
        .populate('formTemplate', 'title formType');

      if (!response) {
        console.log('Response not found for deletion:', id);
        return res.status(404).json({ error: 'Response not found' });
      }

      // Delete the response
      const deletedResponse = await Response.findByIdAndDelete(id);

      if (!deletedResponse) {
        console.log('Failed to delete response:', id);
        return res.status(404).json({ error: 'Response not found' });
      }

      // Log the deletion activity
      try {
        await logActivity({
          userId: session.user.id,
          action: ACTIONS.RESPONSE_DELETE,
          description: `Deleted ${response.formTemplate?.formType || 'report'} for week ${response.weekNumber}, ${response.year} from ${response.ward?.name || 'Unknown Ward'}`,
          entityType: 'Response',
          entityId: response._id,
          metadata: { 
            formType: response.formTemplate?.formType || 'unknown',
            weekNumber: response.weekNumber, 
            year: response.year,
            wardName: response.ward?.name || 'Unknown',
            respondentName: response.respondent?.name || 'Unknown'
          },
          district: response.district || 'Unknown',
          ward: response.ward?._id || null,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
        console.log('Successfully logged response deletion activity');
      } catch (logError) {
        console.error('Failed to log response deletion activity:', logError);
      }

      console.log('Successfully deleted response:', id);
      return res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
      console.error('Error deleting response:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Handle invalid ObjectId
      if (error.name === 'CastError') {
        return res.status(404).json({ error: 'Response not found - Invalid ID format' });
      }
      
      return res.status(500).json({ 
        error: 'Failed to delete response', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}