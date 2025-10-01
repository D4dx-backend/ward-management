import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import Response from '../../../models/Response';
import User from '../../../models/User';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden - State Admins only' });
  }

  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Get current week and year
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const pastDaysOfYear = (currentDate - startOfYear) / 86400000;
      const currentWeek = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

      const weeks = [];
      for (let i = 0; i < 4; i++) {
        let weekNum = currentWeek - i;
        let year = currentYear;
        if (weekNum <= 0) {
          year = currentYear - 1;
          weekNum = 52 + weekNum;
        }
        weeks.push({ week: weekNum, year });
      }

      const coordinatorQuery = { role: 'coordinator' };
      const totalCoordinators = await User.countDocuments(coordinatorQuery);

      const coordinators = await User.find(coordinatorQuery)
        .select('name district email')
        .skip(skip)
        .limit(limitNum)
        .sort({ name: 1 });

      const coordinatorIds = coordinators.map(c => c._id);

      const reports = await Response.find({
        formType: 'coordinatorReport',
        respondent: { $in: coordinatorIds },
        $or: weeks.map(({ week, year }) => ({ weekNumber: week, year }))
      });

      const coordinatorStatusData = coordinators.map(coordinator => {
        const coordinatorData = {
          coordinator: {
            _id: coordinator._id,
            name: coordinator.name,
            district: coordinator.district,
          },
          weeks: {}
        };

        weeks.forEach(({ week, year }) => {
          const weekKey = `week_${week}_${year}`;
          const report = reports.find(r => 
            r.respondent.toString() === coordinator._id.toString() && 
            r.weekNumber === week && 
            r.year === year
          );
          coordinatorData.weeks[weekKey] = {
            week,
            year,
            hasReport: !!report,
            reportId: report ? report._id : null,
          };
        });
        return coordinatorData;
      });

      const totalPages = Math.ceil(totalCoordinators / limitNum);

      return res.status(200).json({
        weeks,
        coordinatorStatus: coordinatorStatusData,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCoordinators,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        }
      });

    } catch (error) {
      console.error('Error fetching admin coordinator report status:', error);
      return res.status(500).json({ message: 'Error fetching coordinator report status', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

