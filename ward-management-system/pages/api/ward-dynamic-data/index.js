import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import WardDynamicData from '../../../models/WardDynamicData';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session);
    case 'POST':
      return handlePost(req, res, session);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req, res, session) {
  try {
    const { wardId, category } = req.query;
    
    let query = { isActive: true };
    
    // Role-based filtering
    if (session.user.role === 'wardAdmin') {
      // Ward Incharges can only see their own ward's data
      const ward = await Ward.findOne({ wardAdmin: session.user.id });
      if (!ward) {
        return res.status(403).json({ message: 'No ward assigned' });
      }
      query.ward = ward._id;
    } else if (session.user.role === 'coordinator') {
      // Coordinators can see data from their assigned wards
      const wards = await Ward.find({ coordinator: session.user.id });
      query.ward = { $in: wards.map(w => w._id) };
    }
    // State admins can see all data (no additional filtering)

    if (wardId) query.ward = wardId;
    if (category) query.category = category;

    const data = await WardDynamicData.find(query)
      .populate('ward', 'name wardNumber panchayath district')
      .populate('submittedBy', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching ward dynamic data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handlePost(req, res, session) {
  try {
    const { wardId, category, title, description, data, dataType, tags } = req.body;

    if (!wardId || !category || !title || !data) {
      return res.status(400).json({ message: 'Ward ID, category, title, and data are required' });
    }

    // Verify ward access
    let ward;
    if (session.user.role === 'wardAdmin') {
      ward = await Ward.findOne({ _id: wardId, wardAdmin: session.user.id });
      if (!ward) {
        return res.status(403).json({ message: 'Access denied to this ward' });
      }
    } else if (session.user.role === 'coordinator') {
      ward = await Ward.findOne({ _id: wardId, coordinator: session.user.id });
      if (!ward) {
        return res.status(403).json({ message: 'Access denied to this ward' });
      }
    } else if (session.user.role === 'stateAdmin') {
      ward = await Ward.findById(wardId);
      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create new dynamic data entry
    const dynamicData = new WardDynamicData({
      ward: wardId,
      category,
      title,
      description: description || '',
      data,
      dataType: dataType || 'text',
      tags: tags || [],
      submittedBy: session.user.id,
    });

    await dynamicData.save();
    
    const populatedData = await WardDynamicData.findById(dynamicData._id)
      .populate('ward', 'name wardNumber panchayath district')
      .populate('submittedBy', 'name email');

    res.status(201).json(populatedData);
  } catch (error) {
    console.error('Error saving ward dynamic data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}