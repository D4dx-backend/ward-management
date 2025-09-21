import dbConnect from '../../../lib/mongodb';
import Response from '../../../models/Response';
import Ward from '../../../models/Ward';
import RecurringQuestion from '../../../models/RecurringQuestion';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Allow stateAdmin and coordinator to access
    if (!['stateAdmin', 'coordinator'].includes(session.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { wardId } = req.query;

    if (!wardId) {
      return res.status(400).json({ message: 'Ward ID is required' });
    }

    // Get ward information
    const ward = await Ward.findById(wardId);
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    // Get all recurring questions
    const recurringQuestions = await RecurringQuestion.find({ isActive: true });
    const questionTexts = recurringQuestions.map(q => q.questionText);

    // Find responses for this ward that contain recurring questions (all weeks/years)
    const responses = await Response.find({
      ward: wardId
    })
    .populate('formTemplate', 'title')
    .populate('respondent', 'name role')
    .sort({ submittedAt: -1 })
    .limit(100) // Limit for performance
    .lean();

    // Extract recurring question responses
    const recurringResponses = [];

    responses.forEach(response => {
      if (response.responses) {
        Object.entries(response.responses).forEach(([question, answer]) => {
          // Check if this question matches any recurring question
          const matchingQuestion = questionTexts.find(qt => 
            question.toLowerCase().includes(qt.toLowerCase()) ||
            qt.toLowerCase().includes(question.toLowerCase()) ||
            // Check for partial matches
            question.toLowerCase().split(' ').some(word => 
              qt.toLowerCase().includes(word) && word.length > 3
            )
          );

          if (matchingQuestion || 
              question.toLowerCase().includes('recurring') ||
              question.toLowerCase().includes('weekly') ||
              question.toLowerCase().includes('regular')) {
            recurringResponses.push({
              _id: `${response._id}_${question}`,
              question: { question },
              answer,
              formTitle: response.formTemplate?.title,
              user: response.respondent,
              ward: response.ward,
              weekNumber: response.weekNumber,
              year: response.year,
              submittedAt: response.submittedAt,
              formType: response.formType,
              responseId: response._id
            });
          }
        });
      }
    });

    // Remove duplicates based on question text
    const uniqueResponses = recurringResponses.filter((response, index, self) =>
      index === self.findIndex(r => r.question === response.question)
    );

    // Simply return the sorted unique responses
    const sortedResponses = uniqueResponses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    res.status(200).json(sortedResponses);
  } catch (error) {
    console.error('Error fetching ward recurring questions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}