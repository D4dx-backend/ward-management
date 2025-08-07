import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import WardVisit from '../../../models/WardVisit';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    if (req.method === 'GET') {
      // Get all wards under this coordinator
      const coordinatorWards = await Ward.find({ coordinator: session.user.id });
      const wardIds = coordinatorWards.map(ward => ward._id);

      // Get all visits for these wards (both coordinator and Ward Incharge recorded)
      const visits = await WardVisit.find({ 
        ward: { $in: wardIds }
      })
      .populate('ward', 'name wardNumber district')
      .populate('coordinator', 'name email role')
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
      await visit.populate([
        { path: 'ward', select: 'name wardNumber district' },
        { path: 'coordinator', select: 'name email' }
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

      // Find the visit and verify it belongs to this coordinator
      const visit = await WardVisit.findById(visitId);

      if (!visit) {
        return res.status(404).json({ message: 'Visit not found' });
      }

      // Verify the visit belongs to this coordinator (either they recorded it or it's for their ward)
      const ward = await Ward.findById(visit.ward);
      if (visit.coordinator.toString() !== session.user.id && ward.coordinator.toString() !== session.user.id) {
        return res.status(403).json({ message: 'Access denied' });
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
        { path: 'ward', select: 'name wardNumber district' },
        { path: 'coordinator', select: 'name email' }
      ]);

      res.status(200).json(visit);
    } else if (req.method === 'DELETE') {
      const { visitId } = req.query;

      if (!visitId) {
        return res.status(400).json({ message: 'Visit ID is required' });
      }

      // Find the visit and verify it belongs to this coordinator
      const visit = await WardVisit.findById(visitId);

      if (!visit) {
        return res.status(404).json({ message: 'Visit not found' });
      }

      // Only allow deletion if the coordinator recorded the visit
      if (visit.coordinator.toString() !== session.user.id) {
        return res.status(403).json({ message: 'You can only delete visits you recorded' });
      }

      await WardVisit.findByIdAndDelete(visitId);

      res.status(200).json({ message: 'Visit deleted successfully' });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling ward visits:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}