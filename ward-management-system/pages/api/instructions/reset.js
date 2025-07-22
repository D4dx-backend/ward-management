import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Instruction from '../../../models/Instruction';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  await dbConnect();

  try {
    // Delete all existing instructions
    await Instruction.deleteMany({});
    
    // Create a clean sample instruction
    const sampleInstruction = new Instruction({
      title: 'Sample Instruction',
      description: 'This is a clean sample instruction to test the system.',
      priority: 'medium',
      targetAudience: 'all',
      createdBy: session.user.id,
      isActive: true
    });
    
    await sampleInstruction.save();

    res.status(200).json({
      message: 'Instructions reset successfully',
      created: 1
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
}