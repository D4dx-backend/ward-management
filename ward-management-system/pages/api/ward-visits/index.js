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
      console.log('Fetching ward visits for coordinator:', session.user.id);
      const { wardId } = req.query;

      // Get all wards under this coordinator
      const coordinatorWards = await Ward.find({ 
        coordinator: session.user.id,
        isActive: true 
      });
      
      console.log('Found coordinator wards:', coordinatorWards.length);
      
      const allowedWardIds = coordinatorWards.map(ward => ward._id.toString());

      // If a specific wardId is requested, validate access and filter accordingly
      let queryWardIds;
      if (wardId) {
        if (!allowedWardIds.includes(wardId)) {
          return res.status(403).json({ message: 'Access denied for this ward' });
        }
        queryWardIds = [wardId];
      } else {
        queryWardIds = allowedWardIds;
      }

      // Get all visits for these wards (both coordinator and ward admin recorded)
      const visits = await WardVisit.find({ 
        ward: { $in: queryWardIds }
      })
      .populate('ward', 'name wardNumber district wardAdmin')
      .populate({
        path: 'ward',
        populate: { path: 'wardAdmin', select: 'name email role' }
      })
      .populate('coordinator', 'name email role')
      .populate('recordedBy', 'name email role')
      .sort({ visitDate: -1, createdAt: -1 });

      console.log('Found visits:', visits.length);
      
      // Update any visits that don't have recordedByRole set (migration for old data)
      const visitsToUpdate = visits.filter(visit => !visit.recordedByRole);
      if (visitsToUpdate.length > 0) {
        console.log('Updating', visitsToUpdate.length, 'visits without recordedByRole');
        for (const visit of visitsToUpdate) {
          const isCoordinatorVisit = visit.coordinator?.toString() === session.user.id;
          visit.recordedByRole = isCoordinatorVisit ? 'coordinator' : 'wardAdmin';
          if (isCoordinatorVisit) {
            visit.recordedBy = visit.coordinator;
          } else {
            // Set recordedBy to ward admin if available
            const wardDoc = await Ward.findById(visit.ward).select('wardAdmin').lean();
            visit.recordedBy = wardDoc?.wardAdmin || visit.recordedBy || visit.coordinator;
          }
          await visit.save();
        }
      }
      
      res.status(200).json(visits);
    } else if (req.method === 'POST') {
      // Create new visit record
      const {
        ward,
        visitDate,
        purpose,
        findingsAndRecommendations,
        guest
      } = req.body;

      console.log('Creating new ward visit:', { ward, visitDate, purpose });
      
      // Validate required fields
      if (!ward || !visitDate || !purpose) {
        return res.status(400).json({ message: 'Ward, visit date, and purpose are required' });
      }

      // Verify ward belongs to this coordinator
      const wardDoc = await Ward.findOne({ 
        _id: ward, 
        coordinator: session.user.id,
        isActive: true
      });

      if (!wardDoc) {
        console.log('Ward not found or not under coordination:', ward);
        return res.status(403).json({ message: 'You can only record visits for wards under your coordination' });
      }

      // Create visit record
      const visit = new WardVisit({
        ward,
        coordinator: session.user.id,
        visitDate: new Date(visitDate),
        purpose,
        findingsAndRecommendations: findingsAndRecommendations || '',
        guest: guest || '',
        recordedBy: session.user.id,
        recordedByRole: 'coordinator'
      });

      await visit.save();
      console.log('Ward visit created successfully:', visit._id);

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
        purpose,
        findingsAndRecommendations,
        guest
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
      visit.purpose = purpose || visit.purpose;
      visit.findingsAndRecommendations = findingsAndRecommendations !== undefined ? findingsAndRecommendations : visit.findingsAndRecommendations;
      visit.guest = guest !== undefined ? guest : visit.guest;

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