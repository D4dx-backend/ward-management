import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import FormTemplate from '../../../models/FormTemplate';
import Response from '../../../models/Response';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      const { all } = req.query;
      
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

      // Limit the number of weeks to show
      const maxWeeks = all === 'true' ? 20 : 8; // Show more weeks when requested
      const weeksToProcess = sortedFormWeeks.slice(0, maxWeeks);

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
        
        // Get forms created for this specific week number and year
        const weekForms = stateAdminForms.filter(form => {
          return form.weekNumber === weekNumber && form.year === year;
        });

        // Get responses for cluster visits in this week (by week number and year)
        const responses = await Response.find({
          weekNumber: weekNumber,
          year: year
        }).populate('ward', 'name district')
          .populate('respondent', 'name role')
          .catch(() => []);

        // Group responses by ward/cluster
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

        // Get all clusters to calculate total clusters (not wards)
        const Cluster = require('../../../models/Cluster').default;
        const allClusters = await Cluster.find({ isActive: { $ne: false } }).catch(() => []);
        const totalClusters = allClusters.length || 0;
        const visitedCount = Object.keys(clusterVisits).length;
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
          formsCreated: weekForms.length,
          formTitles: weekForms.map(f => f.title), // Add form titles for reference
          clusters: Object.values(clusterVisits),
          status: visitPercentage >= 80 ? 'excellent' : 
                  visitPercentage >= 60 ? 'good' : 
                  visitPercentage >= 40 ? 'average' : 'poor'
        });
      }

      res.status(200).json({ weeks });
    } catch (error) {
      console.error('Error fetching cluster visit data:', error);
      res.status(500).json({ error: 'Failed to fetch cluster visit data' });
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