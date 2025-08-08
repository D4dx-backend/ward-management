import { getServerSession } from 'next-auth/next';
import { getSession } from 'next-auth/react';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import RecurringQuestion from '../../../models/RecurringQuestion';

export default async function handler(req, res) {
  let session = await getServerSession(req, res, authOptions);
  if (!session) {
    session = await getSession({ req });
  }

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const question = await RecurringQuestion.findById(id)
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');

        if (!question) {
          return res.status(404).json({ message: 'Question not found' });
        }

        res.status(200).json(question);
      } catch (error) {
        console.error('Error fetching recurring question:', error);
        res.status(500).json({ message: 'Failed to fetch recurring question' });
      }
      break;

    case 'PUT':
      try {
        if (session.user.role !== 'stateAdmin') {
          return res.status(403).json({ message: 'Access denied' });
        }

        const updateData = {
          ...req.body,
          updatedBy: session.user.id,
        };

        const question = await RecurringQuestion.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        )
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email');

        if (!question) {
          return res.status(404).json({ message: 'Question not found' });
        }

        res.status(200).json(question);
      } catch (error) {
        console.error('Error updating recurring question:', error);
        res.status(500).json({ message: error.message || 'Failed to update recurring question' });
      }
      break;

    case 'DELETE':
      try {
        if (session.user.role !== 'stateAdmin') {
          return res.status(403).json({ message: 'Access denied' });
        }

        const question = await RecurringQuestion.findByIdAndDelete(id);

        if (!question) {
          return res.status(404).json({ message: 'Question not found' });
        }

        res.status(200).json({ message: 'Question deleted successfully' });
      } catch (error) {
        console.error('Error deleting recurring question:', error);
        res.status(500).json({ message: 'Failed to delete recurring question' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}