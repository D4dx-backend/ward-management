import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const { method } = req;

  // Connect to database with error handling
  try {
    await dbConnect();
  } catch (dbError) {
    console.error('Database connection error:', dbError);
    return res.status(503).json({ 
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? dbError.message : 'Service unavailable'
    });
  }

  let session;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (sessionError) {
    console.error('Session error:', sessionError);
    return res.status(401).json({ 
      message: 'Session authentication failed',
      error: process.env.NODE_ENV === 'development' ? sessionError.message : 'Authentication error'
    });
  }

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!session.user) {
    return res.status(401).json({ message: 'Unauthorized - No user in session' });
  }

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    let query = {};
    
    // Filter based on user role
    if (session.user.role === 'coordinator') {
      // Get wards under this coordinator
      const coordinatorWards = await Ward.find({ 
        coordinator: session.user.id 
      }).select('_id');
      
      const wardIds = coordinatorWards.map(ward => ward._id);
      query.ward = { $in: wardIds };
    } else if (session.user.role === 'wardAdmin') {
      // Get only this Ward Incharge's survey
      const ward = await Ward.findOne({ wardAdmin: session.user.id });
      if (ward) {
        query.ward = ward._id;
      } else {
        return res.status(200).json([]);
      }
    }
    // For state admin, no filter needed (can see all)

    const surveys = await DockerSurvey.find(query)
      .populate('ward', 'name wardNumber panchayath district')
      .populate('wardAdmin', 'name email')
      .sort({ lastUpdated: -1 });

    // Calculate summary statistics
    const totalSurveys = surveys.length;
    const completedSurveys = surveys.filter(s => s.completionRate === 100).length;
    const ongoingSurveys = surveys.filter(s => s.completionRate > 0 && s.completionRate < 100).length;
    const notStartedSurveys = surveys.filter(s => s.completionRate === 0).length;
    
    const averageCompletion = totalSurveys > 0 
      ? Math.round(surveys.reduce((sum, s) => sum + s.completionRate, 0) / totalSurveys)
      : 0;

    res.status(200).json({
      surveys,
      statistics: {
        total: totalSurveys,
        completed: completedSurveys,
        ongoing: ongoingSurveys,
        notStarted: notStartedSurveys,
        averageCompletion
      }
    });
  } catch (error) {
    console.error('Error fetching Docket Surveys:', error);
    res.status(500).json({ message: 'Error fetching Docket Surveys' });
  }
}