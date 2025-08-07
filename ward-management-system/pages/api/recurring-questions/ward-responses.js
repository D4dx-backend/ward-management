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
    if (!session || session.user.role !== 'coordinator') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { wardId, weekNumber, year } = req.query;

    if (!wardId || !weekNumber || !year) {
      return res.status(400).json({ message: 'Ward ID, week number, and year are required' });
    }

    // Get ward information
    const ward = await Ward.findById(wardId);
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    // Get all recurring questions
    const recurringQuestions = await RecurringQuestion.find({ isActive: true });
    const questionTexts = recurringQuestions.map(q => q.questionText);

    // Find responses for this ward, week, and year that contain recurring questions
    const responses = await Response.find({
      ward: wardId,
      weekNumber: parseInt(weekNumber),
      year: parseInt(year)
    })
    .populate('formTemplate', 'title')
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
              question,
              answer,
              formTitle: response.formTemplate?.title,
              submittedAt: response.submittedAt,
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

    const result = {
      wardId,
      wardName: ward.name,
      weekNumber: parseInt(weekNumber),
      year: parseInt(year),
      responses: uniqueResponses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching ward recurring questions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}