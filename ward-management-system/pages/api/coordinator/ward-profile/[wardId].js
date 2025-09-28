import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import dbConnect from '../../../../lib/mongodb';
import Ward from '../../../../models/Ward';
import Cluster from '../../../../models/Cluster';
import WardBasicData from '../../../../models/WardBasicData';
import FormTemplate from '../../../../models/FormTemplate';
import Response from '../../../../models/Response';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    const { wardId } = req.query;
    const coordinatorId = session.user.id;

    // Verify ward belongs to coordinator
    const ward = await Ward.findOne({ 
      _id: wardId, 
      coordinator: coordinatorId,
      isActive: true 
    })
    .populate('coordinator', 'name email mobileNumber')
    .populate('wardAdmin', 'name email mobileNumber lastLogin');

    if (!ward) {
      return res.status(403).json({ message: 'Access denied. This ward is not under your coordination.' });
    }

    // Get clusters for this ward
    const clusters = await Cluster.find({ 
      ward: wardId, 
      isActive: true 
    })
    .populate('coordinator', 'name mobileNumber')
    .sort({ clusterNumber: 1 });

    // Get advanced form data
    let advancedData = null;
    
    try {
      // Get the active advanced form template
      const advancedForm = await FormTemplate.findOne({ 
        type: 'advanced',
        isActive: true 
      });

      if (advancedForm) {
        // Get submitted data for this ward
        const submittedData = await WardBasicData.findOne({
          ward: wardId,
          form: advancedForm._id
        });

        advancedData = {
          form: advancedForm,
          hasData: !!submittedData,
          _id: submittedData?._id,
          responses: submittedData?.data || {},
          clusterResponses: submittedData?.clusterData || {},
          submittedAt: submittedData?.submittedAt
        };
      }
    } catch (advancedError) {
      console.error('Error fetching advanced data:', advancedError);
      // Continue without advanced data
    }

    const latestReport = await Response.findOne({ ward: wardId }).sort({ submittedAt: -1 }).lean();

    const profileData = {
      ward: {
        _id: ward._id,
        name: ward.name,
        wardNumber: ward.wardNumber,
        district: ward.district,
        panchayath: ward.panchayath,
        population: ward.population,
        area: ward.area,
        description: ward.description,
        coordinator: ward.coordinator,
        wardAdmin: ward.wardAdmin,
        isActive: ward.isActive,
        createdAt: ward.createdAt,
        updatedAt: ward.updatedAt
      },
      clusters,
      advancedData,
      latestReport,
    };

    res.status(200).json(profileData);

  } catch (error) {
    console.error('Error fetching coordinator ward profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}