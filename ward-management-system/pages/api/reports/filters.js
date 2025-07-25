import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import Ward from '../../../models/Ward';
import { KERALA_DISTRICTS } from '../../../data/kerala-districts';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      let coordinators = [];
      let wards = [];
      
      // Filter based on user role
      if (session.user.role === 'stateAdmin') {
        // State admin can see all coordinators and wards
        coordinators = await User.find({ role: 'coordinator' })
          .select('name email district')
          .sort({ district: 1, name: 1 });
          
        wards = await Ward.find({})
          .populate('wardAdmin', 'name email')
          .sort({ district: 1, name: 1 });
          
      } else if (session.user.role === 'coordinator') {
        // Coordinators can only see their district's wards
        wards = await Ward.find({ district: session.user.district })
          .populate('wardAdmin', 'name email')
          .sort({ name: 1 });
        
      } else if (session.user.role === 'wardAdmin') {
        // Ward admins can only see their own wards
        wards = await Ward.find({ wardAdmin: session.user.id })
          .populate('wardAdmin', 'name email')
          .sort({ name: 1 });
      }
      
      return res.status(200).json({
        coordinators,
        wards
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching filter options', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}