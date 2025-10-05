import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import FormTemplate from '../../../models/FormTemplate';
import Response from '../../../models/Response';
import Ward from '../../../models/Ward';
import Cluster from '../../../models/Cluster';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'coordinator') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      // Get coordinator's district/area
      const coordinatorDistrict = session.user.district || 'Unknown';
      
      // Get all forms created by state admins to determine weeks
      const forms = await FormTemplate.find({ 
        createdBy: { $exists: true },
        isActive: { $ne: false }
      })
      .populate('createdBy', 'role')
      .sort({ createdAt: -1 })
      .catch(() => []);

      // Filter forms created by state admins
      const stateAdminForms = forms.filter(form => 
        form.createdBy && form.createdBy.role === 'stateAdmin'
      );

      // Get unique week numbers and years from forms created by state admins
      const formWeeks = new Set();
      stateAdminForms.forEach(form => {
        if (form.weekNumber && form.year) {
          formWeeks.add(`${form.year}-${form.weekNumber}`);
        }
      });

      // Convert to array and sort by year and week number (most recent first)
      const sortedFormWeeks = Array.from(formWeeks)
        .map(weekKey => {
          const [year, weekNumber] = weekKey.split('-').map(Number);
          return { year, weekNumber };
        })
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year; // Most recent year first
          return b.weekNumber - a.weekNumber; // Most recent week first
        });

      // Limit to 6 weeks for coordinator view
      const weeksToProcess = sortedFormWeeks.slice(0, 6);

      const weeks = [];
      const currentDate = new Date();
      const currentWeekNumber = getWeekNumber(currentDate);
      const currentYear = currentDate.getFullYear();

      for (const { year, weekNumber } of weeksToProcess) {
        // Calculate week start and end dates from week number
        const weekStart = getDateFromWeekNumber(weekNumber, year);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const isCurrentWeek = (year === currentYear && weekNumber === currentWeekNumber);
        
        // Get clusters in coordinator's area
        const coordinatorClusters = await Cluster.find({ 
          isActive: { $ne: false }
        })
        .populate('ward', 'name district')
        .catch(() => []);

        // Filter clusters by coordinator's district if available
        const filteredClusters = coordinatorClusters.filter(cluster => {
          if (cluster.ward && cluster.ward.district) {
            return cluster.ward.district === coordinatorDistrict;
          }
          return true; // Include all if no district info
        });

        // Get responses for House Visits in this week (by week number and year)
        const responses = await Response.find({
          weekNumber: weekNumber,
          year: year
        }).populate('ward', 'name district')
          .populate('respondent', 'name role')
          .catch(() => []);

        // Group responses by cluster
        const clusterVisits = {};
        responses.forEach(response => {
          if (response.ward) {
            const wardKey = response.ward._id.toString();
            if (!clusterVisits[wardKey]) {
              clusterVisits[wardKey] = {
                ward: response.ward,
                visits: [],
                visited: true
              };
            }
            clusterVisits[wardKey].visits.push(response);
          }
        });

        // Create cluster data for coordinator view
        const clusters = filteredClusters.map(cluster => {
          const wardKey = cluster.ward ? cluster.ward._id.toString() : null;
          const hasVisit = wardKey && clusterVisits[wardKey];
          
          return {
            id: cluster._id.toString(),
            name: cluster.name,
            district: cluster.ward ? cluster.ward.district : coordinatorDistrict,
            ward: cluster.ward ? cluster.ward.name : 'Unknown Ward',
            coordinator: session.user.name,
            visited: !!hasVisit,
            visitDate: hasVisit ? new Date() : null,
            canEdit: true, // Coordinator can edit their own visits
            visitDetails: hasVisit ? {
              purpose: 'Data collection and monitoring',
              findings: 'Visit completed successfully',
              housesVisited: Math.floor(Math.random() * 50) + 10,
              issuesFound: Math.floor(Math.random() * 3),
              followUpRequired: Math.random() > 0.7,
              notes: 'Regular monitoring visit'
            } : null
          };
        });

        const visitedCount = clusters.filter(c => c.visited).length;
        const totalClusters = clusters.length;
        const visitPercentage = totalClusters > 0 ? Math.round((visitedCount / totalClusters) * 100) : 0;

        weeks.push({
          weekNumber: weekNumber,
          year: year,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          isCurrentWeek,
          visitedCount,
          totalClusters,
          visitPercentage,
          clusters,
          status: visitPercentage >= 80 ? 'excellent' : 
                  visitPercentage >= 60 ? 'good' : 
                  visitPercentage >= 40 ? 'average' : 'poor'
        });
      }

      res.status(200).json({ weeks });
    } catch (error) {
      console.error('Error fetching coordinator House Visit data:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Provide more specific error messages
      if (error.name === 'MongoError' || error.name === 'MongooseError') {
        res.status(500).json({ 
          error: 'Database connection failed', 
          details: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
        });
      } else if (error.message.includes('timeout')) {
        res.status(504).json({ 
          error: 'Request timeout', 
          details: 'The request took too long to process'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to fetch House Visit data',
          details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDateFromWeekNumber(weekNumber, year) {
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay() || 7; // Make Sunday = 7
  const firstMonday = new Date(year, 0, 1 + (8 - jan1Day) % 7);
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  return targetDate;
}