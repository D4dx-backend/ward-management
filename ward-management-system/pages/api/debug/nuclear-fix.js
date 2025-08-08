import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';
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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await connectToDatabase();

  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'wardAdmin') {
    return res.status(401).json({ message: 'Unauthorized - Ward Incharge only' });
  }

  try {
    console.log('🚀 NUCLEAR FIX: Starting complete DockerSurvey rebuild...');
    
    // STEP 1: Delete ALL DockerSurvey records
    const deleteResult = await DockerSurvey.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing DockerSurvey records`);

    // STEP 2: Get user's ward
    const User = require('../../../models/User').default;
    const user = await User.findById(session.user.id).populate('ward');
    
    if (!user || !user.ward) {
      return res.status(400).json({ message: 'No ward assigned to user' });
    }

    const ward = user.ward;
    console.log(`✅ Found ward: ${ward.name}`);

    // STEP 3: Get all clusters for this ward
    const Cluster = require('../../../models/Cluster').default;
    const clusters = await Cluster.find({ ward: ward._id, isActive: { $ne: false } }).sort({ clusterNumber: 1 });
    console.log(`✅ Found ${clusters.length} clusters:`, clusters.map(c => c.name));

    // STEP 4: Get form weeks from FormTemplate
    const FormTemplate = require('../../../models/FormTemplate').default;
    const forms = await FormTemplate.find({})
      .populate('createdBy', 'role')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${forms.length} total forms`);

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
      console.log(`   - Week ${form.weekNumber}, ${form.year} from "${form.title}"`);
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

    console.log(`✅ Sorted form weeks:`, sortedFormWeeks);

    // Fallback to current week if no forms found
    if (sortedFormWeeks.length === 0) {
      const currentDate = new Date();
      const currentWeekNumber = getWeekNumber(currentDate);
      const currentYear = currentDate.getFullYear();
      
      console.log(`⚠️ No form weeks found, using current week: ${currentWeekNumber}/${currentYear}`);
      sortedFormWeeks.push({ year: currentYear, weekNumber: currentWeekNumber });
    }

    // STEP 5: Create dynamic House Visits structure
    const clusterVisits = clusters.map(cluster => {
      const visitData = {
        clusterId: cluster._id,
        clusterName: cluster.name,
        formWeeks: sortedFormWeeks,
        weeklyData: {}
      };

      // Add data for each form week
      sortedFormWeeks.forEach(({ year, weekNumber }) => {
        const weekKey = `${year}-${weekNumber}`;
        visitData.weeklyData[weekKey] = {
          year,
          weekNumber,
          visited: false,
          visitDate: null,
          notes: '',
          status: 'pending'
        };
      });

      return visitData;
    });

    // STEP 6: Create DockerSurvey record
    const dockerSurvey = new DockerSurvey({
      ward: ward._id,
      wardName: ward.name,
      clusterVisits: clusterVisits,
      lastUpdated: new Date(),
      createdBy: session.user.id
    });

    await dockerSurvey.save();
    console.log(`✅ Created new DockerSurvey record with ${clusterVisits.length} clusters`);

    return res.status(200).json({
      success: true,
      message: 'Nuclear fix completed successfully',
      data: {
        wardName: ward.name,
        clustersCount: clusters.length,
        formWeeksCount: sortedFormWeeks.length,
        dockerSurveyId: dockerSurvey._id
      }
    });

  } catch (error) {
    console.error('❌ Nuclear fix error:', error);
    return res.status(500).json({ 
      message: 'Nuclear fix failed', 
      error: error.message 
    });
  }
}