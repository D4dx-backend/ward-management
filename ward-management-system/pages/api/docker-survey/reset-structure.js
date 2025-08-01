import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';
import Ward from '../../../models/Ward';

// Helper function to calculate week number from date (same as form creation logic)
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
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get user's ward
    const User = require('../../../models/User').default;
    const user = await User.findById(session.user.id).populate('ward');
    
    if (!user || !user.ward) {
      return res.status(400).json({ message: 'No ward assigned to user' });
    }

    const ward = user.ward;

    // Delete existing survey
    await DockerSurvey.deleteOne({ ward: ward._id });
    console.log(`Deleted existing survey for ward ${ward._id}`);

    // Get all clusters for this ward
    const Cluster = require('../../../models/Cluster').default;
    const clusters = await Cluster.find({ ward: ward._id, isActive: { $ne: false } }).sort({ clusterNumber: 1 });
    
    console.log(`Found ${clusters.length} clusters for ward ${ward._id}`);

    // Get weeks based on actual form creation
    const FormTemplate = require('../../../models/FormTemplate').default;
    const forms = await FormTemplate.find({})
      .populate('createdBy', 'role')
      .sort({ createdAt: -1 })
      .catch(() => []);

    console.log(`Found ${forms.length} total forms`);

    // Filter forms created by state admins and get unique weeks
    const stateAdminForms = forms.filter(form => 
      form.createdBy && form.createdBy.role === 'stateAdmin' && form.weekNumber && form.year
    );

    console.log(`Found ${stateAdminForms.length} state admin forms with week numbers`);

    const formWeeks = new Set();
    stateAdminForms.forEach(form => {
      formWeeks.add(`${form.year}-${form.weekNumber}`);
      console.log(`Added form week: ${form.weekNumber}/${form.year} from form: ${form.title}`);
    });

    // Convert to array and sort (most recent first) - NO LIMIT, show ALL weeks
    const sortedFormWeeks = Array.from(formWeeks)
      .map(weekKey => {
        const [year, weekNumber] = weekKey.split('-').map(Number);
        return { year, weekNumber };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
      }); // Show ALL form weeks, no limit

    console.log('Sorted form weeks:', sortedFormWeeks);

    // If no form weeks found, use current week as fallback
    if (sortedFormWeeks.length === 0) {
      const currentDate = new Date();
      const currentWeekNumber = getWeekNumber(currentDate);
      const currentYear = currentDate.getFullYear();
      
      console.log(`No form weeks found, using current week: ${currentWeekNumber}/${currentYear}`);
      
      sortedFormWeeks.push({ year: currentYear, weekNumber: currentWeekNumber });
    }

    // Create cluster visits structure based on ALL form weeks (dynamic)
    const clusterVisits = clusters.map(cluster => {
      const visitData = {
        clusterId: cluster._id,
        clusterName: cluster.name,
        formWeeks: sortedFormWeeks, // Store the actual weeks for reference
        weeklyData: {} // Dynamic weekly data instead of fixed week1-week4
      };

      // Add week data for ALL form weeks (no limit)
      sortedFormWeeks.forEach((week) => {
        const weekKey = `${week.year}-${week.weekNumber}`;
        visitData.weeklyData[weekKey] = {
          houses: 0,
          days: 0,
          weekNumber: week.weekNumber,
          year: week.year
        };
      });

      return visitData;
    });

    console.log(`Created ${clusterVisits.length} cluster visits with new structure`);
    console.log('First cluster visit structure:', JSON.stringify(clusterVisits[0], null, 2));

    // Create survey with all questions initialized to default status
    const initialQuestions = {
      populationCensus: { status: 'not_started' },
      wardReview: { status: 'not_started' },
      religiousVoterInclination: { status: 'not_started' },
      communityVoterInclination: { status: 'not_started' },
      religiousOrganizationVoterInclination: { status: 'not_started' },
      mainAgricultureAndWages: { status: 'not_started' },
      previousElectionAnalysis: { status: 'not_started' },
      lastThreeElectionsAnalysis: { status: 'not_started' },
      relevantRepresentatives: { status: 'not_started' },
      politicalWages: { status: 'not_started' },
      mainPoliticalPersonalities: { status: 'not_started' },
      socialOpposition: { status: 'not_started' },
      currentLocalIssues: { status: 'not_started' },
      welfarePartyUnderstanding: { status: 'not_started' }
    };

    const survey = new DockerSurvey({
      ward: ward._id,
      wardAdmin: session.user.id,
      questions: initialQuestions,
      basicSurvey: { status: 'not_started' },
      clusterVisits
    });
    
    await survey.save();
    
    const populatedSurvey = await DockerSurvey.findById(survey._id)
      .populate('ward', 'name wardNumber panchayath district')
      .populate('wardAdmin', 'name email');

    console.log('New survey created with dynamic structure');
    
    res.status(200).json({
      message: 'Survey structure reset successfully',
      survey: populatedSurvey,
      formWeeksFound: sortedFormWeeks.length,
      clustersFound: clusters.length
    });

  } catch (error) {
    console.error('Error resetting survey structure:', error);
    res.status(500).json({ message: 'Error resetting survey structure', error: error.message });
  }
}