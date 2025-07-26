import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    // Find wards assigned to this coordinator
    const wards = await Ward.find({ 
      coordinator: session.user.id 
    })
    .populate('wardAdmin', 'name email phone')
    .populate('coordinator', 'name email')
    .sort({ wardNumber: 1 });

    // Add additional statistics for each ward
    const wardsWithStats = await Promise.all(
      wards.map(async (ward) => {
        // You can add more statistics here based on your needs
        // For now, using mock data structure
        return {
          ...ward.toObject(),
          totalReports: Math.floor(Math.random() * 20) + 5,
          pendingReports: Math.floor(Math.random() * 3),
          lastReportDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        };
      })
    );

    res.status(200).json(wardsWithStats);
  } catch (error) {
    console.error('Error fetching coordinator wards:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}