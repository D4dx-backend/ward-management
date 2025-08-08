import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  let session;
  
  try {
    session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    await connectToDatabase();
  } catch (error) {
    console.error('Initial setup error:', error);
    return res.status(500).json({ message: 'Server initialization error', error: error.message });
  }
  
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      // Find the ward by ID
      const ward = await Ward.findById(id)
        .populate('coordinator', 'name email')
        .populate('wardAdmin', 'name email role')
        .lean();
      
      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }
      
      // Check access permissions
      if (session.user.role === 'coordinator') {
        // Coordinators can only access wards in their district or wards they coordinate
        if (ward.district !== session.user.district && 
            ward.coordinator?._id?.toString() !== session.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else if (session.user.role === 'wardAdmin') {
        // Ward Incharges can only access their own ward
        if (ward.wardAdmin?._id?.toString() !== session.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      // stateAdmin can access all wards
      
      return res.status(200).json(ward);
      
    } catch (error) {
      console.error('Error fetching ward:', error);
      
      // Handle invalid ObjectId
      if (error.name === 'CastError') {
        return res.status(404).json({ message: 'Ward not found' });
      }
      
      return res.status(500).json({ message: 'Error fetching ward', error: error.message });
    }
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (req.method === 'DELETE') {
        // Only state admins can delete wards
        if (session.user.role !== 'stateAdmin') {
          return res.status(403).json({ message: 'Only state admins can delete wards' });
        }
        await Ward.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Ward deleted successfully' });
      }

      if (req.method === 'PUT') {
        // Coordinators cannot modify wards
        if (session.user.role === 'coordinator') {
          return res.status(403).json({ message: 'Coordinators are not allowed to modify wards' });
        }
        // Ward Incharge can only update their own ward
        if (session.user.role === 'wardAdmin') {
          const wardDoc = await Ward.findById(id).select('wardAdmin');
          if (!wardDoc) {
            return res.status(404).json({ message: 'Ward not found' });
          }
          if (wardDoc.wardAdmin?.toString() !== session.user.id) {
            return res.status(403).json({ message: 'Access denied' });
          }
        }

        const updated = await Ward.findByIdAndUpdate(id, req.body, { new: true })
          .populate('coordinator', 'name email')
          .populate('wardAdmin', 'name email role');
        if (!updated) {
          return res.status(404).json({ message: 'Ward not found' });
        }
        return res.status(200).json(updated);
      }
    } catch (error) {
      console.error('Error modifying ward:', error);
      return res.status(500).json({ message: 'Error modifying ward', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}