import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Debug session endpoint called');
    console.log('Headers:', req.headers);
    console.log('Cookies:', req.cookies);
    
    const session = await getServerSession(req, res, authOptions);
    
    console.log('Session result:', session);
    
    if (!session) {
      return res.status(200).json({ 
        message: 'No session found',
        hasSession: false,
        cookies: req.cookies,
        headers: {
          authorization: req.headers.authorization,
          cookie: req.headers.cookie
        }
      });
    }

    return res.status(200).json({
      message: 'Session found',
      hasSession: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        name: session.user.name
      },
      cookies: req.cookies
    });

  } catch (error) {
    console.error('Error in debug session:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}