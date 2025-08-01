import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectToDatabase();

  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'wardAdmin') {
    return res.status(401).json({ message: 'Unauthorized - Ward admin only' });
  }

  try {
    // Delete all DockerSurvey records
    const result = await DockerSurvey.deleteMany({});
    
    console.log(`Deleted ${result.deletedCount} DockerSurvey records`);
    
    res.status(200).json({
      message: 'All DockerSurvey records cleared successfully',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error clearing DockerSurvey records:', error);
    res.status(500).json({ 
      message: 'Error clearing DockerSurvey records', 
      error: error.message 
    });
  }
}