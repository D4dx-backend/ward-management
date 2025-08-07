import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import connectToDatabase from '../../lib/mongodb';
import FormTemplate from '../../models/FormTemplate';
import Response from '../../models/Response';

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
    const now = new Date();
    
    // Test pending forms query
    const pendingQuery = {
      isPublished: true,
      enableDateTime: { $lte: now },
      closeDateTime: { $gte: now },
      formType: 'wardReport'
    };

    const allForms = await FormTemplate.find(pendingQuery).lean();
    
    // Test responses query
    const userResponses = await Response.find({
      respondent: session.user.id
    })
    .populate('formTemplate', 'title formType weekNumber year')
    .lean();
    
    return res.status(200).json({
      message: 'Ward reports API test successful',
      user: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.name
      },
      pendingForms: {
        count: allForms.length,
        forms: allForms.map(f => ({
          id: f._id,
          title: f.title,
          formType: f.formType,
          weekNumber: f.weekNumber,
          year: f.year,
          closeDateTime: f.closeDateTime
        }))
      },
      userResponses: {
        count: userResponses.length,
        responses: userResponses.map(r => ({
          id: r._id,
          formTitle: r.formTemplate?.title,
          submittedAt: r.submittedAt
        }))
      },
      currentTime: now
    });
  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      message: 'Test failed', 
      error: error.message,
      stack: error.stack
    });
  }
}