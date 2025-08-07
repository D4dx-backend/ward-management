import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import RecurringQuestion from '../../../models/RecurringQuestion';
import RecurringQuestionResponse from '../../../models/RecurringQuestionResponse';
import User from '../../../models/User';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only allow stateAdmin to create test data
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Get some existing data
    const questions = await RecurringQuestion.find().limit(3);
    const users = await User.find({ role: { $in: ['coordinator', 'wardAdmin'] } }).limit(5);
    const wards = await Ward.find().limit(10);

    if (questions.length === 0 || users.length === 0 || wards.length === 0) {
      return res.status(400).json({ 
        message: 'Need at least some questions, users, and wards to create test data' 
      });
    }

    const testResponses = [];
    const currentYear = new Date().getFullYear();

    // Create some test responses
    for (let i = 0; i < 20; i++) {
      const question = questions[Math.floor(Math.random() * questions.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const ward = wards[Math.floor(Math.random() * wards.length)];
      const weekNumber = Math.floor(Math.random() * 52) + 1;
      const attempts = Math.floor(Math.random() * 3) + 1;

      // Generate sample answers based on field type
      let sampleAnswer;
      switch (question.fieldType) {
        case 'text':
          sampleAnswer = `Sample text answer ${i + 1}`;
          break;
        case 'number':
          sampleAnswer = Math.floor(Math.random() * 100) + 1;
          break;
        case 'select':
          sampleAnswer = question.options?.[Math.floor(Math.random() * (question.options?.length || 1))] || 'Option 1';
          break;
        case 'multiselect':
          const numSelected = Math.floor(Math.random() * Math.min(3, question.options?.length || 1)) + 1;
          sampleAnswer = question.options?.slice(0, numSelected) || ['Option 1'];
          break;
        case 'yesno':
          sampleAnswer = Math.random() > 0.5 ? 'Yes' : 'No';
          break;
        case 'date':
          sampleAnswer = new Date().toISOString().split('T')[0];
          break;
        default:
          sampleAnswer = `Sample answer ${i + 1}`;
      }

      const attemptsList = [];
      for (let j = 0; j < attempts; j++) {
        attemptsList.push({
          answer: j === attempts - 1 ? sampleAnswer : `Attempt ${j + 1}`,
          attemptedAt: new Date(Date.now() - (attempts - j) * 24 * 60 * 60 * 1000),
          isAccepted: j === attempts - 1,
          rejectionReason: j === attempts - 1 ? null : 'Incomplete answer'
        });
      }

      const response = new RecurringQuestionResponse({
        question: question._id,
        user: user._id,
        ward: ward._id,
        formType: Math.random() > 0.5 ? 'coordinatorReport' : 'wardReport',
        weekNumber,
        year: currentYear,
        attempts: attemptsList,
        finalAnswer: sampleAnswer,
        isCompleted: true,
        completedAt: new Date(),
        totalAttempts: attempts
      });

      await response.save();
      testResponses.push(response);
    }

    res.status(200).json({
      message: `Created ${testResponses.length} test responses`,
      responses: testResponses.length
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    res.status(500).json({ 
      message: 'Failed to create test data',
      error: error.message
    });
  }
}