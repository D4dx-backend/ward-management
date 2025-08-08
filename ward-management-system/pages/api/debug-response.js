import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import Response from '../../models/Response';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Response ID is required' });
    }

    try {
      console.log('Debug - Fetching response with ID:', id);
      console.log('Debug - User session:', { 
        id: session.user.id, 
        role: session.user.role, 
        district: session.user.district 
      });
      
      // Find the response by ID and populate related data
      const response = await Response.findById(id)
        .populate('respondent', 'name email role')
        .populate({
          path: 'ward',
          select: 'name district coordinator',
          populate: {
            path: 'coordinator',
            select: 'name _id'
          }
        })
        .populate('formTemplate', 'title fields formType allowEditAfterSubmission closeDateTime')
        .lean();

      if (!response) {
        console.log('Debug - Response not found for ID:', id);
        return res.status(404).json({ error: 'Response not found' });
      }
      
      console.log('Debug - Found response:', {
        id: response._id,
        district: response.district,
        wardId: response.ward?._id,
        wardName: response.ward?.name,
        wardDistrict: response.ward?.district,
        wardCoordinator: response.ward?.coordinator?._id,
        wardCoordinatorName: response.ward?.coordinator?.name,
        respondentId: response.respondent._id,
        respondentName: response.respondent.name,
        formType: response.formType
      });

      // Return debug information
      return res.status(200).json({
        response: response,
        session: {
          userId: session.user.id,
          userRole: session.user.role,
          userDistrict: session.user.district
        },
        accessChecks: {
          districtMatch: response.district === session.user.district,
          isWardCoordinator: response.ward?.coordinator?._id?.toString() === session.user.id,
          isOwnResponse: response.respondent._id.toString() === session.user.id
        }
      });
    } catch (error) {
      console.error('Debug - Error fetching response:', error);
      
      // Handle invalid ObjectId
      if (error.name === 'CastError') {
        return res.status(404).json({ error: 'Invalid response ID format' });
      }
      
      return res.status(500).json({ error: 'Failed to fetch response', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}