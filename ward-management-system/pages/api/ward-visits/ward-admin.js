import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import WardVisit from '../../../models/WardVisit';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'wardAdmin') {
    return res.status(403).json({ message: 'Access denied. Ward admin role required.' });
  }

  await dbConnect();

  try {
    if (req.method === 'GET') {
      // Find the ward where this user is the ward admin
      const ward = await Ward.findOne({ wardAdmin: session.user.id });
      
      if (!ward) {
        return res.status(404).json({ message: 'No ward assigned to this ward admin' });
      }

      // Get all visits for this ward
      const visits = await WardVisit.find({ ward: ward._id })
        .populate('coordinator', 'name email mobileNumber')
        .populate('ward', 'name wardNumber district')
        .sort({ visitDate: -1, createdAt: -1 });

      res.status(200).json(visits);
    } else if (req.method === 'POST') {
      const {
        visitDate,
        visitTime = '10:00',
        purpose,
        findings,
        recommendations,
        followUpRequired = false,
        followUpDate,
        attendees,
        remarks
      } = req.body;

      // Validation
      if (!visitDate || !purpose) {
        return res.status(400).json({ 
          message: 'Visit date and purpose are required' 
        });
      }

      // Find the ward where this user is the ward admin
      const ward = await Ward.findOne({ wardAdmin: session.user.id });
      
      if (!ward) {
        return res.status(404).json({ message: 'No ward assigned to this ward admin' });
      }

      // Create new visit record
      const visit = new WardVisit({
        ward: ward._id,
        coordinator: session.user.id, // Ward admin recording the visit
        visitDate: new Date(visitDate),
        visitTime,
        purpose,
        findings: findings || '',
        recommendations: recommendations || '',
        followUpRequired: followUpRequired || false,
        followUpDate: followUpRequired && followUpDate ? new Date(followUpDate) : null,
        attendees: attendees || '',
        remarks: remarks || '',
        recordedBy: 'wardAdmin' // Flag to indicate this was recorded by ward admin
      });

      await visit.save();

      // Populate the response
      await visit.populate([
        { path: 'coordinator', select: 'name email mobileNumber' },
        { path: 'ward', select: 'name wardNumber district' }
      ]);

      res.status(201).json(visit);
    } else if (req.method === 'PUT') {
      const { visitId } = req.query;
      const {
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

      if (!visitId) {
        return res.status(400).json({ message: 'Visit ID is required' });
      }

      // Find the ward where this user is the ward admin
      const ward = await Ward.findOne({ wardAdmin: session.user.id });
      
      if (!ward) {
        return res.status(404).json({ message: 'No ward assigned to this ward admin' });
      }

      // Find and update the visit (only if it belongs to this ward admin's ward)
      const visit = await WardVisit.findOne({ 
        _id: visitId, 
        ward: ward._id 
      });

      if (!visit) {
        return res.status(404).json({ message: 'Visit not found or access denied' });
      }

      // Update visit fields
      visit.visitDate = visitDate ? new Date(visitDate) : visit.visitDate;
      visit.visitTime = visitTime || visit.visitTime;
      visit.purpose = purpose || visit.purpose;
      visit.findings = findings || visit.findings;
      visit.recommendations = recommendations || visit.recommendations;
      visit.followUpRequired = followUpRequired !== undefined ? followUpRequired : visit.followUpRequired;
      visit.followUpDate = followUpRequired && followUpDate ? new Date(followUpDate) : null;
      visit.attendees = attendees || visit.attendees;
      visit.remarks = remarks || visit.remarks;

      await visit.save();

      // Populate the response
      await visit.populate([
        { path: 'coordinator', select: 'name email mobileNumber' },
        { path: 'ward', select: 'name wardNumber district' }
      ]);

      res.status(200).json(visit);
    } else if (req.method === 'DELETE') {
      const { visitId } = req.query;

      if (!visitId) {
        return res.status(400).json({ message: 'Visit ID is required' });
      }

      // Find the ward where this user is the ward admin
      const ward = await Ward.findOne({ wardAdmin: session.user.id });
      
      if (!ward) {
        return res.status(404).json({ message: 'No ward assigned to this ward admin' });
      }

      // Find and delete the visit (only if it belongs to this ward admin's ward)
      const visit = await WardVisit.findOne({ 
        _id: visitId, 
        ward: ward._id 
      });

      if (!visit) {
        return res.status(404).json({ message: 'Visit not found or access denied' });
      }

      await WardVisit.findByIdAndDelete(visitId);

      res.status(200).json({ message: 'Visit deleted successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Ward visits API error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}