import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import connectToDatabase from '../../lib/mongodb';
import DockerSurvey from '../../models/DockerSurvey';
import WardBasicData from '../../models/WardBasicData';
import Ward from '../../models/Ward';
import User from '../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();
    
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const results = {
      timestamp: new Date().toISOString(),
      user: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.name
      },
      tests: {}
    };

    // Test 1: Database Connection
    try {
      const userCount = await User.countDocuments();
      results.tests.databaseConnection = {
        status: 'success',
        message: `Connected to database. Found ${userCount} users.`
      };
    } catch (error) {
      results.tests.databaseConnection = {
        status: 'error',
        message: `Database connection failed: ${error.message}`
      };
    }

    // Test 2: Docker Survey Model
    try {
      const dockerSurveyCount = await DockerSurvey.countDocuments();
      results.tests.dockerSurveyModel = {
        status: 'success',
        message: `Docker Survey model working. Found ${dockerSurveyCount} surveys.`
      };
    } catch (error) {
      results.tests.dockerSurveyModel = {
        status: 'error',
        message: `Docker Survey model error: ${error.message}`
      };
    }

    // Test 3: Ward Basic Data Model
    try {
      const wardBasicDataCount = await WardBasicData.countDocuments();
      results.tests.wardBasicDataModel = {
        status: 'success',
        message: `Ward Basic Data model working. Found ${wardBasicDataCount} entries.`
      };
    } catch (error) {
      results.tests.wardBasicDataModel = {
        status: 'error',
        message: `Ward Basic Data model error: ${error.message}`
      };
    }

    // Test 4: User's Ward Access (for ward admins)
    if (session.user.role === 'wardAdmin') {
      try {
        const ward = await Ward.findOne({ wardAdmin: session.user.id });
        if (ward) {
          results.tests.wardAccess = {
            status: 'success',
            message: `Ward admin has access to ward: ${ward.name} (${ward.wardNumber})`
          };
        } else {
          results.tests.wardAccess = {
            status: 'warning',
            message: 'Ward admin has no assigned ward'
          };
        }
      } catch (error) {
        results.tests.wardAccess = {
          status: 'error',
          message: `Ward access check failed: ${error.message}`
        };
      }
    }

    // Test 5: Docker Survey for User's Ward (for ward admins)
    if (session.user.role === 'wardAdmin') {
      try {
        const ward = await Ward.findOne({ wardAdmin: session.user.id });
        if (ward) {
          const survey = await DockerSurvey.findOne({ ward: ward._id });
          if (survey) {
            results.tests.userDockerSurvey = {
              status: 'success',
              message: `Docker survey exists. Completion: ${survey.completionRate}%`
            };
          } else {
            results.tests.userDockerSurvey = {
              status: 'warning',
              message: 'No Docker survey found for user\'s ward'
            };
          }
        }
      } catch (error) {
        results.tests.userDockerSurvey = {
          status: 'error',
          message: `Docker survey check failed: ${error.message}`
        };
      }
    }

    // Overall status
    const hasErrors = Object.values(results.tests).some(test => test.status === 'error');
    const hasWarnings = Object.values(results.tests).some(test => test.status === 'warning');
    
    results.overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';

    res.status(200).json(results);

  } catch (error) {
    console.error('Test surveys API error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}