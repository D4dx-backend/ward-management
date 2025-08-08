import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Response from '../../../models/Response';
import RecurringQuestion from '../../../models/RecurringQuestion';
import FormTemplate from '../../../models/FormTemplate';
import User from '../../../models/User';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only allow stateAdmin and coordinator to access this endpoint
  if (!['stateAdmin', 'coordinator'].includes(session.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      questionId,
      coordinatorId,
      wardId,
      districtId,
      year = new Date().getFullYear()
    } = req.query;

    if (!questionId) {
      return res.status(400).json({ message: 'Question ID is required' });
    }

    // Get the selected recurring question
    const selectedQuestion = await RecurringQuestion.findById(questionId);
    if (!selectedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Build query for form responses
    let query = {
      year: parseInt(year)
    };

    // For coordinator role, filter by their assigned wards
    if (session.user.role === 'coordinator') {
      const assignedWards = await Ward.find({ coordinator: session.user.id }).select('_id');
      const wardIds = assignedWards.map(ward => ward._id);
      
      if (wardIds.length > 0) {
        query.ward = { $in: wardIds };
      } else {
        // If coordinator has no assigned wards, return empty result
        return res.status(200).json({
          weeklyData: [],
          selectedQuestion,
          totalResponses: 0
        });
      }
    }

    // Apply additional filters
    if (coordinatorId && session.user.role === 'stateAdmin') {
      const assignedWards = await Ward.find({ coordinator: coordinatorId }).select('_id');
      const wardIds = assignedWards.map(ward => ward._id);
      if (wardIds.length > 0) {
        query.ward = { $in: wardIds };
      }
    }

    if (wardId) {
      query.ward = wardId;
    }

    if (districtId) {
      // Find wards in the district
      const wardsInDistrict = await Ward.find({ district: districtId }).select('_id');
      const wardIds = wardsInDistrict.map(w => w._id);
      if (wardIds.length > 0) {
        query.ward = { $in: wardIds };
      } else {
        // No wards found in this district, return empty result
        return res.status(200).json({
          weeklyData: [],
          selectedQuestion,
          totalResponses: 0
        });
      }
    }

    // Fetch form responses with population
    const formResponses = await Response.find(query)
      .populate({
        path: 'formTemplate',
        select: 'title fields'
      })
      .populate({
        path: 'respondent',
        select: 'name email role'
      })
      .populate({
        path: 'ward',
        select: 'name district'
      })
      .sort({ weekNumber: 1, submittedAt: -1 });

    // Process responses to extract the specific recurring question answers
    const questionResponses = [];
    const questionFieldId = selectedQuestion.fieldId;
    const questionText = selectedQuestion.question;

    for (const formResponse of formResponses) {
      if (!formResponse.formTemplate || !formResponse.formTemplate.fields) continue;

      // Look for the specific recurring question in the form responses
      let hasSelectedQuestion = false;
      let questionAnswer = null;
      
      // Look through form responses for the question
      for (const [responseKey, responseValue] of Object.entries(formResponse.responses || {})) {
        if (responseKey === questionText || 
            responseKey.includes(questionText.substring(0, 30)) ||
            responseKey.toLowerCase().includes(questionText.toLowerCase().substring(0, 20))) {
          hasSelectedQuestion = true;
          questionAnswer = responseValue;
          break;
        }
      }

      // Also check form fields for matching fieldId or recurringQuestionId
      if (!hasSelectedQuestion) {
        for (const field of formResponse.formTemplate.fields) {
          if (field.fieldId === questionFieldId || 
              field.recurringQuestionId?.toString() === questionId ||
              field.label === questionText) {
            const fieldAnswer = formResponse.responses[field.label];
            if (fieldAnswer !== undefined) {
              hasSelectedQuestion = true;
              questionAnswer = fieldAnswer;
              break;
            }
          }
        }
      }

      if (hasSelectedQuestion) {
        questionResponses.push({
          _id: formResponse._id,
          formTitle: formResponse.formTemplate.title,
          answer: questionAnswer,
          user: formResponse.respondent,
          ward: formResponse.ward,
          weekNumber: formResponse.weekNumber,
          year: formResponse.year,
          submittedAt: formResponse.submittedAt,
          formType: formResponse.formType
        });
      }
    }

    // Group responses by week
    const weeklyMap = new Map();
    
    questionResponses.forEach(response => {
      const weekKey = response.weekNumber;
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          weekNumber: response.weekNumber,
          year: response.year,
          responses: []
        });
      }
      weeklyMap.get(weekKey).responses.push(response);
    });

    // Convert to array and sort by week number
    const weeklyData = Array.from(weeklyMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);

    // Calculate total responses
    const totalResponses = questionResponses.length;

    res.status(200).json({
      weeklyData,
      selectedQuestion,
      totalResponses,
      totalWeeks: weeklyData.length
    });

  } catch (error) {
    console.error('Error fetching weekly recurring question responses:', error);
    res.status(500).json({ 
      message: 'Failed to fetch weekly responses',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}