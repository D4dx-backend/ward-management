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
  const { method } = req;

  await connectToDatabase();

  const session = await getServerSession(req, res, authOptions);
  console.log('Docker Survey API - Session check:', {
    hasSession: !!session,
    userId: session?.user?.id,
    userRole: session?.user?.role,
    method
  });

  if (!session) {
    console.log('Docker Survey API - No session found');
    return res.status(401).json({ message: 'Unauthorized - No session found' });
  }

  // Only Ward Incharges can access this endpoint
  if (session.user.role !== 'wardAdmin') {
    console.log('Docker Survey API - Access denied for role:', session.user.role);
    return res.status(403).json({ message: 'Access denied - Ward Incharge role required' });
  }

  // Get the Ward Incharge's ward
  const ward = await Ward.findOne({ wardAdmin: session.user.id });
  
  if (!ward) {
    return res.status(404).json({ message: 'Ward not found for this admin. Please contact your administrator to assign you to a ward.' });
  }

  switch (method) {
    case 'GET':
      try {
        console.log(`=== CREATING NEW DYNAMIC SURVEY FOR WARD ${ward._id} ===`);
        
        // STEP 1: Delete any existing survey to start fresh
        await DockerSurvey.deleteOne({ ward: ward._id });
        console.log('✅ Deleted existing survey');

        // STEP 2: Get all clusters for this ward
        const Cluster = require('../../../models/Cluster').default;
        const clusters = await Cluster.find({ ward: ward._id, isActive: { $ne: false } }).sort({ clusterNumber: 1 });
        console.log(`✅ Found ${clusters.length} clusters:`, clusters.map(c => c.name));

        // STEP 3: Get form weeks from FormTemplate
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

        // STEP 4: Create dynamic cluster visits structure
        const clusterVisits = clusters.map(cluster => {
          const visitData = {
            clusterId: cluster._id,
            clusterName: cluster.name,
            formWeeks: sortedFormWeeks, // Store actual weeks
            weeklyData: {} // Dynamic weekly data
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

        console.log(`✅ Created cluster visits structure:`);
        console.log(`   - ${clusterVisits.length} clusters`);
        console.log(`   - ${sortedFormWeeks.length} weeks per cluster`);
        console.log(`   - Sample structure:`, JSON.stringify(clusterVisits[0], null, 2));

        // STEP 5: Create survey with dynamic structure
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

        const newSurvey = new DockerSurvey({
          ward: ward._id,
          wardAdmin: session.user.id,
          questions: initialQuestions,
          basicSurvey: { status: 'not_started' },
          clusterVisits: clusterVisits
        });

        await newSurvey.save();
        console.log(`✅ Survey saved with ID: ${newSurvey._id}`);

        // STEP 6: Return populated survey
        const populatedSurvey = await DockerSurvey.findById(newSurvey._id)
          .populate('ward', 'name wardNumber panchayath district')
          .populate('wardAdmin', 'name email');

        console.log(`✅ SUCCESS: Dynamic survey created with ${clusterVisits.length} clusters and ${sortedFormWeeks.length} weeks`);
        
        return res.status(200).json(populatedSurvey);

      } catch (error) {
        console.error('❌ Error creating dynamic survey:', error);
        return res.status(500).json({ 
          message: 'Error creating dynamic survey', 
          error: error.message 
        });
      }

    case 'PUT':
      try {
        const { questionKey, status, clusterVisits, basicSurveyStatus } = req.body;
        
        console.log('Docker Survey Update Request:', {
          questionKey,
          status,
          basicSurveyStatus,
          clusterVisitsLength: clusterVisits?.length,
          wardId: ward._id
        });

        let survey = await DockerSurvey.findOne({ ward: ward._id });
        
        if (!survey) {
          console.log('Survey not found for update, please refresh page');
          return res.status(404).json({ 
            message: 'Survey not found. Please refresh the page to create a new survey.' 
          });
        }

        let hasChanges = false;

        // Update specific question
        if (questionKey && status) {
          console.log(`Updating question ${questionKey} to ${status}`);
          
          if (!['completed', 'ongoing', 'not_started'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
          }
          
          const currentStatus = survey.questions[questionKey]?.status;
          
          if (!survey.questions) survey.questions = {};
          if (!survey.questions[questionKey]) survey.questions[questionKey] = {};
          
          survey.questions[questionKey].status = status;
          if (currentStatus && currentStatus !== status) {
            survey.questions[questionKey].previousStatus = currentStatus;
          }
          survey.questions[questionKey].lastUpdated = new Date();
          hasChanges = true;
          
          console.log(`Question ${questionKey} updated: ${currentStatus} -> ${status}`);
        }

        // Update basic survey
        if (basicSurveyStatus) {
          console.log(`Updating basic survey to ${basicSurveyStatus}`);
          
          if (!['completed', 'ongoing', 'not_started'].includes(basicSurveyStatus)) {
            return res.status(400).json({ message: 'Invalid basic survey status value' });
          }
          
          const currentBasicStatus = survey.basicSurvey?.status;
          
          if (!survey.basicSurvey) survey.basicSurvey = {};
          survey.basicSurvey.status = basicSurveyStatus;
          if (currentBasicStatus && currentBasicStatus !== basicSurveyStatus) {
            survey.basicSurvey.previousStatus = currentBasicStatus;
          }
          survey.basicSurvey.lastUpdated = new Date();
          hasChanges = true;
          
          console.log(`Basic survey updated: ${currentBasicStatus} -> ${basicSurveyStatus}`);
        }

        // Update cluster visits
        if (clusterVisits && Array.isArray(clusterVisits)) {
          console.log(`Updating cluster visits (${clusterVisits.length} clusters)`);
          survey.clusterVisits = clusterVisits;
          hasChanges = true;
        }

        if (hasChanges) {
          survey.markModified('questions');
          survey.markModified('basicSurvey');
          survey.markModified('clusterVisits');
          
          await survey.save();
          console.log('Survey saved successfully');
        }

        const updatedSurvey = await DockerSurvey.findById(survey._id)
          .populate('ward', 'name wardNumber panchayath district')
          .populate('wardAdmin', 'name email');

        console.log('Survey update completed');
        return res.status(200).json(updatedSurvey);

      } catch (error) {
        console.error('Error updating docker survey:', error);
        return res.status(500).json({ 
          message: 'Error updating docker survey',
          error: error.message
        });
      }

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).end(`Method ${method} Not Allowed`);
  }
}