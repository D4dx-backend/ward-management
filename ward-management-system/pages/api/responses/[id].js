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

    try {
      // Find the response
      const response = await Response.findById(id)
        .populate('formTemplate', 'title fields sittingWardFields formType allowEditAfterSubmission closeDateTime');

      if (!response) {
        return res.status(404).json({ error: 'Response not found' });
      }

      // Check if user owns this response
      if (response.respondent.toString() !== session.user.id) {
        return res.status(403).json({ error: 'You can only edit your own responses' });
      }

      // Check if editing is allowed for this form
      if (!response.formTemplate.allowEditAfterSubmission) {
        return res.status(403).json({ error: 'Editing is not allowed for this form' });
      }

      // Validate updated responses against form fields
      for (const field of response.formTemplate.fields) {
        if (field.required) {
          const fieldValue = updatedResponses[field.label];
          
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
        }
        
        // Validate sub-questions if they exist and should be visible
        if (field.subQuestions && field.subQuestions.length > 0) {
          const fieldValue = updatedResponses[field.label];
          
          // Check if sub-questions should be visible
          const shouldShowSubQuestions = field.showSubQuestionsWhen ? 
            (fieldValue?.toLowerCase() === field.showSubQuestionsWhen.toLowerCase() || fieldValue === field.showSubQuestionsWhen) : true;
          
          if (shouldShowSubQuestions) {
            for (const subQuestion of field.subQuestions) {
              if (subQuestion.required) {
                const subKey = `${field.label}_${subQuestion.label}`;
                const subValue = updatedResponses[subKey];
                
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

      // Update the response
      response.responses = updatedResponses;
      response.updatedAt = new Date();
      
      const updatedResponse = await response.save();

      // Log the edit activity
      try {
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
      } catch (logError) {
        console.error('Failed to log edit activity:', logError);
      }

      // Return updated response with populated data
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

      return res.status(200).json(populatedResponse);
    } catch (error) {
      console.error('Error updating response:', error);
      
      if (error.name === 'CastError') {
        return res.status(404).json({ error: 'Response not found' });
      }
      
      return res.status(500).json({ error: 'Failed to update response' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}