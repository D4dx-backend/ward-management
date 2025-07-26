import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import WardBasicForm from '../../../models/WardBasicForm';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const activeForm = await WardBasicForm.findOne({ isActive: true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    if (!activeForm) {
      return res.status(404).json({ message: 'No active form found' });
    }

    res.status(200).json(activeForm);
  } catch (error) {
    console.error('Error fetching active ward basic form:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}