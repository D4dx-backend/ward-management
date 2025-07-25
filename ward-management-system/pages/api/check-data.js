import { getSession } from 'next-auth/react';
import connectToDatabase from '../../lib/mongodb';
import User from '../../models/User';
import Ward from '../../models/Ward';
import Response from '../../models/Response';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  try {
    // Get all users
    const users = await User.find({}).select('name role district mobileNumber');
    
    // Get all wards
    const wards = await Ward.find({}).select('name district panchayath wardAdmin coordinator');
    
    // Get all responses
    const responses = await Response.find({}).select('formType district submittedAt respondent');
    
    // Get unique districts
    const userDistricts = [...new Set(users.map(u => u.district).filter(Boolean))];
    const wardDistricts = [...new Set(wards.map(w => w.district).filter(Boolean))];
    const responseDistricts = [...new Set(responses.map(r => r.district).filter(Boolean))];
    
    return res.status(200).json({
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        role: u.role,
        district: u.district,
        mobileNumber: u.mobileNumber
      })),
      wards: wards.map(w => ({
        id: w._id,
        name: w.name,
        district: w.district,
        panchayath: w.panchayath,
        hasAdmin: !!w.wardAdmin,
        coordinator: w.coordinator
      })),
      responses: responses.length,
      districts: {
        fromUsers: userDistricts,
        fromWards: wardDistricts,
        fromResponses: responseDistricts
      }
    });

  } catch (error) {
    console.error('Error checking data:', error);
    return res.status(500).json({ message: 'Error checking data' });
  }
}