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
      // Find the response by ID and populate related data
      const response = await Response.findById(id)
        .populate('respondent', 'name email role')
        .populate('ward', 'name district')
        .populate('formTemplate', 'title fields formType allowEditAfterSubmission')
        .lean();

      if (!response) {
        return res.status(404).json({ error: 'Response not found' });
      }

      // Check if user has access to this response
      if (session.user.role === 'stateAdmin') {
        // State admin can view all responses
        return res.status(200).json(response);
      } else if (session.user.role === 'coordinator') {
        // Coordinators can only view responses from their district
        if (response.district !== session.user.district) {
          return res.status(403).json({ error: 'Access denied' });
        }
        return res.status(200).json(response);
      } else if (session.user.role === 'wardAdmin') {
        // Ward admins can only view their own responses
        if (response.respondent._id.toString() !== session.user.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
        return res.status(200).json(response);
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      
      // Handle invalid ObjectId
      if (error.name === 'CastError') {
        return res.status(404).json({ error: 'Response not found' });
      }
      
      return res.status(500).json({ error: 'Failed to fetch response' });
    }
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { responses: updatedResponses } = req.body;

    try {
      // Find the response
      const response = await Response.findById(id)
        .populate('formTemplate', 'title fields formType allowEditAfterSubmission');

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
        .populate('ward', 'name district')
        .populate('formTemplate', 'title fields formType');

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