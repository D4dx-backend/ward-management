import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '../../../lib/mongodb';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  try {
    // 1. Check session
    const session = await getServerSession(req, res, authOptions);
    debugInfo.checks.session = {
      status: session ? 'OK' : 'FAILED',
      user: session ? { 
        id: session.user.id, 
        role: session.user.role,
        email: session.user.email,
        district: session.user.district
      } : null
    };

    if (!session || session.user.role !== 'stateAdmin') {
      return res.status(403).json({ 
        ...debugInfo,
        error: 'Access denied - Only state admin can debug ward creation'
      });
    }

    // 2. Check database connection
    try {
      await dbConnect();
      debugInfo.checks.database = { status: 'OK' };
    } catch (error) {
      debugInfo.checks.database = { 
        status: 'FAILED', 
        error: error.message 
      };
      return res.status(500).json(debugInfo);
    }

    // 3. Get input data
    const { name, wardNumber, panchayath, district } = req.body;
    
    if (!name || !wardNumber || !panchayath || !district) {
      return res.status(400).json({
        ...debugInfo,
        error: 'Missing required fields: name, wardNumber, panchayath, district'
      });
    }

    debugInfo.input = { name, wardNumber, panchayath, district };

    // 4. Normalize input data
    const normalizedName = name.trim().toLowerCase();
    const normalizedWardNumber = wardNumber.trim();
    const normalizedPanchayath = panchayath.trim().toLowerCase();
    const normalizedDistrict = district.trim().toLowerCase();

    debugInfo.normalized = {
      normalizedName,
      normalizedWardNumber,
      normalizedPanchayath,
      normalizedDistrict
    };

    // 5. Check for existing wards with same name and district
    const existingWardByName = await Ward.findOne({ 
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
      district: { $regex: new RegExp(`^${normalizedDistrict}$`, 'i') },
      isActive: { $ne: false }
    });

    debugInfo.checks.existingWardByName = {
      found: !!existingWardByName,
      ward: existingWardByName ? {
        id: existingWardByName._id,
        name: existingWardByName.name,
        wardNumber: existingWardByName.wardNumber,
        panchayath: existingWardByName.panchayath,
        district: existingWardByName.district,
        isActive: existingWardByName.isActive
      } : null
    };

    // 6. Check for existing wards with same number in same panchayath
    const existingWardByNumber = await Ward.findOne({ 
      wardNumber: normalizedWardNumber,
      panchayath: { $regex: new RegExp(`^${normalizedPanchayath}$`, 'i') },
      district: { $regex: new RegExp(`^${normalizedDistrict}$`, 'i') },
      isActive: { $ne: false }
    });

    debugInfo.checks.existingWardByNumber = {
      found: !!existingWardByNumber,
      ward: existingWardByNumber ? {
        id: existingWardByNumber._id,
        name: existingWardByNumber.name,
        wardNumber: existingWardByNumber.wardNumber,
        panchayath: existingWardByNumber.panchayath,
        district: existingWardByNumber.district,
        isActive: existingWardByNumber.isActive
      } : null
    };

    // 7. Check all wards in the same panchayath for comparison
    const allWardsInPanchayath = await Ward.find({
      panchayath: { $regex: new RegExp(`^${normalizedPanchayath}$`, 'i') },
      district: { $regex: new RegExp(`^${normalizedDistrict}$`, 'i') },
      isActive: { $ne: false }
    }).select('name wardNumber panchayath district isActive');

    debugInfo.checks.allWardsInPanchayath = {
      count: allWardsInPanchayath.length,
      wards: allWardsInPanchayath.map(ward => ({
        id: ward._id,
        name: ward.name,
        wardNumber: ward.wardNumber,
        panchayath: ward.panchayath,
        district: ward.district,
        isActive: ward.isActive
      }))
    };

    // 8. Determine if creation would succeed
    const canCreate = !existingWardByName && !existingWardByNumber;
    debugInfo.canCreate = canCreate;

    if (!canCreate) {
      debugInfo.blockingReasons = [];
      if (existingWardByName) {
        debugInfo.blockingReasons.push('Ward with same name exists in district');
      }
      if (existingWardByNumber) {
        debugInfo.blockingReasons.push('Ward with same number exists in panchayath');
      }
    }

    res.status(200).json(debugInfo);

  } catch (error) {
    debugInfo.checks.general = {
      status: 'FAILED',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    res.status(500).json(debugInfo);
  }
}