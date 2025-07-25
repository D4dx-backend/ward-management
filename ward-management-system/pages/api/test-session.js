import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import connectToDatabase from '../../lib/mongodb';
import Ward from '../../models/Ward';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    await connectToDatabase();
    
    // Get user's wards if they are a ward admin
    let userWards = [];
    if (session.user.role === 'wardAdmin') {
      userWards = await Ward.find({ wardAdmin: session.user.id });
    }
    
    return res.status(200).json({
      session: {
        user: session.user,
        expires: session.expires
      },
      userWards: userWards.map(ward => ({
        id: ward._id,
        name: ward.name,
        district: ward.district,
        wardAdmin: ward.wardAdmin
      }))
    });
  } catch (error) {
    return res.status(500).json({ 
      message: 'Error testing session', 
      error: error.message 
    });
  }
}