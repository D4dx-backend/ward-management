import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import connectToDatabase from '../../lib/mongodb';
import Ward from '../../models/Ward';

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
    // Test the exact same query as the wards API
    const query = { isActive: { $ne: false } };
    
    // Count total wards
    const totalCount = await Ward.countDocuments(query);
    
    // Fetch all wards (no limit)
    const allWards = await Ward.find(query)
      .select('name district isActive')
      .sort({ district: 1, name: 1 })
      .lean();
    
    // Fetch with limit 100 for comparison
    const limitedWards = await Ward.find(query)
      .select('name district isActive')
      .sort({ district: 1, name: 1 })
      .limit(100)
      .lean();

    const result = {
      query: JSON.stringify(query),
      totalCount,
      allWardsLength: allWards.length,
      limitedWardsLength: limitedWards.length,
      firstFewWards: allWards.slice(0, 3).map(w => ({ name: w.name, district: w.district })),
      lastFewWards: allWards.slice(-3).map(w => ({ name: w.name, district: w.district })),
      wardsAfter100: allWards.slice(100, 103).map(w => ({ name: w.name, district: w.district }))
    };

    console.log('Ward count test result:', result);
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('Ward count test error:', error);
    return res.status(500).json({ 
      message: 'Error testing ward count',
      error: error.message
    });
  }
}