import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { clearServerCache } from '../../../lib/serverCache';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Clear all server-side cache
    clearServerCache();
    
    console.log('Server cache cleared by admin:', session.user.name);
    
    return res.status(200).json({ 
      message: 'Server cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return res.status(500).json({ 
      message: 'Error clearing cache',
      error: error.message
    });
  }
}


