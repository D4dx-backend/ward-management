import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import ClusterVisit from '../../../models/ClusterVisit';
import Ward from '../../../models/Ward';

// Helper function to calculate week number from date
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only ward admins can access this endpoint
  if (session.user.role !== 'wardAdmin') {
    return res.status(403).json({ message: 'Access denied - Ward admin role required' });
  }

  // Get the ward admin's ward
  const ward = await Ward.findOne({ wardAdmin: session.user.id });
  
  if (!ward) {
    return res.status(404).json({ message: 'Ward not found for this admin' });
  }

  switch (method) {
    case 'GET':
      try {
        console.log(`=== GETTING CLUSTER VISITS FOR WARD ${ward._id} ===`);
        
        // Get form weeks from FormTemplate
        const FormTemplate = require('../../../models/FormTemplate').default;
        const forms = await FormTemplate.find({})
          .populate('createdBy', 'role')
          .sort({ createdAt: -1 });

        // Filter forms created by state admins with week numbers
        const stateAdminForms = forms.filter(form => 
          form.createdBy && 
          form.createdBy.role === 'stateAdmin' && 
          form.weekNumber && 
          form.year
        );

        console.log(`✅ Found ${stateAdminForms.length} state admin forms with week numbers`);

        // Extract unique weeks
        const formWeeks = new Set();
        stateAdminForms.forEach(form => {
          formWeeks.add(`${form.year}-${form.weekNumber}`);
        });

        // Convert to sorted array
        const sortedFormWeeks = Array.from(formWeeks)
          .map(weekKey => {
            const [year, weekNumber] = weekKey.split('-').map(Number);
            return { year, weekNumber };
          })
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.weekNumber - a.weekNumber;
          });

        console.log(`✅ Found ${sortedFormWeeks.length} unique form weeks:`, sortedFormWeeks);

        // Fallback to current week if no forms found
        if (sortedFormWeeks.length === 0) {
          const currentDate = new Date();
          const currentWeekNumber = getWeekNumber(currentDate);
          const currentYear = currentDate.getFullYear();
          
          console.log(`⚠️ No form weeks found, using current week: ${currentWeekNumber}/${currentYear}`);
          sortedFormWeeks.push({ year: currentYear, weekNumber: currentWeekNumber });
        }

        // Initialize or get cluster visits for this ward
        const clusterVisits = await ClusterVisit.initializeForWard(
          ward._id, 
          sortedFormWeeks, 
          session.user.id
        );

        console.log(`✅ Retrieved ${clusterVisits.length} cluster visits`);

        // Convert to frontend-friendly format
        const responseData = clusterVisits.map(cv => ({
          _id: cv._id,
          clusterId: cv.cluster,
          clusterName: cv.clusterName,
          formWeeks: sortedFormWeeks,
          weeklyData: Object.fromEntries(cv.weeklyData),
          totalHouses: cv.totalHouses,
          totalDays: cv.totalDays,
          updatedAt: cv.updatedAt
        }));

        console.log(`✅ SUCCESS: Returning ${responseData.length} cluster visits with ${sortedFormWeeks.length} weeks each`);

        return res.status(200).json({
          ward: {
            _id: ward._id,
            name: ward.name,
            wardNumber: ward.wardNumber
          },
          formWeeks: sortedFormWeeks,
          clusterVisits: responseData,
          totalClusters: responseData.length,
          totalWeeks: sortedFormWeeks.length
        });

      } catch (error) {
        console.error('❌ Error getting cluster visits:', error);
        return res.status(500).json({ 
          message: 'Error getting cluster visits', 
          error: error.message 
        });
      }

    case 'PUT':
      try {
        const { clusterVisits } = req.body;
        
        if (!clusterVisits || !Array.isArray(clusterVisits)) {
          return res.status(400).json({ message: 'Invalid cluster visits data' });
        }

        console.log(`=== UPDATING ${clusterVisits.length} CLUSTER VISITS ===`);

        const updatedVisits = [];

        for (const visitData of clusterVisits) {
          const clusterVisit = await ClusterVisit.findOne({
            ward: ward._id,
            cluster: visitData.clusterId
          });

          if (clusterVisit) {
            // Update weekly data
            if (visitData.weeklyData) {
              Object.entries(visitData.weeklyData).forEach(([weekKey, data]) => {
                clusterVisit.updateWeeklyData(weekKey, data.houses, data.days);
              });
            }

            clusterVisit.updatedBy = session.user.id;
            await clusterVisit.save();
            updatedVisits.push(clusterVisit);
            
            console.log(`✅ Updated cluster visit for ${clusterVisit.clusterName}`);
          }
        }

        console.log(`✅ Successfully updated ${updatedVisits.length} cluster visits`);

        // Return updated data
        const responseData = updatedVisits.map(cv => ({
          _id: cv._id,
          clusterId: cv.cluster,
          clusterName: cv.clusterName,
          formWeeks: cv.formWeeks,
          weeklyData: Object.fromEntries(cv.weeklyData),
          totalHouses: cv.totalHouses,
          totalDays: cv.totalDays,
          updatedAt: cv.updatedAt
        }));

        return res.status(200).json({
          ward: {
            _id: ward._id,
            name: ward.name,
            wardNumber: ward.wardNumber
          },
          clusterVisits: responseData,
          message: `Updated ${updatedVisits.length} cluster visits successfully`
        });

      } catch (error) {
        console.error('❌ Error updating cluster visits:', error);
        return res.status(500).json({ 
          message: 'Error updating cluster visits', 
          error: error.message 
        });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}