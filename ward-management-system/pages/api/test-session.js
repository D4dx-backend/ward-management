import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    console.log('Test Session API - Raw session:', session);
    
    if (!session) {
      return res.status(401).json({ 
        message: 'No session found',
        hasSession: false
      });
    }

    return res.status(200).json({
      message: 'Session found',
      hasSession: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role
      },
      sessionInfo: {
        expires: session.expires
      }
    });
  } catch (error) {
    console.error('Test Session API error:', error);
    return res.status(500).json({
      message: 'Session test failed',
      error: error.message
    });
  }
}