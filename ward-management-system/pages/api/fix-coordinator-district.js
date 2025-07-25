import { getSession } from 'next-auth/react';
import connectToDatabase from '../../lib/mongodb';
import User from '../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getSession({ req });
  if (!session || session.user.role !== 'coordinator') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();

  try {
    // Get the current coordinator
    const coordinator = await User.findById(session.user.id);
    
    if (!coordinator) {
      return res.status(404).json({ message: 'Coordinator not found' });
    }

    console.log('Current coordinator:', {
      id: coordinator._id,
      name: coordinator.name,
      district: coordinator.district,
      role: coordinator.role
    });

    // If district is null, let's find the most common district from their assigned wards
    if (!coordinator.district) {
      const Ward = (await import('../../models/Ward')).default;
      
      // Find wards assigned to this coordinator
      const coordinatorWards = await Ward.find({ coordinator: coordinator._id });
      
      if (coordinatorWards.length > 0) {
        // Count districts and pick the most common one
        const districtCounts = {};
        coordinatorWards.forEach(ward => {
          districtCounts[ward.district] = (districtCounts[ward.district] || 0) + 1;
        });
        
        // Find the district with the most wards
        const mostCommonDistrict = Object.keys(districtCounts).reduce((a, b) => 
          districtCounts[a] > districtCounts[b] ? a : b
        );
        
        coordinator.district = mostCommonDistrict;
        await coordinator.save();
        
        console.log('Updated coordinator district to:', coordinator.district, 'based on', coordinatorWards.length, 'assigned wards');
      } else {
        // Fallback to default if no wards assigned
        coordinator.district = 'Thiruvananthapuram';
        await coordinator.save();
        
        console.log('Updated coordinator district to default:', coordinator.district);
      }
    }

    return res.status(200).json({
      message: 'Coordinator district checked/updated',
      coordinator: {
        id: coordinator._id,
        name: coordinator.name,
        district: coordinator.district,
        role: coordinator.role
      }
    });

  } catch (error) {
    console.error('Error fixing coordinator district:', error);
    return res.status(500).json({ message: 'Error updating coordinator district' });
  }
}