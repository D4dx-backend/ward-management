import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import WardBasicData from '../../../models/WardBasicData';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session, id);
    case 'PUT':
      return handlePut(req, res, session, id);
    case 'DELETE':
      return handleDelete(req, res, session, id);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req, res, session, id) {
  try {
    const data = await WardBasicData.findById(id)
      .populate('ward', 'name wardNumber panchayath district')
      .populate('form', 'title version fields')
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name email');

    if (!data) {
      return res.status(404).json({ message: 'Data not found' });
    }

    // Check access permissions
    if (session.user.role === 'wardAdmin') {
      const ward = await Ward.findOne({ _id: data.ward._id, wardAdmin: session.user.id });
      if (!ward) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (session.user.role === 'coordinator') {
      const ward = await Ward.findOne({ _id: data.ward._id, coordinator: session.user.id });
      if (!ward) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    // State admins can access all data

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ward basic data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handlePut(req, res, session, id) {
  try {
    const { status, reviewComments, data: formData, clusterData } = req.body;

    console.log('Ward Basic Data Update Request:', {
      id,
      status,
      hasFormData: !!formData,
      hasClusterData: !!clusterData,
      userId: session.user.id
    });

    const existingData = await WardBasicData.findById(id);
    if (!existingData) {
      return res.status(404).json({ message: 'Data not found' });
    }

    // Check access permissions
    let hasAccess = false;
    if (session.user.role === 'stateAdmin') {
      hasAccess = true;
    } else if (session.user.role === 'coordinator') {
      const ward = await Ward.findOne({ _id: existingData.ward, coordinator: session.user.id });
      hasAccess = !!ward;
    } else if (session.user.role === 'wardAdmin') {
      const ward = await Ward.findOne({ _id: existingData.ward, wardAdmin: session.user.id });
      hasAccess = !!ward;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update data
    const updateData = {};
    
    // Update form data if provided
    if (formData !== undefined) {
      console.log('Updating form data');
      updateData.data = formData;
      updateData.submittedBy = session.user.id;
      updateData.submittedAt = new Date();
      // Reset review status when data is updated
      updateData.status = 'submitted';
      updateData.reviewedBy = undefined;
      updateData.reviewedAt = undefined;
      updateData.reviewComments = undefined;
    }
    
    // Update cluster data if provided
    if (clusterData !== undefined) {
      console.log('Updating cluster data');
      updateData.clusterData = clusterData;
    }
    
    // Update status and review info (for admin/coordinator reviews)
    if (status !== undefined && !formData) {
      updateData.status = status;
      if (['approved', 'rejected'].includes(status)) {
        updateData.reviewedBy = session.user.id;
        updateData.reviewedAt = new Date();
      }
    }
    
    if (reviewComments !== undefined) {
      updateData.reviewComments = reviewComments;
    }

    console.log('Update data:', Object.keys(updateData));

    const updatedData = await WardBasicData.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('ward', 'name wardNumber panchayath district')
     .populate('form', 'title version')
     .populate('submittedBy', 'name email')
     .populate('reviewedBy', 'name email');

    console.log('Ward basic data updated successfully');
    res.status(200).json(updatedData);
  } catch (error) {
    console.error('Error updating ward basic data:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

async function handleDelete(req, res, session, id) {
  try {
    // Only state admins can delete data
    if (session.user.role !== 'stateAdmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const data = await WardBasicData.findById(id);
    if (!data) {
      return res.status(404).json({ message: 'Data not found' });
    }

    await WardBasicData.findByIdAndDelete(id);

    res.status(200).json({ message: 'Data deleted successfully' });
  } catch (error) {
    console.error('Error deleting ward basic data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}