import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await dbConnect();
    
    // Test database connection
    const mongoose = require('mongoose');
    const connectionState = mongoose.connection.readyState;
    
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    if (connectionState === 1) {
      res.status(200).json({ 
        message: 'Database connection successful',
        state: states[connectionState],
        user: session.user.email
      });
    } else {
      res.status(503).json({ 
        message: 'Database connection failed',
        state: states[connectionState]
      });
    }
  } catch (error) {
    console.error('Database connection test error:', error);
    res.status(500).json({ 
      message: 'Database connection error',
      error: error.message
    });
  }
}