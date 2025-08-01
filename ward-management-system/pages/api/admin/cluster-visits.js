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

      // Calculate weeks based on form creation dates
      const weeks = [];
      const currentDate = new Date();
      
      // Determine how many weeks to show
      const weeksToShow = all === 'true' ? 12 : 4; // Show 12 weeks for 'all', 4 for recent
      
      for (let i = 0; i < weeksToShow; i++) {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - (i * 7));
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        
        const weekNumber = getWeekNumber(weekStart);
        const isCurrentWeek = i === 0;
        
        // Get forms created in this week
        const weekForms = stateAdminForms.filter(form => {
          const formDate = new Date(form.createdAt);
          return formDate >= weekStart && formDate <= weekEnd;
        });

        // Get responses for cluster visits in this week
        const responses = await Response.find({
          submittedAt: {
            $gte: weekStart,
            $lte: weekEnd
          }
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

        // Get all wards to calculate total clusters
        const allWards = await Ward.find({ isActive: { $ne: false } }).catch(() => []);
        const totalClusters = allWards.length || 10; // Fallback to 10 if no wards found
        const visitedCount = Object.keys(clusterVisits).length;
        const visitPercentage = totalClusters > 0 ? Math.round((visitedCount / totalClusters) * 100) : 0;

        weeks.push({
          weekNumber,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          isCurrentWeek,
          visitedCount,
          totalClusters,
          visitPercentage,
          formsCreated: weekForms.length,
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