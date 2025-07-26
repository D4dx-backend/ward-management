import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import connectToDatabase from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await connectToDatabase();

    return res.status(200).json({
      message: 'Connection successful',
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test connection error:', error);
    return res.status(500).json({ 
      message: 'Connection failed', 
      error: error.message 
    });
  }
}