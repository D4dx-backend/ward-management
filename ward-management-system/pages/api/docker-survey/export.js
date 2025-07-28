import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/mongodb';
import DockerSurvey from '../../../models/DockerSurvey';

export default async function handler(req, res) {
  const { method } = req;

  await dbConnect();

  const session = await getSession({ req });
  if (!session || session.user.role !== 'stateAdmin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const surveys = await DockerSurvey.find({})
      .populate('ward', 'name wardNumber panchayath district')
      .populate('wardAdmin', 'name email')
      .sort({ 'ward.district': 1, 'ward.panchayath': 1, 'ward.name': 1 });

    // Create CSV content
    const csvHeaders = [
      'Ward Name',
      'Ward Number',
      'Panchayath',
      'District',
      'Ward Admin',
      'Admin Email',
      'Completion Rate (%)',
      'Population Census',
      'Ward Review',
      'Religious Voter Inclination',
      'Community Voter Inclination',
      'Religious Organization Voter Inclination',
      'Main Agriculture And Wages',
      'Previous Election Analysis',
      'Last Three Elections Analysis',
      'Relevant Representatives',
      'Political Wages',
      'Main Political Personalities',
      'Social Opposition',
      'Current Local Issues',
      'Welfare Party Understanding',
      'Basic Survey Status',
      'Last Updated'
    ];

    const csvRows = surveys.map(survey => [
      survey.ward?.name || '',
      survey.ward?.wardNumber || '',
      survey.ward?.panchayath || '',
      survey.ward?.district || '',
      survey.wardAdmin?.name || '',
      survey.wardAdmin?.email || '',
      survey.completionRate || 0,
      survey.questions?.populationCensus?.status || 'not_started',
      survey.questions?.wardReview?.status || 'not_started',
      survey.questions?.religiousVoterInclination?.status || 'not_started',
      survey.questions?.communityVoterInclination?.status || 'not_started',
      survey.questions?.religiousOrganizationVoterInclination?.status || 'not_started',
      survey.questions?.mainAgricultureAndWages?.status || 'not_started',
      survey.questions?.previousElectionAnalysis?.status || 'not_started',
      survey.questions?.lastThreeElectionsAnalysis?.status || 'not_started',
      survey.questions?.relevantRepresentatives?.status || 'not_started',
      survey.questions?.politicalWages?.status || 'not_started',
      survey.questions?.mainPoliticalPersonalities?.status || 'not_started',
      survey.questions?.socialOpposition?.status || 'not_started',
      survey.questions?.currentLocalIssues?.status || 'not_started',
      survey.questions?.welfarePartyUnderstanding?.status || 'not_started',
      survey.basicSurvey?.status || 'not_started',
      survey.lastUpdated ? new Date(survey.lastUpdated).toLocaleString() : 'Never'
    ]);

    // Convert to CSV format
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=docker-surveys-${new Date().toISOString().split('T')[0]}.csv`);
    
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting docker surveys:', error);
    res.status(500).json({ message: 'Error exporting docker surveys' });
  }
}