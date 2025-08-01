import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'wardAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Get the ward admin's ward
    const ward = await Ward.findOne({ wardAdmin: session.user.id });
    
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found for this admin' });
    }

    // Delete the existing survey to force recreation
    const deletedSurvey = await DockerSurvey.findOneAndDelete({ ward: ward._id });
    
    console.log(`Force reset: Deleted survey for ward ${ward._id}`);

    res.status(200).json({
      message: `Survey reset successfully for ward ${ward.name}`,
      deletedSurvey: deletedSurvey ? 'Yes' : 'No survey found'
    });

  } catch (error) {
    console.error('Error resetting survey:', error);
    res.status(500).json({ message: 'Error resetting survey', error: error.message });
  }
}