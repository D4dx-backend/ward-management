import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  try {
    // Count all wards
    const totalWards = await Ward.countDocuments();
    
    // Count active wards (same query as dashboard)
    const activeWards = await Ward.countDocuments({ isActive: { $ne: false } });
    
    // Count inactive wards
    const inactiveWards = await Ward.countDocuments({ isActive: false });
    
    // Count wards with null/undefined isActive
    const nullActiveWards = await Ward.countDocuments({ isActive: { $exists: false } });
    
    // Get sample of inactive wards
    const sampleInactiveWards = await Ward.find({ isActive: false })
      .select('name district isActive')
      .limit(5)
      .lean();
    
    // Get sample of null isActive wards
    const sampleNullWards = await Ward.find({ isActive: { $exists: false } })
      .select('name district isActive')
      .limit(5)
      .lean();

    const result = {
      totalWards,
      activeWards,
      inactiveWards,
      nullActiveWards,
      calculation: {
        activeQuery: '{ isActive: { $ne: false } }',
        expectedActive: totalWards - inactiveWards,
        actualActive: activeWards
      },
      samples: {
        inactiveWards: sampleInactiveWards,
        nullActiveWards: sampleNullWards
      }
    };

    console.log('Ward count debug:', result);
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('Ward count debug error:', error);
    return res.status(500).json({ 
      message: 'Error debugging ward count',
      error: error.message
    });
  }
}