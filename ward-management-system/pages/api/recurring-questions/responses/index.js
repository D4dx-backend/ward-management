import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import RecurringQuestion from '../../../../models/RecurringQuestion';
import RecurringQuestionResponse from '../../../../models/RecurringQuestionResponse';
import Ward from '../../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session);
    case 'POST':
      return handlePost(req, res, session);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req, res, session) {
  try {
    const { questionId, formType, weekNumber, year, wardId, clusterId } = req.query;
    
    let query = { user: session.user.id };
    
    if (questionId) query.question = questionId;
    if (formType) query.formType = formType;
    if (weekNumber) query.weekNumber = parseInt(weekNumber);
    if (year) query.year = parseInt(year);
    if (wardId) query.ward = wardId;
    if (clusterId) query.cluster = clusterId;

    const responses = await RecurringQuestionResponse.find(query)
      .populate('question', 'title question fieldType recurringCondition expectedValue')
      .populate('ward', 'name wardNumber')
      .populate('cluster', 'name description')
      .sort({ createdAt: -1 });

    res.status(200).json(responses);
  } catch (error) {
    console.error('Error fetching recurring question responses:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function handlePost(req, res, session) {
  try {
    const { questionId, answer, formType, weekNumber, year, wardId, clusterId } = req.body;

    if (!questionId || !answer || !formType || !weekNumber || !year) {
      return res.status(400).json({ message: 'Question ID, answer, form type, week number, and year are required' });
    }

    // Get the recurring question
    const question = await RecurringQuestion.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Recurring question not found' });
    }

    // Verify ward access if wardId is provided
    if (wardId) {
      let hasAccess = false;
      if (session.user.role === 'wardAdmin') {
        const ward = await Ward.findOne({ _id: wardId, wardAdmin: session.user.id });
        hasAccess = !!ward;
      } else if (session.user.role === 'coordinator') {
        const ward = await Ward.findOne({ _id: wardId, coordinator: session.user.id });
        hasAccess = !!ward;
      } else if (session.user.role === 'stateAdmin') {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this ward' });
      }
    }

    // Find or create response record
    let response = await RecurringQuestionResponse.findOne({
      question: questionId,
      user: session.user.id,
      formType,
      weekNumber,
      year,
      ward: wardId || null,
      cluster: clusterId || null,
    });

    if (!response) {
      response = new RecurringQuestionResponse({
        question: questionId,
        user: session.user.id,
        formType,
        weekNumber,
        year,
        ward: wardId || null,
        cluster: clusterId || null,
        attempts: [],
      });
    }

    // Check if already completed
    if (response.isCompleted) {
      return res.status(400).json({ message: 'This question has already been completed' });
    }

    // Check max attempts
    if (response.attempts.length >= question.maxAttempts) {
      return res.status(400).json({ message: 'Maximum attempts reached for this question' });
    }

    // Validate the answer based on recurring condition
    const isAccepted = validateRecurringAnswer(question, answer);
    let rejectionReason = null;

    if (!isAccepted) {
      rejectionReason = getRecurringRejectionReason(question, answer);
    }

    // Add the attempt
    response.attempts.push({
      answer,
      isAccepted,
      rejectionReason,
    });

    await response.save();

    // Populate the response for return
    const populatedResponse = await RecurringQuestionResponse.findById(response._id)
      .populate('question', 'title question fieldType recurringCondition expectedValue recurringMessage maxAttempts')
      .populate('ward', 'name wardNumber')
      .populate('cluster', 'name description');

    res.status(201).json({
      response: populatedResponse,
      isAccepted,
      isCompleted: response.isCompleted,
      attemptsRemaining: question.maxAttempts - response.attempts.length,
      message: isAccepted ? 'Answer accepted!' : question.recurringMessage,
    });
  } catch (error) {
    console.error('Error saving recurring question response:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

function validateRecurringAnswer(question, answer) {
  if (!question.isRecurring) {
    return true; // Non-recurring questions are always accepted
  }

  switch (question.recurringCondition) {
    case 'until_yes':
      return answer === 'yes' || answer === true || answer === 'Yes' || answer === 'YES';
    
    case 'until_no':
      return answer === 'no' || answer === false || answer === 'No' || answer === 'NO';
    
    case 'until_specific_value':
      if (Array.isArray(question.expectedValue)) {
        return question.expectedValue.includes(answer);
      }
      return answer === question.expectedValue;
    
    case 'until_minimum_count':
      if (Array.isArray(answer)) {
        return answer.length >= question.expectedValue;
      }
      return false;
    
    case 'until_all_selected':
      if (Array.isArray(answer) && Array.isArray(question.options)) {
        return question.options.every(option => answer.includes(option));
      }
      return false;
    
    default:
      return true;
  }
}

function getRecurringRejectionReason(question, answer) {
  switch (question.recurringCondition) {
    case 'until_yes':
      return 'Please select "Yes" to continue.';
    
    case 'until_no':
      return 'Please select "No" to continue.';
    
    case 'until_specific_value':
      if (Array.isArray(question.expectedValue)) {
        return `Please select one of: ${question.expectedValue.join(', ')}`;
      }
      return `Please select "${question.expectedValue}" to continue.`;
    
    case 'until_minimum_count':
      return `Please select at least ${question.expectedValue} options.`;
    
    case 'until_all_selected':
      return 'Please select all available options.';
    
    default:
      return 'Please provide the required answer.';
  }
}