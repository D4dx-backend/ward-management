import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';
import Ward from '../../../models/Ward';

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

  // Only ward admins can access this endpoint
  if (session.user.role !== 'wardAdmin') {
    console.log('Docker Survey API - Access denied for role:', session.user.role);
    return res.status(403).json({ message: 'Access denied - Ward admin role required' });
  }

  // Get the ward admin's ward
  const ward = await Ward.findOne({ wardAdmin: session.user.id });
  
  if (!ward) {
    return res.status(404).json({ message: 'Ward not found for this admin. Please contact your administrator to assign you to a ward.' });
  }

  switch (method) {
    case 'GET':
      try {
        let survey = await DockerSurvey.findOne({ ward: ward._id })
          .populate('ward', 'name wardNumber panchayath district')
          .populate('wardAdmin', 'name email');

        if (!survey) {
          // Get all clusters for this ward to populate cluster visits
          const Cluster = require('../../../models/Cluster').default;
          const clusters = await Cluster.find({ ward: ward._id, isActive: true }).sort({ clusterNumber: 1 });
          
          const clusterVisits = clusters.map(cluster => ({
            clusterName: cluster.name,
            week1: { houses: 0, days: 0 },
            week2: { houses: 0, days: 0 },
            week3: { houses: 0, days: 0 },
            week4: { houses: 0, days: 0 }
          }));

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
            ward: ward._id,
            wardAdmin: session.user.id,
            questions: initialQuestions,
            basicSurvey: { status: 'not_started' },
            clusterVisits
          });
          await survey.save();
          
          survey = await DockerSurvey.findById(survey._id)
            .populate('ward', 'name wardNumber panchayath district')
            .populate('wardAdmin', 'name email');
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
        
        console.log('Docker Survey Update Request:', {
          questionKey,
          status,
          basicSurveyStatus,
          clusterVisitsLength: clusterVisits?.length,
          wardId: ward._id
        });

        let survey = await DockerSurvey.findOne({ ward: ward._id });
        
        if (!survey) {
          console.log('Survey not found, creating new one...');
          // Create survey if it doesn't exist
          const Cluster = require('../../../models/Cluster').default;
          const clusters = await Cluster.find({ ward: ward._id, isActive: true }).sort({ clusterNumber: 1 });
          
          const clusterVisitsData = clusters.map(cluster => ({
            clusterName: cluster.name,
            week1: { houses: 0, days: 0 },
            week2: { houses: 0, days: 0 },
            week3: { houses: 0, days: 0 },
            week4: { houses: 0, days: 0 }
          }));

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
            clusterVisits: clusterVisitsData
          });
          await survey.save();
        }

        let hasChanges = false;

        // Update specific question
        if (questionKey && status) {
          console.log(`Updating question ${questionKey} to ${status}`);
          
          // Validate status
          if (!['completed', 'ongoing', 'not_started'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
          }
          
          const currentStatus = survey.questions[questionKey]?.status;
          
          // Initialize question object if it doesn't exist
          if (!survey.questions) {
            survey.questions = {};
          }
          if (!survey.questions[questionKey]) {
            survey.questions[questionKey] = {};
          }
          
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
          
          // Validate status
          if (!['completed', 'ongoing', 'not_started'].includes(basicSurveyStatus)) {
            return res.status(400).json({ message: 'Invalid basic survey status value' });
          }
          
          const currentBasicStatus = survey.basicSurvey?.status;
          
          if (!survey.basicSurvey) {
            survey.basicSurvey = {};
          }
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
          // Mark the document as modified to ensure Mongoose saves it
          survey.markModified('questions');
          survey.markModified('basicSurvey');
          survey.markModified('clusterVisits');
          
          await survey.save();
          console.log('Survey saved successfully');
        }

        const updatedSurvey = await DockerSurvey.findById(survey._id)
          .populate('ward', 'name wardNumber panchayath district')
          .populate('wardAdmin', 'name email');

        console.log('Survey update completed, completion rate:', updatedSurvey.completionRate);
        res.status(200).json(updatedSurvey);
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