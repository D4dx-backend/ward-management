import { getSession } from 'next-auth/react';
import dbConnect from '../../lib/mongodb';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only allow stateAdmin, coordinator, and wardAdmin to access this endpoint
  if (!['stateAdmin', 'coordinator', 'wardAdmin'].includes(session.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  await dbConnect();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { district, page = 1, limit = 100 } = req.query;

    // Build query
    let query = {};
    
    // For ward admins, only return their assigned wards
    if (session.user.role === 'wardAdmin') {
      query.wardAdmin = session.user.id;
    } else {
      // For stateAdmin and coordinator, apply district filter if provided
      if (district) {
        query.district = district;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch wards
    const wards = await Ward.find(query)
      .select('name district _id')
      .sort({ district: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalCount = await Ward.countDocuments(query);

    // For backward compatibility, return wards directly for ward admins
    if (session.user.role === 'wardAdmin') {
      res.status(200).json(wards);
    } else {
      res.status(200).json({
        wards,
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        currentPage: parseInt(page)
      });
    }
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ message: 'Failed to fetch wards' });
  }
}