import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';
import Ward from '../../../models/Ward';
import Cluster from '../../../models/Cluster';
import FormTemplate from '../../../models/FormTemplate';

// Helper function to calculate week number from date
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper function to create initial questions structure
function createInitialQuestions() {
  return {
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
}

// Helper function to get form weeks
async function getFormWeeks() {
  try {
    const forms = await FormTemplate.find({})
      .populate('createdBy', 'role')
      .sort({ createdAt: -1 });

    const stateAdminForms = forms.filter(form =>
      form.createdBy &&
      form.createdBy.role === 'stateAdmin' &&
      form.weekNumber &&
      form.year
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
      });

    // Fallback to current week if no forms found
    if (sortedFormWeeks.length === 0) {
      const currentDate = new Date();
      const currentWeekNumber = getWeekNumber(currentDate);
      const currentYear = currentDate.getFullYear();
      sortedFormWeeks.push({ year: currentYear, weekNumber: currentWeekNumber });
    }

    return sortedFormWeeks;
  } catch (error) {
    console.error('Error getting form weeks:', error);
    // Fallback to current week
    const currentDate = new Date();
    const currentWeekNumber = getWeekNumber(currentDate);
    const currentYear = currentDate.getFullYear();
    return [{ year: currentYear, weekNumber: currentWeekNumber }];
  }
}

// Helper function to create House Visits structure
async function createClusterVisitsStructure(wardId, formWeeks) {
  try {
    const clusters = await Cluster.find({ ward: wardId, isActive: { $ne: false } }).sort({ clusterNumber: 1 });

    return clusters.map(cluster => {
      const visitData = {
        clusterId: cluster._id,
        clusterName: cluster.name,
        formWeeks: formWeeks,
        weeklyData: {}
      };

      // Initialize weekly data for each form week
      formWeeks.forEach((week) => {
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
  } catch (error) {
    console.error('Error creating House Visits structure:', error);
    return [];
  }
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    await connectToDatabase();

    const session = await getServerSession(req, res, authOptions);
    console.log('🔍 Docker Survey API - Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      method
    });

    if (!session) {
      console.log('❌ Docker Survey API - No session found');
      return res.status(401).json({ message: 'Unauthorized - No session found' });
    }

    // Only Ward Incharges can access this endpoint
    if (session.user.role !== 'wardAdmin') {
      console.log('❌ Docker Survey API - Access denied for role:', session.user.role);
      return res.status(403).json({ message: 'Access denied - Ward Incharge role required' });
    }

    // Get the Ward Incharge's ward
    const ward = await Ward.findOne({ wardAdmin: session.user.id });

    if (!ward) {
      console.log('❌ Ward not found for user:', session.user.id);
      return res.status(404).json({ message: 'Ward not found for this admin. Please contact your administrator to assign you to a ward.' });
    }

    console.log('✅ Ward found:', ward.name, 'ID:', ward._id);

    switch (method) {
      case 'GET':
        try {
          console.log(`📋 FETCHING SURVEY FOR WARD: ${ward.name} (${ward._id})`);

          // Try to find existing survey first
          let survey = await DockerSurvey.findOne({ ward: ward._id })
            .populate('ward', 'name wardNumber panchayath district')
            .populate('wardAdmin', 'name email');

          if (survey) {
            console.log('✅ Found existing survey, ID:', survey._id);
            console.log('📊 Survey completion rate:', survey.completionRate);
            return res.status(200).json(survey);
          }

          console.log('⚠️ No existing survey found, creating new one...');

          // Get form weeks and create cluster structure
          const formWeeks = await getFormWeeks();
          const clusterVisits = await createClusterVisitsStructure(ward._id, formWeeks);

          console.log('📅 Form weeks found:', formWeeks.length);
          console.log('🏢 Clusters found:', clusterVisits.length);

          // Create new survey
          const newSurvey = new DockerSurvey({
            ward: ward._id,
            wardAdmin: session.user.id,
            questions: createInitialQuestions(),
            basicSurvey: { status: 'not_started' },
            clusterVisits: clusterVisits
          });

          await newSurvey.save();
          console.log('✅ New survey created with ID:', newSurvey._id);

          // Return populated survey
          const populatedSurvey = await DockerSurvey.findById(newSurvey._id)
            .populate('ward', 'name wardNumber panchayath district')
            .populate('wardAdmin', 'name email');

          console.log('🎉 SUCCESS: Survey created and returned');
          return res.status(200).json(populatedSurvey);

        } catch (error) {
          console.error('❌ Error in GET method:', error);
          return res.status(500).json({
            message: 'Error fetching survey',
            error: error.message
          });
        }

      case 'PUT':
        try {
          const { questionKey, status, clusterVisits, basicSurveyStatus } = req.body;

          console.log('📝 Docker Survey Update Request:', {
            questionKey,
            status,
            basicSurveyStatus,
            clusterVisitsLength: clusterVisits?.length,
            wardId: ward._id,
            userId: session.user.id
          });

          // Find existing survey
          let survey = await DockerSurvey.findOne({ ward: ward._id });

          if (!survey) {
            console.log('⚠️ Survey not found for update, creating new one...');

            // Create new survey if it doesn't exist
            const formWeeks = await getFormWeeks();
            const clusterVisitsData = await createClusterVisitsStructure(ward._id, formWeeks);

            survey = new DockerSurvey({
              ward: ward._id,
              wardAdmin: session.user.id,
              questions: createInitialQuestions(),
              basicSurvey: { status: 'not_started' },
              clusterVisits: clusterVisitsData
            });

            await survey.save();
            console.log('✅ New survey created for update');
          }

          let hasChanges = false;
          let updateLog = [];

          // Update specific question
          if (questionKey && status) {
            console.log(`🔄 Updating question ${questionKey} to ${status}`);

            if (!['completed', 'ongoing', 'not_started'].includes(status)) {
              return res.status(400).json({ message: 'Invalid status value' });
            }

            const currentStatus = survey.questions?.[questionKey]?.status || 'not_started';

            // Initialize questions object if it doesn't exist
            if (!survey.questions) {
              survey.questions = createInitialQuestions();
            }
            if (!survey.questions[questionKey]) {
              survey.questions[questionKey] = {};
            }

            // Only update if status actually changed
            if (currentStatus !== status) {
              survey.questions[questionKey].status = status;
              survey.questions[questionKey].previousStatus = currentStatus;
              survey.questions[questionKey].lastUpdated = new Date();
              hasChanges = true;
              updateLog.push(`Question ${questionKey}: ${currentStatus} -> ${status}`);

              console.log(`✅ Question ${questionKey} updated: ${currentStatus} -> ${status}`);
            } else {
              console.log(`ℹ️ Question ${questionKey} already has status ${status}, no change needed`);
            }
          }

          // Update basic survey
          if (basicSurveyStatus) {
            console.log(`🔄 Updating basic survey to ${basicSurveyStatus}`);

            if (!['completed', 'ongoing', 'not_started'].includes(basicSurveyStatus)) {
              return res.status(400).json({ message: 'Invalid basic survey status value' });
            }

            const currentBasicStatus = survey.basicSurvey?.status || 'not_started';

            // Only update if status actually changed
            if (currentBasicStatus !== basicSurveyStatus) {
              if (!survey.basicSurvey) {
                survey.basicSurvey = {};
              }
              survey.basicSurvey.status = basicSurveyStatus;
              survey.basicSurvey.previousStatus = currentBasicStatus;
              survey.basicSurvey.lastUpdated = new Date();
              hasChanges = true;
              updateLog.push(`Basic survey: ${currentBasicStatus} -> ${basicSurveyStatus}`);

              console.log(`✅ Basic survey updated: ${currentBasicStatus} -> ${basicSurveyStatus}`);
            } else {
              console.log(`ℹ️ Basic survey already has status ${basicSurveyStatus}, no change needed`);
            }
          }

          // Update House Visits
          if (clusterVisits && Array.isArray(clusterVisits)) {
            console.log(`🔄 Updating House Visits (${clusterVisits.length} clusters)`);
            survey.clusterVisits = clusterVisits;
            hasChanges = true;
            updateLog.push(`House Visits updated (${clusterVisits.length} clusters)`);
          }

          // Save changes if any were made
          if (hasChanges) {
            console.log('💾 Changes detected, saving survey...');
            console.log('📋 Update log:', updateLog);

            // Mark nested objects as modified for Mongoose
            survey.markModified('questions');
            survey.markModified('basicSurvey');
            survey.markModified('clusterVisits');

            // Force update the lastUpdated timestamp
            survey.lastUpdated = new Date();

            try {
              // Validate the survey data before saving
              const validationError = survey.validateSync();
              if (validationError) {
                console.error('❌ Survey validation failed:', validationError);
                return res.status(400).json({
                  message: 'Survey data validation failed',
                  error: validationError.message
                });
              }

              const savedSurvey = await survey.save();
              console.log('✅ Survey saved successfully with ID:', savedSurvey._id);
              console.log('📊 New completion rate:', savedSurvey.completionRate);
            } catch (saveError) {
              console.error('❌ Error saving survey:', saveError);
              console.error('❌ Save error details:', saveError.message);
              return res.status(500).json({
                message: 'Failed to save survey changes. Please try again.',
                error: saveError.message,
                details: process.env.NODE_ENV === 'development' ? saveError.stack : undefined
              });
            }
          } else {
            console.log('ℹ️ No changes detected, skipping save');
            updateLog.push('No changes made - data already up to date');
          }

          // Fetch the updated survey with populated fields
          const updatedSurvey = await DockerSurvey.findById(survey._id)
            .populate('ward', 'name wardNumber panchayath district')
            .populate('wardAdmin', 'name email');

          if (!updatedSurvey) {
            console.error('❌ Failed to fetch updated survey');
            return res.status(500).json({ message: 'Failed to fetch updated survey' });
          }

          console.log('🎉 Survey update completed successfully');
          console.log('📊 Final completion rate:', updatedSurvey.completionRate);

          return res.status(200).json({
            ...updatedSurvey.toObject(),
            updateLog: updateLog
          });

        } catch (error) {
          console.error('❌ Error updating docker survey:', error);
          console.error('❌ Error stack:', error.stack);
          return res.status(500).json({
            message: 'Error updating docker survey',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('❌ General API error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}