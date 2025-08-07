import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import connectToDatabase from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';
import Ward from '../../../models/Ward';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'wardAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  await connectToDatabase();
  
  try {
    // Get the Ward Incharge's ward
    const ward = await Ward.findOne({ wardAdmin: session.user.id });
    
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found for this admin' });
    }

    // Get the survey document
    const survey = await DockerSurvey.findOne({ ward: ward._id });
    
    if (!survey) {
      return res.status(404).json({ message: 'No survey found for this ward' });
    }

    // Get all clusters for this ward
    const Cluster = require('../../../models/Cluster').default;
    const wardClusters = await Cluster.find({ ward: ward._id, isActive: { $ne: false } }).sort({ clusterNumber: 1 });
    
    // Analyze the survey cluster visits
    const surveyClusterDetails = [];
    
    for (const clusterVisit of survey.clusterVisits) {
      if (clusterVisit.clusterId) {
        // Try to find the actual cluster
        const actualCluster = await Cluster.findById(clusterVisit.clusterId);
        surveyClusterDetails.push({
          surveyClusterName: clusterVisit.clusterName,
          clusterId: clusterVisit.clusterId,
          actualCluster: actualCluster ? {
            name: actualCluster.name,
            wardId: actualCluster.ward,
            wardName: actualCluster.ward?.toString() === ward._id.toString() ? 'THIS WARD' : 'OTHER WARD',
            isActive: actualCluster.isActive
          } : 'CLUSTER NOT FOUND',
          belongsToThisWard: actualCluster?.ward?.toString() === ward._id.toString()
        });
      } else {
        surveyClusterDetails.push({
          surveyClusterName: clusterVisit.clusterName,
          clusterId: 'NO CLUSTER ID',
          actualCluster: 'NO CLUSTER ID',
          belongsToThisWard: false
        });
      }
    }

    const debugInfo = {
      ward: {
        id: ward._id,
        name: ward.name
      },
      survey: {
        id: survey._id,
        clusterVisitsCount: survey.clusterVisits.length,
        clusterVisitDetails: surveyClusterDetails
      },
      actualWardClusters: {
        count: wardClusters.length,
        clusters: wardClusters.map(c => ({
          id: c._id,
          name: c.name,
          number: c.clusterNumber,
          isActive: c.isActive
        }))
      },
      analysis: {
        clustersInSurveyButNotInWard: surveyClusterDetails.filter(c => !c.belongsToThisWard).length,
        clustersInWardButNotInSurvey: wardClusters.filter(wc => 
          !survey.clusterVisits.some(cv => cv.clusterId?.toString() === wc._id.toString())
        ).length
      }
    };

    res.status(200).json(debugInfo);
  } catch (error) {
    console.error('Survey clusters debug error:', error);
    res.status(500).json({ message: 'Error fetching survey cluster debug info', error: error.message });
  }
}