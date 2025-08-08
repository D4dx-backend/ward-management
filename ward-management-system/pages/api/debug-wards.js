import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let session;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (sessionError) {
    return res.status(401).json({ message: 'Authentication failed' });
  }

  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Access denied - Only state admin can access debug info' });
  }

  try {
    await dbConnect();

    const { wardNumber, panchayath, district, name } = req.query;

    let query = {};
    
    // Build query based on provided parameters
    if (wardNumber) query.wardNumber = wardNumber.trim();
    if (panchayath) query.panchayath = panchayath.trim();
    if (district) query.district = district.trim();
    if (name) query.name = name.trim();

    // Find all wards (including inactive ones) that match the criteria
    const allWards = await Ward.find(query)
      .select('name wardNumber panchayath district isActive createdAt updatedAt deletedAt')
      .sort({ createdAt: -1 })
      .lean();

    // Also find active wards only
    const activeWards = await Ward.find({
      ...query,
      isActive: { $ne: false }
    })
      .select('name wardNumber panchayath district isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      query,
      totalFound: allWards.length,
      activeFound: activeWards.length,
      allWards,
      activeWards,
      debug: {
        message: 'This endpoint helps debug ward conflicts',
        usage: 'Add query parameters: ?wardNumber=123&panchayath=Alangad&district=Ernakulam&name=vsav'
      }
    });

  } catch (error) {
    console.error('Debug wards error:', error);
    return res.status(500).json({ 
      message: 'Debug query failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
}