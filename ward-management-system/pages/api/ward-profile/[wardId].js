import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';
import WardBasicForm from '../../../models/WardBasicForm';
import WardBasicData from '../../../models/WardBasicData';
import Cluster from '../../../models/Cluster';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { wardId } = req.query;

  try {
    await connectToDatabase();

    console.log('Ward profile request:', {
      wardId,
      userId: session.user.id,
      userRole: session.user.role
    });

    // Verify user has access to this ward
    const hasAccess = await verifyWardAccess(session.user, wardId);
    console.log('Access verification result:', hasAccess);
    
    if (!hasAccess) {
      console.log('Access denied for user:', session.user.id, 'to ward:', wardId);
      return res.status(403).json({ message: 'Access denied to this ward' });
    }

    // Get ward details with coordinator info
    const ward = await Ward.findById(wardId)
      .populate('coordinator', 'name email mobileNumber')
      .lean();

    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    // Get clusters for this ward
    const clusters = await Cluster.find({ ward: wardId })
      .populate('coordinator', 'name mobileNumber')
      .lean();

    // Get active ward basic form (advanced data form)
    const activeForm = await WardBasicForm.findOne({ isActive: true }).lean();
    
    let advancedData = null;
    let clusterAdvancedData = {};

    if (activeForm) {
      // Get ward's advanced data responses
      const wardData = await WardBasicData.findOne({
        ward: wardId,
        form: activeForm._id
      }).lean();

      // Always return the form structure if there's an active form
      advancedData = {
        form: activeForm,
        responses: wardData ? wardData.data : {},
        clusterResponses: wardData ? (wardData.clusterData || {}) : {},
        submittedAt: wardData ? wardData.submittedAt : null,
        submittedBy: wardData ? wardData.submittedBy : null,
        hasData: !!wardData
      };
    }

    const profileData = {
      ward,
      clusters,
      advancedData,
      hasAdvancedForm: !!activeForm
    };

    res.status(200).json(profileData);
  } catch (error) {
    console.error('Error fetching ward profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function verifyWardAccess(user, wardId) {
  try {
    console.log('Verifying access for:', { userId: user.id, role: user.role, wardId });

    if (user.role === 'stateAdmin') {
      console.log('State admin access granted');
      return true; // State admin has access to all wards
    }

    if (user.role === 'coordinator') {
      // Check if coordinator has access to this ward
      const ward = await Ward.findOne({
        _id: wardId,
        coordinator: user.id
      });
      console.log('Coordinator ward check result:', !!ward);
      return !!ward;
    }

    if (user.role === 'wardAdmin') {
      // Check if Ward Incharge is assigned to this ward
      const ward = await Ward.findOne({
        _id: wardId,
        wardAdmin: user.id
      });
      console.log('Ward Incharge ward check result:', !!ward);
      console.log('Ward found:', ward ? { id: ward._id, name: ward.name, wardAdmin: ward.wardAdmin } : null);
      return !!ward;
    }

    console.log('No role match, access denied');
    return false;
  } catch (error) {
    console.error('Error verifying ward access:', error);
    return false;
  }
}