import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import Ward from '../../../models/Ward';
import User from '../../../models/User';

export default async function handler(req, res) {
  let session;
  
  try {
    session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      console.log('No session found for ward report status API');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Only state admins can access this endpoint
    if (session.user.role !== 'stateAdmin') {
      console.log('Access denied - not state admin role:', session.user.role);
      return res.status(403).json({ message: 'Forbidden - State Admins only' });
    }
    
    await connectToDatabase();
    console.log('Database connected for admin ward report status');
  } catch (error) {
    console.error('Initial setup error:', error);
    return res.status(500).json({ message: 'Server initialization error', error: error.message });
  }
  
  if (req.method === 'GET') {
    try {
      const { coordinator, page = 1, limit = 10 } = req.query;
      console.log('Query params:', { coordinator, page, limit });
      console.log('Coordinator filter received:', coordinator, 'type:', typeof coordinator, 'length:', coordinator?.length);
      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      
      // Get current week and year
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      // Calculate current week number (simple calculation)
      const startOfYear = new Date(currentYear, 0, 1);
      const pastDaysOfYear = (currentDate - startOfYear) / 86400000;
      const currentWeek = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
      
      // Get last 4 weeks with current week first
      const weeks = [];
      for (let i = 0; i < 4; i++) {
        let weekNum = currentWeek - i;
        let year = currentYear;

        // Handle year boundary
        if (weekNum <= 0) {
          year = currentYear - 1;
          weekNum = 52 + weekNum; // Assuming 52 weeks per year
        }

        weeks.push({ week: weekNum, year });
      }
      
      // Build ward query
      let wardQuery = {};
      if (coordinator && typeof coordinator === 'string' && coordinator.trim() !== '') {
        const mongoose = require('mongoose');
        const trimmedCoordinator = coordinator.trim();
        console.log('Validating coordinator ID:', trimmedCoordinator, 'length:', trimmedCoordinator.length);
        
        // Check if it's a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(trimmedCoordinator)) {
          console.error('Invalid coordinator ID format:', trimmedCoordinator, 'Expected 24 character hex string');
          
          // Get all coordinators for the error response
          const coordinators = await User.find({ role: 'coordinator' })
            .select('name email district')
            .sort({ name: 1 })
            .lean();
          
          return res.status(400).json({ 
            message: `Invalid coordinator ID format: ${trimmedCoordinator}`,
            weeks: weeks.map(({ week, year }) => ({ week, year })),
            wardStatus: [],
            coordinators: coordinators
          });
        }
        
        wardQuery.coordinator = new mongoose.Types.ObjectId(trimmedCoordinator);
        console.log('Filtering by coordinator:', trimmedCoordinator);
      } else {
        console.log('Loading all wards (no coordinator filter)');
      }
      
      // Get total count for pagination
      const totalWards = await Ward.countDocuments(wardQuery);
      
      // Get wards with pagination (either by coordinator filter or all)
      const wards = await Ward.find(wardQuery)
        .populate('coordinator', 'name email')
        .populate('wardAdmin', 'name email mobileNumber')
        .select('name district coordinator wardAdmin')
        .skip(skip)
        .limit(limitNum)
        .sort({ name: 1 });
      
      console.log(`Found ${wards.length} wards (page ${pageNum}, limit ${limitNum}) of ${totalWards} total wards`);
      
      if (wards.length === 0 && pageNum === 1) {
        // Only return coordinators on first page when no wards found
        const coordinators = await User.find({ role: 'coordinator' })
          .select('name email district')
          .sort({ name: 1 })
          .lean();
          
        return res.status(200).json({
          weeks: weeks.map(({ week, year }) => ({ week, year })),
          wardStatus: [],
          coordinators: coordinators,
          pagination: {
            currentPage: pageNum,
            totalPages: 0,
            totalItems: totalWards,
            itemsPerPage: limitNum,
            hasNextPage: false,
            hasPrevPage: false
          }
        });
      }
      
      const wardIds = wards.map(ward => ward._id);
      
      // Get all ward reports for these wards and weeks
      const reports = await Response.find({
        formType: 'wardReport',
        ward: { $in: wardIds },
        $or: weeks.map(({ week, year }) => ({ weekNumber: week, year }))
      })
      .populate('ward', 'name district coordinator')
      .populate('formTemplate', 'title');
      
      console.log(`Found ${reports.length} reports for admin ward report status`);
      
      // Build the status data
      const wardStatusData = wards.map(ward => {
        const wardData = {
          ward: {
            _id: ward._id,
            name: ward.name,
            district: ward.district,
            coordinator: ward.coordinator,
            wardAdmin: ward.wardAdmin
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
            submittedAt: reportData ? reportData.submittedAt : null,
            formName: reportData?.formTemplate?.title || null
          };
        });
        
        return wardData;
      });
      
      // Get all coordinators for the filter dropdown (only on first page)
      let coordinators = [];
      if (pageNum === 1) {
        coordinators = await User.find({ role: 'coordinator' })
          .select('name email district')
          .sort({ name: 1 })
          .lean(); // Use lean() to get plain objects instead of Mongoose documents
        
        // Log coordinators structure for debugging
        coordinators.forEach((coord, index) => {
          if (index < 2) { // Log first 2 coordinators
            console.log(`Coordinator ${index}:`, {
              _id: coord._id,
              _id_type: typeof coord._id,
              _id_toString: coord._id?.toString?.(),
              name: coord.name
            });
          }
        });
      }
      
      const totalPages = Math.ceil(totalWards / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;
      
      console.log(`Returning ${wardStatusData.length} ward statuses and ${coordinators.length} coordinators (page ${pageNum}/${totalPages})`);
      
      return res.status(200).json({
        weeks: weeks.map(({ week, year }) => ({ week, year })),
        wardStatus: wardStatusData,
        coordinators: coordinators,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalItems: totalWards,
          itemsPerPage: limitNum,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      });
      
    } catch (error) {
      console.error('Error fetching admin ward report status:', error);
      return res.status(500).json({ message: 'Error fetching ward report status', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}
