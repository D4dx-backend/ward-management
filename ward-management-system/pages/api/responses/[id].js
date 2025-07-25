import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Response from '../../../models/Response';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;

  await dbConnect();

  try {
    // Find the response by ID and populate related data
    const response = await Response.findById(id)
      .populate('respondent', 'name email role')
      .populate('ward', 'name district')
      .populate('formTemplate', 'title fields formType')
      .lean();

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Check if user has access to this response
    if (session.user.role === 'stateAdmin') {
      // State admin can view all responses
      return res.status(200).json(response);
    } else if (session.user.role === 'coordinator') {
      // Coordinators can only view responses from their district
      if (response.district !== session.user.district) {
        return res.status(403).json({ error: 'Access denied' });
      }
      return res.status(200).json(response);
    } else if (session.user.role === 'wardAdmin') {
      // Ward admins can only view their own responses
      if (response.respondent._id.toString() !== session.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      return res.status(200).json(response);
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
  } catch (error) {
    console.error('Error fetching response:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Response not found' });
    }
    
    res.status(500).json({ error: 'Failed to fetch response' });
  }
}