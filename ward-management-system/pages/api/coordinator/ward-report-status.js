import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  let session;
  
  try {
    session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Only coordinators can access this endpoint
    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Forbidden - Coordinators only' });
    }
    
    await connectToDatabase();
  } catch (error) {
    console.error('Initial setup error:', error);
    return res.status(500).json({ message: 'Server initialization error', error: error.message });
  }
  
  if (req.method === 'GET') {
    try {
      // Get current week and year
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      // Calculate current week number (simple calculation)
      const startOfYear = new Date(currentYear, 0, 1);
      const pastDaysOfYear = (currentDate - startOfYear) / 86400000;
      const currentWeek = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
      
      // Get last 4 weeks
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        let weekNum = currentWeek - i;
        let year = currentYear;
        
        // Handle year boundary
        if (weekNum <= 0) {
          year = currentYear - 1;
          weekNum = 52 + weekNum; // Assuming 52 weeks per year
        }
        
        weeks.push({ week: weekNum, year });
      }
      
      // Get coordinator's wards
      const coordinatorWards = await Ward.find({ 
        coordinator: session.user.id 
      }).select('name district');
      
      if (coordinatorWards.length === 0) {
        return res.status(200).json([]);
      }
      
      const wardIds = coordinatorWards.map(ward => ward._id);
      
      // Get all ward reports for these wards and weeks
      const reports = await Response.find({
        formType: 'wardReport',
        ward: { $in: wardIds },
        $or: weeks.map(({ week, year }) => ({ weekNumber: week, year }))
      }).populate('ward', 'name district');
      
      // Build the status data
      const wardStatusData = coordinatorWards.map(ward => {
        const wardData = {
          ward: {
            _id: ward._id,
            name: ward.name,
            district: ward.district
          },
          weeks: {}
        };
        
        weeks.forEach(({ week, year }) => {
          const weekKey = `week_${week}_${year}`;
          const hasReport = reports.some(report => 
            report.ward._id.toString() === ward._id.toString() && 
            report.weekNumber === week && 
            report.year === year
          );
          
          const reportData = reports.find(report => 
            report.ward._id.toString() === ward._id.toString() && 
            report.weekNumber === week && 
            report.year === year
          );
          
          wardData.weeks[weekKey] = {
            week,
            year,
            hasReport,
            reportId: reportData ? reportData._id : null,
            submittedAt: reportData ? reportData.submittedAt : null
          };
        });
        
        return wardData;
      });
      
      return res.status(200).json({
        weeks: weeks.map(({ week, year }) => ({ week, year })),
        wardStatus: wardStatusData
      });
      
    } catch (error) {
      console.error('Error fetching ward report status:', error);
      return res.status(500).json({ message: 'Error fetching ward report status', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}