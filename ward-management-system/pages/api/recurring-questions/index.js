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
    const { formType, isActive, isSittingWard } = req.query;
    
    let query = {};
    
    if (formType) {
      query.$or = [
        { applicableToForms: formType },
        { applicableToForms: 'both' }
      ];
    }
    
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Filter by sitting ward applicability
    if (isSittingWard !== undefined) {
      const sittingWardFilter = isSittingWard === 'true';
      if (sittingWardFilter) {
        // For sitting wards, include both regular questions AND sitting ward specific questions
        // No additional filter needed - all questions are applicable
      } else {
        // For regular wards, exclude sitting ward specific questions
        query.$or = [
          { applicableToSittingWards: { $ne: true } },
          { applicableToSittingWards: { $exists: false } }
        ];
      }
    }

    const questions = await RecurringQuestion.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ priority: -1, createdAt: -1 });

    res.status(200).json(questions);
  } catch (error) {
    console.error('Error fetching recurring questions:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function handlePost(req, res, session) {
  try {
    // Only state admins can create recurring questions
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      question,
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
      priority
    } = req.body;

    // Validation
    if (!question || !fieldType) {
      return res.status(400).json({ message: 'Question and field type are required' });
    }

    if (['select', 'multiselect'].includes(fieldType) && (!options || options.length === 0)) {
      return res.status(400).json({ message: 'Options are required for select/multiselect fields' });
    }

    if (isRecurring && !recurringCondition) {
      return res.status(400).json({ message: 'Recurring condition is required for recurring questions' });
    }

    // Create new recurring question
    const recurringQuestion = new RecurringQuestion({
      question,
      fieldType,
      options: ['select', 'multiselect'].includes(fieldType) ? options : undefined,
      isRecurring: isRecurring || false,
      recurringCondition: isRecurring ? recurringCondition : undefined,
      expectedValue: isRecurring && ['until_specific_value', 'until_minimum_count'].includes(recurringCondition) ? expectedValue : undefined,
      maxAttempts: maxAttempts || 10,
      recurringMessage: recurringMessage || 'Please provide the required answer to continue.',
      applicableToForms: applicableToForms || ['both'],
      applicableToClusters: applicableToClusters || false,
      applicableToSittingWards: applicableToSittingWards || false,
      validation: validation || {},
      priority: priority || 0,
      createdBy: session.user.id,
    });

    await recurringQuestion.save();
    
    const populatedQuestion = await RecurringQuestion.findById(recurringQuestion._id)
      .populate('createdBy', 'name email');

    res.status(201).json(populatedQuestion);
  } catch (error) {
    console.error('Error creating recurring question:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}