import { getSession } from 'next-auth/react';
import dbConnect from '../../lib/mongodb';
import Ward from '../../models/Ward';
import WardVisit from '../../models/WardVisit';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session);
    case 'POST':
      return handlePost(req, res, session);
    case 'PUT':
      return handlePut(req, res, session);
    case 'DELETE':
      return handleDelete(req, res, session);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function handleGet(req, res, session) {
  try {
    const { wardId, limit = 50, page = 1 } = req.query;
    let query = {};

    if (session.user.role === 'coordinator') {
      // Get all wards for coordinator
      const wards = await Ward.find({ coordinator: session.user.id }).select('_id');
      query.ward = { $in: wards.map(w => w._id) };
      
      if (wardId) {
        // Verify ward belongs to coordinator
        const ward = await Ward.findOne({ _id: wardId, coordinator: session.user.id });
        if (!ward) {
          return res.status(403).json({ message: 'Access denied to this ward' });
        }
        query.ward = wardId;
      }
    } else if (session.user.role === 'wardAdmin') {
      // Get ward for ward admin
      const ward = await Ward.findOne({ wardAdmin: session.user.id });
      if (!ward) {
        return res.status(403).json({ message: 'No ward assigned to you' });
      }
      query.ward = ward._id;
      
      if (wardId && wardId !== ward._id.toString()) {
        return res.status(403).json({ message: 'Access denied to this ward' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get visits with populated data
    const visits = await WardVisit.find(query)
      .populate('ward', 'name wardNumber district panchayath wardAdmin')
      .populate('coordinator', 'name email')
      .populate('recordedBy', 'name email role')
      .populate({
        path: 'ward',
        populate: {
          path: 'wardAdmin',
          select: 'name email'
        }
      })
      .sort({ visitDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalVisits = await WardVisit.countDocuments(query);

    res.status(200).json(visits);
  } catch (error) {
    console.error('Error fetching ward visits:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handlePost(req, res, session) {
  try {
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

    // Verify access to ward
    let wardDoc;
    if (session.user.role === 'coordinator') {
      wardDoc = await Ward.findOne({ _id: ward, coordinator: session.user.id });
    } else if (session.user.role === 'wardAdmin') {
      wardDoc = await Ward.findOne({ _id: ward, wardAdmin: session.user.id });
    }

    if (!wardDoc) {
      return res.status(403).json({ message: 'Access denied to this ward' });
    }

    // Create new visit
    const newVisit = new WardVisit({
      ward,
      coordinator: session.user.role === 'coordinator' ? session.user.id : wardDoc.coordinator,
      visitDate: new Date(visitDate),
      visitTime: visitTime || '10:00',
      purpose,
      findings: findings || '',
      recommendations: recommendations || '',
      followUpRequired: followUpRequired || false,
      followUpDate: followUpRequired && followUpDate ? new Date(followUpDate) : null,
      attendees: attendees || '',
      remarks: remarks || '',
      recordedBy: session.user.id,
      recordedByRole: session.user.role
    });

    await newVisit.save();

    // Populate the response
    const populatedVisit = await WardVisit.findById(newVisit._id)
      .populate('ward', 'name wardNumber district panchayath wardAdmin')
      .populate('coordinator', 'name email')
      .populate('recordedBy', 'name email role')
      .populate({
        path: 'ward',
        populate: {
          path: 'wardAdmin',
          select: 'name email'
        }
      });

    res.status(201).json(populatedVisit);
  } catch (error) {
    console.error('Error creating ward visit:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handlePut(req, res, session) {
  try {
    const { visitId } = req.query;
    const updateData = req.body;

    if (!visitId) {
      return res.status(400).json({ message: 'Visit ID is required' });
    }

    // Find the visit
    const visit = await WardVisit.findById(visitId).populate('ward');
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    // Verify access
    let hasAccess = false;
    if (session.user.role === 'coordinator') {
      hasAccess = visit.ward.coordinator.toString() === session.user.id;
    } else if (session.user.role === 'wardAdmin') {
      hasAccess = visit.ward.wardAdmin?.toString() === session.user.id;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this visit' });
    }

    // Update the visit
    const updatedVisit = await WardVisit.findByIdAndUpdate(
      visitId,
      {
        ...updateData,
        followUpDate: updateData.followUpRequired && updateData.followUpDate 
          ? new Date(updateData.followUpDate) 
          : null
      },
      { new: true }
    )
    .populate('ward', 'name wardNumber district panchayath wardAdmin')
    .populate('coordinator', 'name email')
    .populate('recordedBy', 'name email role')
    .populate({
      path: 'ward',
      populate: {
        path: 'wardAdmin',
        select: 'name email'
      }
    });

    res.status(200).json(updatedVisit);
  } catch (error) {
    console.error('Error updating ward visit:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleDelete(req, res, session) {
  try {
    const { visitId } = req.query;

    if (!visitId) {
      return res.status(400).json({ message: 'Visit ID is required' });
    }

    // Find the visit
    const visit = await WardVisit.findById(visitId).populate('ward');
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    // Verify access
    let hasAccess = false;
    if (session.user.role === 'coordinator') {
      hasAccess = visit.ward.coordinator.toString() === session.user.id;
    } else if (session.user.role === 'wardAdmin') {
      hasAccess = visit.ward.wardAdmin?.toString() === session.user.id;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this visit' });
    }

    // Delete the visit
    await WardVisit.findByIdAndDelete(visitId);

    res.status(200).json({ message: 'Visit deleted successfully' });
  } catch (error) {
    console.error('Error deleting ward visit:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}