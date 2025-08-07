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
  const { wardId } = req.query;

  await connectToDatabase();

  const session = await getServerSession(req, res, authOptions);
  console.log('Docker Survey API (wardId) - Session check:', {
    hasSession: !!session,
    userId: session?.user?.id,
    userRole: session?.user?.role,
    method,
    wardId
  });

  if (!session) {
    console.log('Docker Survey API (wardId) - No session found');
    return res.status(401).json({ message: 'Unauthorized - No session found' });
  }

  switch (method) {
    case 'GET':
      try {
        let survey = await DockerSurvey.findOne({ ward: wardId })
          .populate('ward', 'name wardNumber panchayath district')
          .populate('wardAdmin', 'name email');

        // Get all clusters for this ward
        const Cluster = require('../../../models/Cluster').default;
        const clusters = await Cluster.find({ ward: wardId, isActive: { $ne: false } }).sort({ clusterNumber: 1 });
        
        console.log(`Found ${clusters.length} clusters for ward ${wardId}`);

        if (!survey) {
          // Create a new survey if it doesn't exist
          const ward = await Ward.findById(wardId);
          if (!ward) {
            return res.status(404).json({ message: 'Ward not found' });
          }

          // Get all clusters for this ward to populate cluster visits
          const Cluster = require('../../../models/Cluster').default;
          const clusters = await Cluster.find({ ward: wardId, isActive: true }).sort({ clusterNumber: 1 });
          
          // Get form weeks from FormTemplate (same logic as my-ward.js)
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

          survey = new DockerSurvey({
            ward: wardId,
            wardAdmin: session.user.id,
            questions: initialQuestions,
            basicSurvey: { status: 'not_started' },
            clusterVisits
          });
          await survey.save();
          
          survey = await DockerSurvey.findById(survey._id)
            .populate('ward', 'name wardNumber panchayath district')
            .populate('wardAdmin', 'name email');
        } else {
          // Survey exists - FORCE REBUILD cluster visits to ensure only ward clusters are included
          console.log(`Survey exists with ${survey.clusterVisits.length} cluster visits`);
          
          // Get form weeks for cluster visits
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

          // COMPLETELY REBUILD cluster visits with only current ward clusters
          const newClusterVisits = clusters.map(cluster => {
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

          // Replace ALL cluster visits with new ones (this will fix the ward filtering issue)
          console.log(`Rebuilding cluster visits: ${survey.clusterVisits.length} -> ${newClusterVisits.length}`);
          survey.clusterVisits = newClusterVisits;
          survey.markModified('clusterVisits');
          await survey.save();
          
          console.log(`Survey updated with ${newClusterVisits.length} ward-specific clusters`);
        }

        res.status(200).json(survey);
      } catch (error) {
        console.error('Error fetching docker survey:', error);
        res.status(500).json({ message: 'Error fetching docker survey' });
      }
      break;

    case 'PUT':
      try {
        const { questionKey, status, clusterVisits, basicSurveyStatus } = req.body;
        
        console.log('Docker Survey Update Request (wardId):', {
          questionKey,
          status,
          basicSurveyStatus,
          clusterVisitsLength: clusterVisits?.length,
          wardId
        });

        let survey = await DockerSurvey.findOne({ ward: wardId });
        
        if (!survey) {
          console.log('Survey not found, creating new one...');
          // Create survey if it doesn't exist
          const ward = await Ward.findById(wardId);
          if (!ward) {
            return res.status(404).json({ message: 'Ward not found' });
          }


          
          // Get weeks based on actual form creation - get ALL forms, not just active ones
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

          // Convert to array and sort (most recent first), limit to 4 weeks
          const sortedFormWeeks = Array.from(formWeeks)
            .map(weekKey => {
              const [year, weekNumber] = weekKey.split('-').map(Number);
              return { year, weekNumber };
            })
            .sort((a, b) => {
              if (a.year !== b.year) return b.year - a.year;
              return b.weekNumber - a.weekNumber;
            })
            .slice(0, 4); // Limit to 4 most recent weeks

          console.log('Sorted form weeks:', sortedFormWeeks);

          // If no form weeks found, use current week as fallback
          if (sortedFormWeeks.length === 0) {
            const currentDate = new Date();
            const currentWeekNumber = getWeekNumber(currentDate);
            const currentYear = currentDate.getFullYear();
            
            console.log(`No form weeks found, using current week: ${currentWeekNumber}/${currentYear}`);
            
            sortedFormWeeks.push({ year: currentYear, weekNumber: currentWeekNumber });
          }

          // Create cluster visits structure based on actual form weeks
          const clusterVisitsData = clusters.map(cluster => {
            const visitData = {
              clusterId: cluster._id,
              clusterName: cluster.name,
              formWeeks: sortedFormWeeks // Store the actual weeks for reference
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
            ward: wardId,
            wardAdmin: session.user.id,
            questions: initialQuestions,
            basicSurvey: { status: 'not_started' },
            clusterVisits: clusterVisitsData
          });
          await survey.save();
        }

        let hasChanges = false;
        let updateLog = [];

        // Update specific question
        if (questionKey && status) {
          console.log(`Updating question ${questionKey} to ${status}`);
          
          if (!['completed', 'ongoing', 'not_started'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
          }
          
          const currentStatus = survey.questions?.[questionKey]?.status || 'not_started';
          
          if (!survey.questions) {
            survey.questions = {};
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
            
            console.log(`Question ${questionKey} updated: ${currentStatus} -> ${status}`);
          } else {
            console.log(`Question ${questionKey} already has status ${status}, no change needed`);
          }
        }

        // Update basic survey
        if (basicSurveyStatus) {
          console.log(`Updating basic survey to ${basicSurveyStatus}`);
          
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
            
            console.log(`Basic survey updated: ${currentBasicStatus} -> ${basicSurveyStatus}`);
          } else {
            console.log(`Basic survey already has status ${basicSurveyStatus}, no change needed`);
          }
        }

        // Update cluster visits
        if (clusterVisits && Array.isArray(clusterVisits)) {
          console.log(`Updating cluster visits (${clusterVisits.length} clusters)`);
          survey.clusterVisits = clusterVisits;
          hasChanges = true;
          updateLog.push(`Cluster visits updated (${clusterVisits.length} clusters)`);
        }

        // Save changes if any were made
        if (hasChanges) {
          console.log('Changes detected, saving survey...');
          console.log('Update log:', updateLog);
          
          // Mark nested objects as modified for Mongoose
          survey.markModified('questions');
          survey.markModified('basicSurvey');
          survey.markModified('clusterVisits');
          
          // Force update the lastUpdated timestamp
          survey.lastUpdated = new Date();
          
          try {
            const savedSurvey = await survey.save();
            console.log('Survey saved successfully with ID:', savedSurvey._id);
            console.log('New completion rate:', savedSurvey.completionRate);
          } catch (saveError) {
            console.error('Error saving survey:', saveError);
            return res.status(500).json({ 
              message: 'Failed to save survey changes',
              error: saveError.message
            });
          }
        } else {
          console.log('No changes detected, skipping save');
        }

        const updatedSurvey = await DockerSurvey.findById(survey._id)
          .populate('ward', 'name wardNumber panchayath district')
          .populate('wardAdmin', 'name email');

        if (!updatedSurvey) {
          console.error('Failed to fetch updated survey');
          return res.status(500).json({ message: 'Failed to fetch updated survey' });
        }

        console.log('Survey update completed successfully');
        console.log('Final completion rate:', updatedSurvey.completionRate);
        
        res.status(200).json({
          ...updatedSurvey.toObject(),
          updateLog: hasChanges ? updateLog : ['No changes made']
        });
      } catch (error) {
        console.error('Error updating docker survey:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
          message: 'Error updating docker survey',
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}