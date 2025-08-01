import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';
import User from '../../../models/User';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { action } = req.query;

      if (action === 'test-create') {
        // Test instruction creation
        const testInstruction = new Instruction({
          title: 'Test Instruction - ' + new Date().toISOString(),
          description: 'This is a test instruction created for debugging purposes.',
          targetAudience: 'all',
          priority: 'medium',
          createdBy: session.user.id
        });

        await testInstruction.save();
        
        return res.status(200).json({
          success: true,
          message: 'Test instruction created successfully',
          instruction: testInstruction
        });
      }

      if (action === 'test-reply') {
        const { instructionId } = req.query;
        
        if (!instructionId) {
          return res.status(400).json({ error: 'Instruction ID required' });
        }

        const instruction = await Instruction.findById(instructionId);
        
        if (!instruction) {
          return res.status(404).json({ error: 'Instruction not found' });
        }

        // Add test reply
        instruction.replies.push({
          user: session.user.id,
          message: 'Test reply - ' + new Date().toISOString(),
          createdAt: new Date()
        });

        await instruction.save();
        await instruction.populate('replies.user', 'name email role');

        return res.status(200).json({
          success: true,
          message: 'Test reply added successfully',
          replies: instruction.replies
        });
      }

      if (action === 'check-permissions') {
        const user = await User.findById(session.user.id);
        const instructionCount = await Instruction.countDocuments();
        
        return res.status(200).json({
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          permissions: {
            canCreateInstructions: session.user.role === 'stateAdmin',
            canReplyToInstructions: true,
            canViewInstructions: true
          },
          stats: {
            totalInstructions: instructionCount
          }
        });
      }

      // Default: return system status
      const instructionCount = await Instruction.countDocuments();
      const activeInstructions = await Instruction.countDocuments({ isActive: true });
      const recentInstructions = await Instruction.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('createdBy', 'name email');

      res.status(200).json({
        success: true,
        stats: {
          total: instructionCount,
          active: activeInstructions,
          recent: recentInstructions.length
        },
        recentInstructions: recentInstructions.map(inst => ({
          id: inst._id,
          title: inst.title,
          createdAt: inst.createdAt,
          createdBy: inst.createdBy?.name || 'Unknown',
          repliesCount: inst.replies?.length || 0
        }))
      });
    } catch (error) {
      console.error('Debug instructions error:', error);
      res.status(500).json({ 
        error: 'Debug failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}