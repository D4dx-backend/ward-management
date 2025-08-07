import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import connectToDatabase from '../../../../lib/mongodb';
import Response from '../../../../models/Response';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    
    // Find all responses submitted by the current user
    const responses = await Response.find({
      respondent: session.user.id
    })
    .populate('formTemplate', 'title formType weekNumber year')
    .sort({ submittedAt: -1 })
    .limit(limitNum)
    .lean();
    
    // Transform the data to match the expected format
    const transformedResponses = responses.map(response => ({
      _id: response._id,
      formTemplate: response.formTemplate,
      form: response.formTemplate, // Alias for backward compatibility
      weekNumber: response.formTemplate?.weekNumber,
      year: response.formTemplate?.year,
      submittedAt: response.submittedAt,
      status: 'submitted',
      responses: response.responses
    }));
    
    return res.status(200).json(transformedResponses);
  } catch (error) {
    console.error('Error fetching user responses:', error);
    return res.status(500).json({ 
      message: 'Error fetching user responses', 
      error: error.message 
    });
  }
}