import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized - No session' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ 
        message: 'Access denied. Coordinator role required.',
        userRole: session.user.role 
      });
    }

    await dbConnect();

    res.status(200).json({ 
      message: 'API working correctly',
      user: {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
        email: session.user.email
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in coordinator test API:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}