import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import Response from '../../models/Response';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    const { id } = req.query;

    try {
      // First, check if the response exists at all
      const responseExists = await Response.findById(id);
      console.log('Response exists:', !!responseExists);
      
      if (!responseExists) {
        return res.status(404).json({ 
          error: 'Response not found',
          id: id,
          exists: false
        });
      }

      // Check user's wards if coordinator
      let userWards = [];
      if (session.user.role === 'coordinator') {
        userWards = await Ward.find({ coordinator: session.user.id }).select('_id name');
        console.log('User wards:', userWards.map(w => ({ id: w._id, name: w.name })));
      }

      // Get all responses for this coordinator to see what they can access
      const accessibleResponses = await Response.find({
        $or: [
          { district: session.user.district },
          { ward: { $in: userWards.map(w => w._id) } },
          { respondent: session.user.id }
        ]
      }).select('_id formType weekNumber year district ward respondent').populate('ward', 'name');

      console.log('Accessible responses:', accessibleResponses.length);

      return res.status(200).json({
        requestedId: id,
        responseExists: true,
        userRole: session.user.role,
        userDistrict: session.user.district,
        userWards: userWards.map(w => ({ id: w._id, name: w.name })),
        accessibleResponsesCount: accessibleResponses.length,
        accessibleResponses: accessibleResponses.map(r => ({
          id: r._id,
          formType: r.formType,
          week: r.weekNumber,
          year: r.year,
          district: r.district,
          ward: r.ward?.name,
          isOwnResponse: r.respondent.toString() === session.user.id
        })),
        targetResponseInAccessible: accessibleResponses.some(r => r._id.toString() === id)
      });
    } catch (error) {
      console.error('Test error:', error);
      return res.status(500).json({ 
        error: 'Test failed', 
        details: error.message 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}