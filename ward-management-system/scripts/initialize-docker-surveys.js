import dbConnect from '../lib/mongodb.js';
import DockerSurvey from '../models/DockerSurvey.js';
import Ward from '../models/Ward.js';

// Helper function to calculate week number from date (same as form creation logic)
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function initializeDockerSurveys() {
  await dbConnect();

  try {
    console.log('Starting Docker Survey initialization...');

    // Get all wards that have ward admins
    const wards = await Ward.find({ wardAdmin: { $ne: null } }).populate('wardAdmin', 'name email');
    console.log(`Found ${wards.length} wards with ward admins`);

    let created = 0;
    let existing = 0;

    for (const ward of wards) {
      // Check if survey already exists
      const existingSurvey = await DockerSurvey.findOne({ ward: ward._id });
      
      if (existingSurvey) {
        console.log(`Survey already exists for ward: ${ward.name}`);
        existing++;
        continue;
      }

      // Get clusters for this ward
      const Cluster = (await import('../models/Cluster.js')).default;
      const clusters = await Cluster.find({ ward: ward._id, isActive: true }).sort({ clusterNumber: 1 });
      
      // Get form weeks from FormTemplate for dynamic structure
      const FormTemplate = require('../models/FormTemplate').default;
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

      // Fallback to current week if no forms found
      if (sortedFormWeeks.length === 0) {
        const currentDate = new Date();
        const currentWeekNumber = getWeekNumber(currentDate);
        const currentYear = currentDate.getFullYear();
        sortedFormWeeks.push({ year: currentYear, weekNumber: currentWeekNumber });
      }

      // Create dynamic cluster visits structure
      const clusterVisits = clusters.map(cluster => {
        const visitData = {
          clusterId: cluster._id,
          clusterName: cluster.name,
          formWeeks: sortedFormWeeks,
          weeklyData: {}
        };

        // Add data for each form week
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

      // Create survey with all questions initialized
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
        wardAdmin: ward.wardAdmin._id,
        questions: initialQuestions,
        basicSurvey: { status: 'not_started' },
        clusterVisits
      });

      await survey.save();
      console.log(`Created Docker Survey for ward: ${ward.name} (Admin: ${ward.wardAdmin.name})`);
      created++;
    }

    console.log(`\nInitialization complete:`);
    console.log(`- Created: ${created} new surveys`);
    console.log(`- Existing: ${existing} surveys`);
    console.log(`- Total: ${created + existing} surveys`);

  } catch (error) {
    console.error('Error initializing Docker Surveys:', error);
  }
}

// Run the initialization
initializeDockerSurveys()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });