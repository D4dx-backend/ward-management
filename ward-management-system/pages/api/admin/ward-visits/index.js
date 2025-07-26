import { getSession } from 'next-auth/react';
import dbConnect from '../../../../lib/mongodb';
import WardVisit from '../../../../models/WardVisit';

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

    // Get all ward visits with filters
    const { coordinator, ward, dateFrom, dateTo } = req.query;
    
    const visits = await WardVisit.getByCoordinator(null, {
      coordinator,
      ward,
      dateFrom,
      dateTo
    });

    res.status(200).json(visits);
  } catch (error) {
    console.error('Error fetching ward visits:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}