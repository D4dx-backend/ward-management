import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import WardVisit from '../../../models/WardVisit';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user.role !== 'wardAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  try {
    // First, find the ward admin's ward
    const userWard = await Ward.findOne({ wardAdmin: session.user.id });
    if (!userWard) {
      return res.status(404).json({ message: 'No ward assigned to this user' });
    }

    if (req.method === 'GET') {
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit) : undefined;

      // Find visits for the ward admin's ward
      const visits = await WardVisit.find({ 
        ward: userWard._id 
      })
      .populate('coordinator', 'name email')
      .populate('ward', 'name')
      .sort({ visitDate: -1, visitTime: -1 })
      .limit(limitNum)
      .lean();

      return res.status(200).json(visits);
    }

    if (req.method === 'POST') {
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

      if (!visitDate || !purpose) {
        return res.status(400).json({ message: 'Visit date and purpose are required' });
      }

      const newVisit = new WardVisit({
        ward: userWard._id,
        coordinator: session.user.id,
        visitDate: new Date(visitDate),
        visitTime: visitTime || '10:00',
        purpose,
        findings: findings || '',
        recommendations: recommendations || '',
        followUpRequired: followUpRequired || false,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        attendees: attendees || '',
        remarks: remarks || '',
        recordedBy: session.user.id,
        recordedByRole: 'wardAdmin'
      });

      await newVisit.save();
      
      const populatedVisit = await WardVisit.findById(newVisit._id)
        .populate('coordinator', 'name email')
        .populate('ward', 'name')
        .lean();

      return res.status(201).json(populatedVisit);
    }

    if (req.method === 'PUT') {
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

      const visit = await WardVisit.findById(visitId);
      if (!visit) {
        return res.status(404).json({ message: 'Visit not found' });
      }

      // Check if the visit belongs to the ward admin's ward
      if (visit.ward.toString() !== userWard._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updatedVisit = await WardVisit.findByIdAndUpdate(
        visitId,
        {
          visitDate: visitDate ? new Date(visitDate) : visit.visitDate,
          visitTime: visitTime || visit.visitTime,
          purpose: purpose || visit.purpose,
          findings: findings !== undefined ? findings : visit.findings,
          recommendations: recommendations !== undefined ? recommendations : visit.recommendations,
          followUpRequired: followUpRequired !== undefined ? followUpRequired : visit.followUpRequired,
          followUpDate: followUpDate ? new Date(followUpDate) : (followUpRequired === false ? null : visit.followUpDate),
          attendees: attendees !== undefined ? attendees : visit.attendees,
          remarks: remarks !== undefined ? remarks : visit.remarks,
          updatedAt: new Date()
        },
        { new: true }
      )
      .populate('coordinator', 'name email')
      .populate('ward', 'name')
      .lean();

      return res.status(200).json(updatedVisit);
    }

    if (req.method === 'DELETE') {
      const { visitId } = req.query;

      if (!visitId) {
        return res.status(400).json({ message: 'Visit ID is required' });
      }

      const visit = await WardVisit.findById(visitId);
      if (!visit) {
        return res.status(404).json({ message: 'Visit not found' });
      }

      // Check if the visit belongs to the ward admin's ward
      if (visit.ward.toString() !== userWard._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await WardVisit.findByIdAndDelete(visitId);
      return res.status(200).json({ message: 'Visit deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Ward visits API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}