import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    await dbConnect();

    // Get unique districts from wards
    const districts = await Ward.distinct('district', { isActive: true });
    
    res.status(200).json(districts.sort());

  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}