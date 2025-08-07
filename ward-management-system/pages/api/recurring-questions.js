import { getSession } from 'next-auth/react';
import dbConnect from '../../lib/mongodb';
import RecurringQuestion from '../../models/RecurringQuestion';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const questions = await RecurringQuestion.find({})
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .sort({ priority: -1, createdAt: -1 });

        res.status(200).json(questions);
      } catch (error) {
        console.error('Error fetching recurring questions:', error);
        res.status(500).json({ message: 'Failed to fetch recurring questions' });
      }
      break;

    case 'POST':
      try {
        if (session.user.role !== 'stateAdmin') {
          return res.status(403).json({ message: 'Access denied' });
        }

        const questionData = {
          ...req.body,
          createdBy: session.user.id,
          updatedBy: session.user.id,
        };

        const question = new RecurringQuestion(questionData);
        await question.save();

        const populatedQuestion = await RecurringQuestion.findById(question._id)
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');

        res.status(201).json(populatedQuestion);
      } catch (error) {
        console.error('Error creating recurring question:', error);
        res.status(500).json({ message: error.message || 'Failed to create recurring question' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}