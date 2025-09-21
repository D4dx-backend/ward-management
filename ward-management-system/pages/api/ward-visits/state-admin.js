import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import WardVisit from '../../../models/WardVisit';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user.role !== 'stateAdmin') {
    console.log('Unauthorized access attempt by:', session?.user?.role || 'unauthenticated user');
    return res.status(401).json({ message: 'Unauthorized - State Admin role required' });
  }

  await connectToDatabase();

  try {
    if (req.method === 'GET') {
      const { limit, ward, district, coordinator } = req.query;
      const limitNum = limit ? parseInt(limit) : undefined;

      // Build query for state admin - can see all visits
      let query = {};
      
      if (ward) query.ward = ward;
      if (coordinator) query.coordinator = coordinator;
      
      // If district is specified, get wards in that district
      if (district) {
        const wardsInDistrict = await Ward.find({ district }).select('_id');
        const wardIds = wardsInDistrict.map(w => w._id);
        query.ward = ward ? ward : { $in: wardIds };
      }

      console.log('State Admin fetching ward visits with query:', query);

      const visits = await WardVisit.find(query)
        .populate('coordinator', 'name email role')
        .populate('recordedBy', 'name email role')
        .populate('ward', 'name wardNumber district')
        .sort({ visitDate: -1, visitTime: -1 })
        .limit(limitNum)
        .lean();

      console.log(`State Admin retrieved ${visits.length} ward visits`);
      return res.status(200).json(visits);
    }

    if (req.method === 'POST') {
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

      console.log('State Admin creating ward visit:', { ward, visitDate, purpose });

      if (!ward || !visitDate || !purpose) {
        return res.status(400).json({ message: 'Ward, visit date, and purpose are required' });
      }

      // Verify ward exists
      const wardDoc = await Ward.findById(ward);
      if (!wardDoc) {
        console.log('Ward not found:', ward);
        return res.status(404).json({ message: 'Ward not found' });
      }

      console.log('Creating visit for ward:', wardDoc.name, 'with coordinator:', wardDoc.coordinator);

      const newVisit = new WardVisit({
        ward: wardDoc._id,
        coordinator: wardDoc.coordinator, // Use the ward's assigned coordinator
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
        recordedByRole: 'stateAdmin'
      });

      await newVisit.save();
      console.log('State Admin ward visit created successfully:', newVisit._id);
      
      const populatedVisit = await WardVisit.findById(newVisit._id)
        .populate('coordinator', 'name email role')
        .populate('recordedBy', 'name email role')
        .populate('ward', 'name wardNumber district')
        .lean();

      return res.status(201).json(populatedVisit);
    }

    if (req.method === 'PUT') {
      const { visitId } = req.query;
      
      if (!visitId) {
        return res.status(400).json({ message: 'Visit ID is required' });
      }

      const visit = await WardVisit.findById(visitId);
      if (!visit) {
        return res.status(404).json({ message: 'Ward visit not found' });
      }

      console.log('State Admin updating ward visit:', visitId);

      const {
        visitDate,
        visitTime,
        purpose,
        findings,
        recommendations,
        followUpRequired,
        followUpDate,
        attendees,
        remarks,
        status
      } = req.body;

      // Update visit fields
      if (visitDate) visit.visitDate = new Date(visitDate);
      if (visitTime) visit.visitTime = visitTime;
      if (purpose) visit.purpose = purpose;
      if (findings !== undefined) visit.findings = findings;
      if (recommendations !== undefined) visit.recommendations = recommendations;
      if (followUpRequired !== undefined) visit.followUpRequired = followUpRequired;
      if (followUpDate !== undefined) visit.followUpDate = followUpDate ? new Date(followUpDate) : null;
      if (attendees !== undefined) visit.attendees = attendees;
      if (remarks !== undefined) visit.remarks = remarks;
      if (status) visit.status = status;

      await visit.save();
      console.log('State Admin ward visit updated successfully:', visitId);

      const populatedVisit = await WardVisit.findById(visitId)
        .populate('coordinator', 'name email role')
        .populate('recordedBy', 'name email role')
        .populate('ward', 'name wardNumber district')
        .lean();

      return res.status(200).json(populatedVisit);
    }

    if (req.method === 'DELETE') {
      const { visitId } = req.query;
      
      if (!visitId) {
        return res.status(400).json({ message: 'Visit ID is required' });
      }

      const visit = await WardVisit.findById(visitId);
      if (!visit) {
        return res.status(404).json({ message: 'Ward visit not found' });
      }

      console.log('State Admin deleting ward visit:', visitId);
      await WardVisit.findByIdAndDelete(visitId);
      console.log('State Admin ward visit deleted successfully:', visitId);

      return res.status(200).json({ message: 'Ward visit deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Error in state admin ward visits API:', error);
    return res.status(500).json({ 
      message: 'Internal server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}
