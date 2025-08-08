import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '../../lib/mongodb';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check session
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || session.user.role !== 'stateAdmin') {
      return res.status(403).json({ error: 'Access denied - Only state admin can test ward creation' });
    }

    // Connect to database
    await dbConnect();

    const testResult = {
      timestamp: new Date().toISOString(),
      sessionValid: true,
      databaseConnected: true,
      tests: {}
    };

    // Test 1: Check existing wards count
    const totalWards = await Ward.countDocuments({ isActive: { $ne: false } });
    testResult.tests.totalActiveWards = totalWards;

    // Test 2: Try to find a specific ward pattern
    const testWardName = 'Test Ward Creation';
    const testWardNumber = 'TWC001';
    const testPanchayath = 'Test Panchayath';
    const testDistrict = 'Test District';

    const existingTestWard = await Ward.findOne({
      name: { $regex: new RegExp(`^${testWardName.toLowerCase()}$`, 'i') },
      district: { $regex: new RegExp(`^${testDistrict.toLowerCase()}$`, 'i') },
      isActive: { $ne: false }
    });

    testResult.tests.existingTestWard = {
      found: !!existingTestWard,
      ward: existingTestWard ? {
        id: existingTestWard._id,
        name: existingTestWard.name,
        wardNumber: existingTestWard.wardNumber,
        panchayath: existingTestWard.panchayath,
        district: existingTestWard.district
      } : null
    };

    // Test 3: Check ward number uniqueness
    const existingTestWardNumber = await Ward.findOne({
      wardNumber: testWardNumber,
      panchayath: { $regex: new RegExp(`^${testPanchayath.toLowerCase()}$`, 'i') },
      district: { $regex: new RegExp(`^${testDistrict.toLowerCase()}$`, 'i') },
      isActive: { $ne: false }
    });

    testResult.tests.existingTestWardNumber = {
      found: !!existingTestWardNumber,
      ward: existingTestWardNumber ? {
        id: existingTestWardNumber._id,
        name: existingTestWardNumber.name,
        wardNumber: existingTestWardNumber.wardNumber,
        panchayath: existingTestWardNumber.panchayath,
        district: existingTestWardNumber.district
      } : null
    };

    // Test 4: Check if we can create the test ward
    testResult.tests.canCreateTestWard = !existingTestWard && !existingTestWardNumber;

    // Test 5: Get sample wards from different districts
    const sampleWards = await Ward.find({ isActive: { $ne: false } })
      .limit(5)
      .select('name wardNumber panchayath district')
      .lean();

    testResult.tests.sampleWards = sampleWards.map(ward => ({
      id: ward._id,
      name: ward.name,
      wardNumber: ward.wardNumber,
      panchayath: ward.panchayath,
      district: ward.district
    }));

    // Test 6: Check for potential duplicates in existing data
    const duplicateNames = await Ward.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { 
          _id: { 
            name: { $toLower: "$name" }, 
            district: { $toLower: "$district" } 
          }, 
          count: { $sum: 1 },
          wards: { $push: { id: "$_id", name: "$name", district: "$district" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    testResult.tests.duplicateNames = {
      found: duplicateNames.length > 0,
      count: duplicateNames.length,
      examples: duplicateNames.slice(0, 3)
    };

    const duplicateNumbers = await Ward.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { 
          _id: { 
            wardNumber: "$wardNumber", 
            panchayath: { $toLower: "$panchayath" },
            district: { $toLower: "$district" } 
          }, 
          count: { $sum: 1 },
          wards: { $push: { id: "$_id", name: "$name", wardNumber: "$wardNumber", panchayath: "$panchayath", district: "$district" } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    testResult.tests.duplicateNumbers = {
      found: duplicateNumbers.length > 0,
      count: duplicateNumbers.length,
      examples: duplicateNumbers.slice(0, 3)
    };

    // Test 7: Validation recommendations
    testResult.recommendations = [];
    
    if (duplicateNames.length > 0) {
      testResult.recommendations.push('Clean up duplicate ward names in the same district');
    }
    
    if (duplicateNumbers.length > 0) {
      testResult.recommendations.push('Clean up duplicate ward numbers in the same panchayath');
    }
    
    if (testResult.tests.canCreateTestWard) {
      testResult.recommendations.push('Ward creation should work - no conflicts found');
    } else {
      testResult.recommendations.push('Test ward conflicts with existing data - this is expected');
    }

    res.status(200).json(testResult);

  } catch (error) {
    console.error('Test ward creation error:', error);
    res.status(500).json({ 
      error: 'Test failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}