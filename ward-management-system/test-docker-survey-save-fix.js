const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User').default;
const Ward = require('./models/Ward').default;
const DockerSurvey = require('./models/DockerSurvey').default;

async function testDockerSurveySave() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a ward admin with a survey
    const wardAdmin = await User.findOne({ 
      role: 'wardAdmin',
      mobileNumber: '9605097946' // This user has a survey
    });
    
    if (!wardAdmin) {
      console.log('❌ Ward admin not found');
      return;
    }
    
    console.log(`✅ Found ward admin: ${wardAdmin.name} (${wardAdmin._id})`);
    
    // Find their ward
    const ward = await Ward.findOne({ wardAdmin: wardAdmin._id });
    if (!ward) {
      console.log('❌ Ward not found');
      return;
    }
    
    console.log(`✅ Found ward: ${ward.name} (${ward._id})`);
    
    // Find their survey
    let survey = await DockerSurvey.findOne({ ward: ward._id });
    if (!survey) {
      console.log('❌ Survey not found');
      return;
    }
    
    console.log(`✅ Found survey: ${survey._id}`);
    console.log(`Current completion rate: ${survey.completionRate}%`);
    console.log(`Current basic survey status: ${survey.basicSurvey?.status || 'not_started'}`);
    
    // Test 1: Update a docket survey question
    console.log('\n=== TEST 1: Update Docket Survey Question ===');
    const questionKey = 'populationCensus';
    const newStatus = 'completed';
    
    console.log(`Updating ${questionKey} to ${newStatus}...`);
    
    // Initialize questions if not exists
    if (!survey.questions) {
      survey.questions = {};
    }
    if (!survey.questions[questionKey]) {
      survey.questions[questionKey] = {};
    }
    
    const oldStatus = survey.questions[questionKey].status || 'not_started';
    survey.questions[questionKey].status = newStatus;
    survey.questions[questionKey].previousStatus = oldStatus;
    survey.questions[questionKey].lastUpdated = new Date();
    
    // Mark as modified for Mongoose
    survey.markModified('questions');
    
    try {
      const savedSurvey = await survey.save();
      console.log(`✅ Question updated successfully`);
      console.log(`New completion rate: ${savedSurvey.completionRate}%`);
    } catch (saveError) {
      console.log(`❌ Failed to save question update:`, saveError.message);
    }
    
    // Test 2: Update basic survey
    console.log('\n=== TEST 2: Update Basic Survey ===');
    const basicStatus = 'ongoing';
    
    console.log(`Updating basic survey to ${basicStatus}...`);
    
    if (!survey.basicSurvey) {
      survey.basicSurvey = {};
    }
    
    const oldBasicStatus = survey.basicSurvey.status || 'not_started';
    survey.basicSurvey.status = basicStatus;
    survey.basicSurvey.previousStatus = oldBasicStatus;
    survey.basicSurvey.lastUpdated = new Date();
    
    // Mark as modified for Mongoose
    survey.markModified('basicSurvey');
    
    try {
      const savedSurvey = await survey.save();
      console.log(`✅ Basic survey updated successfully`);
      console.log(`Basic survey status: ${savedSurvey.basicSurvey.status}`);
    } catch (saveError) {
      console.log(`❌ Failed to save basic survey update:`, saveError.message);
    }
    
    // Test 3: Update House Visits
    console.log('\n=== TEST 3: Update House Visits ===');
    
    if (survey.clusterVisits && survey.clusterVisits.length > 0) {
      console.log(`Found ${survey.clusterVisits.length} House Visits`);
      
      // Update first cluster's first week data
      const firstCluster = survey.clusterVisits[0];
      console.log(`Updating cluster: ${firstCluster.clusterName}`);
      
      if (firstCluster.week1) {
        // Old structure
        firstCluster.week1.houses = 10;
        firstCluster.week1.days = 5;
        console.log(`Updated old structure: houses=10, days=5`);
      } else if (firstCluster.weeklyData) {
        // New structure
        const firstWeekKey = Object.keys(firstCluster.weeklyData)[0];
        if (firstWeekKey) {
          firstCluster.weeklyData[firstWeekKey].houses = 15;
          firstCluster.weeklyData[firstWeekKey].days = 6;
          console.log(`Updated new structure: houses=15, days=6`);
        }
      }
      
      // Mark as modified for Mongoose
      survey.markModified('clusterVisits');
      
      try {
        const savedSurvey = await survey.save();
        console.log(`✅ House Visits updated successfully`);
      } catch (saveError) {
        console.log(`❌ Failed to save House Visits update:`, saveError.message);
      }
    } else {
      console.log(`❌ No House Visits found`);
    }
    
    // Final verification
    console.log('\n=== FINAL VERIFICATION ===');
    const finalSurvey = await DockerSurvey.findById(survey._id);
    console.log(`Final completion rate: ${finalSurvey.completionRate}%`);
    console.log(`Final basic survey status: ${finalSurvey.basicSurvey?.status || 'not_started'}`);
    console.log(`Final last updated: ${finalSurvey.lastUpdated}`);
    
    // Check if the question was actually saved
    const questionStatus = finalSurvey.questions?.[questionKey]?.status;
    console.log(`Question ${questionKey} status: ${questionStatus}`);
    
    if (questionStatus === newStatus) {
      console.log(`✅ Question update persisted correctly`);
    } else {
      console.log(`❌ Question update did not persist`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testDockerSurveySave();