import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import WardVisit from '../../../models/WardVisit';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    if (req.method === 'GET') {
      // Get all visits for this coordinator
      const visits = await WardVisit.find({ 
        coordinator: session.user.id 
      })
      .populate('ward', 'name wardNumber district')
      .populate('coordinator', 'name email')
      .sort({ visitDate: -1, createdAt: -1 });

      res.status(200).json(visits);
    } else if (req.method === 'POST') {
      // Create new visit record
      const {
        ward,
        visitDate,
        visitTime,
        purpose,
        findings,
        recommendations,
        followUpRequired,
        followUpDate,
        attendees,
        remarks
      } = req.body;

      // Validate required fields
      if (!ward || !visitDate || !purpose) {
        return res.status(400).json({ message: 'Ward, visit date, and purpose are required' });
      }

      // Verify ward belongs to this coordinator
      const wardDoc = await Ward.findOne({ 
        _id: ward, 
        coordinator: session.user.id 
      });

      if (!wardDoc) {
        return res.status(403).json({ message: 'You can only record visits for wards under your coordination' });
      }

      // Create visit record
      const visit = new WardVisit({
        ward,
        coordinator: session.user.id,
        visitDate: new Date(visitDate),
        visitTime,
        purpose,
        findings,
        recommendations,
        followUpRequired: followUpRequired || false,
        followUpDate: followUpRequired && followUpDate ? new Date(followUpDate) : null,
        attendees,
        remarks
      });

      await visit.save();

      // Populate the response
      await visit.populate('ward', 'name wardNumber district');
      await visit.populate('coordinator', 'name email');

      res.status(201).json(visit);
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling ward visits:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}