import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import RecurringQuestion from '../../../models/RecurringQuestion';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session, id);
    case 'PUT':
      return handlePut(req, res, session, id);
    case 'DELETE':
      return handleDelete(req, res, session, id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req, res, session, id) {
  try {
    const question = await RecurringQuestion.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!question) {
      return res.status(404).json({ message: 'Recurring question not found' });
    }

    res.status(200).json(question);
  } catch (error) {
    console.error('Error fetching recurring question:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function handlePut(req, res, session, id) {
  try {
    // Only state admins can update recurring questions
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const question = await RecurringQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Recurring question not found' });
    }

    const {
      question: questionText,
      fieldType,
      options,
      isRecurring,
      recurringCondition,
      expectedValue,
      maxAttempts,
      recurringMessage,
      applicableToForms,
      applicableToClusters,
      applicableToSittingWards,
      validation,
      priority,
      isActive
    } = req.body;

    // Update fields
    const updateData = {
      updatedBy: session.user.id,
    };

    if (questionText !== undefined) updateData.question = questionText;
    if (fieldType !== undefined) updateData.fieldType = fieldType;
    if (options !== undefined) updateData.options = options;
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
    if (recurringCondition !== undefined) updateData.recurringCondition = recurringCondition;
    if (expectedValue !== undefined) updateData.expectedValue = expectedValue;
    if (maxAttempts !== undefined) updateData.maxAttempts = maxAttempts;
    if (recurringMessage !== undefined) updateData.recurringMessage = recurringMessage;
    if (applicableToForms !== undefined) updateData.applicableToForms = applicableToForms;
    if (applicableToClusters !== undefined) updateData.applicableToClusters = applicableToClusters;
    if (applicableToSittingWards !== undefined) updateData.applicableToSittingWards = applicableToSittingWards;
    if (validation !== undefined) updateData.validation = validation;
    if (priority !== undefined) updateData.priority = priority;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedQuestion = await RecurringQuestion.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');

    res.status(200).json(updatedQuestion);
  } catch (error) {
    console.error('Error updating recurring question:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function handleDelete(req, res, session, id) {
  try {
    // Only state admins can delete recurring questions
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const question = await RecurringQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Recurring question not found' });
    }

    await RecurringQuestion.findByIdAndDelete(id);

    res.status(200).json({ message: 'Recurring question deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring question:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}