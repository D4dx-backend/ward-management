import dbConnect from '../lib/mongodb.js';
import DockerSurvey from '../models/DockerSurvey.js';
import Ward from '../models/Ward.js';

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
      
      const clusterVisits = clusters.map(cluster => ({
        clusterName: cluster.name,
        week1: { houses: 0, days: 0 },
        week2: { houses: 0, days: 0 },
        week3: { houses: 0, days: 0 },
        week4: { houses: 0, days: 0 }
      }));

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