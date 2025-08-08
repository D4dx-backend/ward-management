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
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'wardAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    // Get the Ward Incharge's ward
    const ward = await Ward.findOne({ wardAdmin: session.user.id });
    
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found for this admin' });
    }

    // Get all current clusters for this ward
    const Cluster = require('../../../models/Cluster').default;
    const clusters = await Cluster.find({ ward: ward._id, isActive: { $ne: false } }).sort({ clusterNumber: 1 });
    
    console.log(`Refreshing survey for ward ${ward._id} with ${clusters.length} clusters`);

    // Get form weeks
    const FormTemplate = require('../../../models/FormTemplate').default;
    const forms = await FormTemplate.find({})
      .populate('createdBy', 'role')
      .sort({ createdAt: -1 })
      .catch(() => []);

    const stateAdminForms = forms.filter(form => 
      form.createdBy && form.createdBy.role === 'stateAdmin' && form.weekNumber && form.year
    );

    const formWeeks = new Set();
    stateAdminForms.forEach(form => {
      formWeeks.add(`${form.year}-${form.weekNumber}`);
    });

    const sortedFormWeeks = Array.from(formWeeks)
      .map(weekKey => {
        const [year, weekNumber] = weekKey.split('-').map(Number);
        return { year, weekNumber };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
      })
      .slice(0, 4);

    // If no form weeks found, use current week as fallback
    if (sortedFormWeeks.length === 0) {
      const currentDate = new Date();
      const currentWeekNumber = getWeekNumber(currentDate);
      const currentYear = currentDate.getFullYear();
      sortedFormWeeks.push({ year: currentYear, weekNumber: currentWeekNumber });
    }

    // Create fresh House Visits for all current clusters
    const clusterVisits = clusters.map(cluster => {
      const visitData = {
        clusterId: cluster._id,
        clusterName: cluster.name,
        formWeeks: sortedFormWeeks
      };

      // Add week data for each form week (up to 4)
      sortedFormWeeks.forEach((week, index) => {
        visitData[`week${index + 1}`] = {
          houses: 0,
          days: 0,
          weekNumber: week.weekNumber,
          year: week.year
        };
      });

      // Fill remaining weeks if less than 4 forms exist
      for (let i = sortedFormWeeks.length; i < 4; i++) {
        visitData[`week${i + 1}`] = {
          houses: 0,
          days: 0,
          weekNumber: null,
          year: null
        };
      }

      return visitData;
    });

    // Find existing survey
    let survey = await DockerSurvey.findOne({ ward: ward._id });
    
    if (survey) {
      // Update existing survey with fresh House Visits
      survey.clusterVisits = clusterVisits;
      survey.markModified('clusterVisits');
      await survey.save();
      console.log(`Updated existing survey with ${clusterVisits.length} clusters`);
    } else {
      // Create new survey if none exists
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

      survey = new DockerSurvey({
        ward: ward._id,
        wardAdmin: session.user.id,
        questions: initialQuestions,
        basicSurvey: { status: 'not_started' },
        clusterVisits
      });
      await survey.save();
      console.log(`Created new survey with ${clusterVisits.length} clusters`);
    }

    // Return the updated survey
    const updatedSurvey = await DockerSurvey.findById(survey._id)
      .populate('ward', 'name wardNumber panchayath district')
      .populate('wardAdmin', 'name email');

    res.status(200).json({
      message: `Survey refreshed successfully with ${clusterVisits.length} clusters`,
      survey: updatedSurvey
    });

  } catch (error) {
    console.error('Error refreshing survey:', error);
    res.status(500).json({ message: 'Error refreshing survey', error: error.message });
  }
}