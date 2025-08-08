const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const DockerSurvey = require('./models/DockerSurvey').default;

async function checkSurveyStructure() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the specific survey
    const survey = await DockerSurvey.findById('689476975f0039a612a49811');
    
    if (!survey) {
      console.log('❌ Survey not found');
      return;
    }
    
    console.log(`✅ Found survey: ${survey._id}`);
    console.log(`House Visits count: ${survey.clusterVisits?.length || 0}`);
    
    if (survey.clusterVisits && survey.clusterVisits.length > 0) {
      const firstCluster = survey.clusterVisits[0];
      console.log('\n=== First Cluster Structure ===');
      console.log(`Cluster Name: ${firstCluster.clusterName}`);
      console.log(`Cluster ID: ${firstCluster.clusterId}`);
      
      // Check for old structure properties
      console.log('\n--- Old Structure Properties ---');
      console.log(`week1: ${firstCluster.week1 ? 'EXISTS' : 'NOT EXISTS'}`);
      console.log(`week2: ${firstCluster.week2 ? 'EXISTS' : 'NOT EXISTS'}`);
      console.log(`week3: ${firstCluster.week3 ? 'EXISTS' : 'NOT EXISTS'}`);
      console.log(`week4: ${firstCluster.week4 ? 'EXISTS' : 'NOT EXISTS'}`);
      
      // Check for new structure properties
      console.log('\n--- New Structure Properties ---');
      console.log(`formWeeks: ${firstCluster.formWeeks ? 'EXISTS' : 'NOT EXISTS'}`);
      console.log(`weeklyData: ${firstCluster.weeklyData ? 'EXISTS' : 'NOT EXISTS'}`);
      
      if (firstCluster.formWeeks) {
        console.log(`formWeeks length: ${firstCluster.formWeeks.length}`);
        console.log(`formWeeks content:`, firstCluster.formWeeks);
      }
      
      if (firstCluster.weeklyData) {
        console.log(`weeklyData keys:`, Object.keys(firstCluster.weeklyData));
        console.log(`weeklyData content:`, firstCluster.weeklyData);
      }
      
      // Show full structure
      console.log('\n--- Full First Cluster Object ---');
      console.log(JSON.stringify(firstCluster, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkSurveyStructure();