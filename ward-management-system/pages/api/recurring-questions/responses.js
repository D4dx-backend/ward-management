import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Response from '../../../models/Response';
import RecurringQuestion from '../../../models/RecurringQuestion';
import FormTemplate from '../../../models/FormTemplate';
import User from '../../../models/User';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  let session;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (sessionError) {
    console.error('Session error:', sessionError);
    return res.status(401).json({ 
      message: 'Session authentication failed',
      error: process.env.NODE_ENV === 'development' ? sessionError.message : 'Authentication error'
    });
  }

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
      fromWeek,
      toWeek,
      year = new Date().getFullYear(),
      page = 1,
      limit = 50
    } = req.query;

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Responses API called with filters:', {
        questionId,
        coordinatorId,
        wardId,
        districtId,
        fromWeek,
        toWeek,
        year,
        page,
        limit,
        userRole: session.user.role
      });
    }

    // Build query for form responses
    let query = {};

    if (fromWeek || toWeek) {
      query.weekNumber = {};
      if (fromWeek) query.weekNumber.$gte = parseInt(fromWeek);
      if (toWeek) query.weekNumber.$lte = parseInt(toWeek);
    }

    if (year) {
      query.year = parseInt(year);
    }

    // For coordinator role, filter by their assigned wards
    if (session.user.role === 'coordinator') {
      const assignedWards = await Ward.find({ coordinator: session.user.id }).select('_id');
      const wardIds = assignedWards.map(ward => ward._id);
      
      if (wardIds.length > 0) {
        query.ward = { $in: wardIds };
      } else {
        // If coordinator has no assigned wards, return empty result
        if (process.env.NODE_ENV === 'development') {
          console.log('Coordinator has no assigned wards');
        }
        return res.status(200).json({
          responses: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: parseInt(page),
          hasNextPage: false,
          hasPrevPage: false
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
          responses: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: parseInt(page),
          hasNextPage: false,
          hasPrevPage: false
        });
      }
    }

    console.log('Final query:', query);

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

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
        select: 'name district isSittingWard'
      })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('Form responses found:', formResponses.length);

    // Get total count
    const totalCount = await Response.countDocuments(query);

    // Get the selected recurring question if questionId is provided
    let selectedQuestion = null;
    if (questionId) {
      selectedQuestion = await RecurringQuestion.findById(questionId);
      console.log('Selected question:', selectedQuestion?.question);
    }

    // Process responses to extract recurring question answers
    const processedResponses = [];

    for (const formResponse of formResponses) {
      if (!formResponse.formTemplate || !formResponse.formTemplate.fields) continue;

      // If questionId is specified, only show responses for that specific question
      if (questionId && selectedQuestion) {
        // Look for the specific recurring question in the form responses
        const questionFieldId = selectedQuestion.fieldId;
        const questionText = selectedQuestion.question;
        
        // Check if this form response contains the selected recurring question
        let hasSelectedQuestion = false;
        let questionAnswer = null;
        
        // Look through form responses for the question
        for (const [responseKey, responseValue] of Object.entries(formResponse.responses || {})) {
          if (responseKey === questionText || 
              responseKey.includes(questionText.substring(0, 30)) ||
              responseKey.toLowerCase().includes(questionText.toLowerCase().substring(0, 20))) {
            hasSelectedQuestion = true;
            questionAnswer = responseValue;
            console.log('Found question answer by text match:', responseKey, '=', responseValue);
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
                console.log('Found question answer by field match:', field.label, '=', fieldAnswer);
                break;
              }
            }
          }
        }

        if (hasSelectedQuestion) {
          processedResponses.push({
            _id: formResponse._id,
            formTitle: formResponse.formTemplate.title,
            question: selectedQuestion,
            answer: questionAnswer,
            user: formResponse.respondent,
            ward: formResponse.ward,
            weekNumber: formResponse.weekNumber,
            year: formResponse.year,
            submittedAt: formResponse.submittedAt,
            formType: formResponse.formType
          });
        }
      } else {
        // Show all recurring questions from this form response
        // Find recurring questions in the form template
        const recurringFields = formResponse.formTemplate.fields.filter(field => 
          field.isRecurring || field.recurringQuestionId
        );

        console.log('Recurring fields found:', recurringFields.length);

        for (const field of recurringFields) {
          const answer = formResponse.responses[field.label];
          if (answer !== undefined) {
            // Get the full recurring question details if available
            let questionDetails = {
              _id: field.recurringQuestionId || field._id,
              question: field.label,
              fieldType: field.type,
              options: field.options || [],
              fieldId: field.fieldId || `field_${field.label}`
            };

            // Try to get more details from RecurringQuestion model
            if (field.recurringQuestionId) {
              try {
                const fullQuestion = await RecurringQuestion.findById(field.recurringQuestionId);
                if (fullQuestion) {
                  questionDetails = fullQuestion;
                }
              } catch (err) {
                console.log('Could not fetch full question details:', err.message);
              }
            }

            processedResponses.push({
              _id: `${formResponse._id}_${field.label}`,
              formTitle: formResponse.formTemplate.title,
              question: questionDetails,
              answer: answer,
              user: formResponse.respondent,
              ward: formResponse.ward,
              weekNumber: formResponse.weekNumber,
              year: formResponse.year,
              submittedAt: formResponse.submittedAt,
              formType: formResponse.formType
            });

            // Also include sub-questions if they exist
            if (field.subQuestions && field.subQuestions.length > 0) {
              for (const subQuestion of field.subQuestions) {
                const subQuestionKey = `${field.label} - ${subQuestion.label}`;
                const subAnswer = formResponse.responses[subQuestionKey];
                if (subAnswer !== undefined) {
                  processedResponses.push({
                    _id: `${formResponse._id}_${subQuestionKey}`,
                    formTitle: formResponse.formTemplate.title,
                    question: {
                      _id: subQuestion._id || `sub_${subQuestion.label}`,
                      question: `${field.label} → ${subQuestion.label}`,
                      fieldType: subQuestion.type,
                      options: subQuestion.options || [],
                      fieldId: subQuestion.fieldId || `subfield_${subQuestion.label}`,
                      isSubQuestion: true,
                      parentQuestion: field.label
                    },
                    answer: subAnswer,
                    user: formResponse.respondent,
                    ward: formResponse.ward,
                    weekNumber: formResponse.weekNumber,
                    year: formResponse.year,
                    submittedAt: formResponse.submittedAt,
                    formType: formResponse.formType
                  });
                }
              }
            }
          }
        }
      }
    }

    console.log('Processed responses:', processedResponses.length);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const currentPage = parseInt(page);

    const result = {
      responses: processedResponses,
      totalCount: processedResponses.length,
      totalPages: Math.ceil(processedResponses.length / parseInt(limit)),
      currentPage,
      hasNextPage: currentPage < Math.ceil(processedResponses.length / parseInt(limit)),
      hasPrevPage: currentPage > 1
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('Returning result:', {
        responseCount: result.responses.length,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      });
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Error fetching recurring question responses:', error);
    res.status(500).json({ 
      message: 'Failed to fetch responses',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}