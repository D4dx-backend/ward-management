import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectToDatabase();

  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'wardAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get the Ward Incharge's ward
    const ward = await Ward.findOne({ wardAdmin: session.user.id });
    
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found for this admin' });
    }

    // Test the my-ward API by making an internal call
    const myWardHandler = require('../docker-survey/my-ward').default;
    
    // Create a mock request/response for testing
    const mockReq = {
      method: 'GET',
      query: {}
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          return res.status(200).json({
            message: 'API test completed',
            statusCode: code,
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            clusterVisitsCount: data?.clusterVisits?.length || 0,
            firstClusterStructure: data?.clusterVisits?.[0] ? {
              hasFormWeeks: !!data.clusterVisits[0].formWeeks,
              hasWeeklyData: !!data.clusterVisits[0].weeklyData,
              formWeeksCount: data.clusterVisits[0].formWeeks?.length || 0,
              weeklyDataKeys: data.clusterVisits[0].weeklyData ? Object.keys(data.clusterVisits[0].weeklyData) : []
            } : null
          });
        }
      }),
      setHeader: () => {},
      end: () => {}
    };

    // Call the my-ward API handler
    await myWardHandler(mockReq, mockRes);

  } catch (error) {
    console.error('Error testing my-ward API:', error);
    res.status(500).json({ 
      message: 'Error testing API', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}