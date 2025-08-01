import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';
import Document from '../../../models/Document';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  try {
    // 1. Check session
    const session = await getServerSession(req, res, authOptions);
    diagnostics.checks.session = {
      status: session ? 'OK' : 'FAILED',
      user: session ? { id: session.user.id, role: session.user.role } : null
    };

    // 2. Check database connection
    try {
      await dbConnect();
      diagnostics.checks.database = { status: 'OK' };
    } catch (error) {
      diagnostics.checks.database = { 
        status: 'FAILED', 
        error: error.message 
      };
    }

    // 3. Check models
    try {
      const instructionCount = await Instruction.countDocuments();
      const documentCount = await Document.countDocuments();
      const userCount = await User.countDocuments();
      
      diagnostics.checks.models = {
        status: 'OK',
        counts: {
          instructions: instructionCount,
          documents: documentCount,
          users: userCount
        }
      };
    } catch (error) {
      diagnostics.checks.models = { 
        status: 'FAILED', 
        error: error.message 
      };
    }

    // 4. Check recent updates
    try {
      const recentInstructions = await Instruction.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title updatedAt createdAt');
      
      const recentDocuments = await Document.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title updatedAt createdAt');

      diagnostics.checks.recentUpdates = {
        status: 'OK',
        instructions: recentInstructions,
        documents: recentDocuments
      };
    } catch (error) {
      diagnostics.checks.recentUpdates = { 
        status: 'FAILED', 
        error: error.message 
      };
    }

    // 5. Check API endpoints
    diagnostics.checks.apiEndpoints = {
      instructions: '/api/instructions',
      documents: '/api/documents',
      status: 'Available'
    };

    // 6. Check environment variables
    diagnostics.checks.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL
    };

    res.status(200).json(diagnostics);

  } catch (error) {
    diagnostics.checks.general = {
      status: 'FAILED',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    res.status(500).json(diagnostics);
  }
}