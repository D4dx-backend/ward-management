const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User').default;
const Ward = require('./models/Ward').default;
const DockerSurvey = require('./models/DockerSurvey').default;

async function debugDockerSurveySave() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all Ward Incharge users
    const wardAdmins = await User.find({ role: 'wardAdmin' }).select('name email mobileNumber');
    console.log('\n=== Ward Incharge Users ===');
    console.log(`Found ${wardAdmins.length} Ward Incharge users:`);
    
    for (const admin of wardAdmins) {
      console.log(`\n- ${admin.name} (ID: ${admin._id})`);
      console.log(`  Email: ${admin.email || 'Not set'}`);
      console.log(`  Mobile: ${admin.mobileNumber || 'Not set'}`);
      
      // Check if this Ward Incharge is assigned to any ward
      const assignedWard = await Ward.findOne({ wardAdmin: admin._id })
        .select('name wardNumber panchayath district');
      
      if (assignedWard) {
        console.log(`  ✅ Assigned to ward: ${assignedWard.name} (#${assignedWard.wardNumber})`);
        
        // Check if they have a docker survey
        const survey = await DockerSurvey.findOne({ ward: assignedWard._id });
        
        if (survey) {
          console.log(`  📋 Has Docker Survey (ID: ${survey._id})`);
          console.log(`     Completion Rate: ${survey.completionRate}%`);
          console.log(`     Basic Survey Status: ${survey.basicSurvey?.status || 'not_started'}`);
          console.log(`     Last Updated: ${survey.lastUpdated}`);
          
          // Check question statuses
          const questions = survey.questions || {};
          const completedQuestions = Object.entries(questions).filter(([key, q]) => q.status === 'completed');
          console.log(`     Completed Questions: ${completedQuestions.length}/${Object.keys(questions).length}`);
          
          if (completedQuestions.length > 0) {
            console.log(`     Completed: ${completedQuestions.map(([key]) => key).join(', ')}`);
          }
          
          // Check cluster visits
          console.log(`     Cluster Visits: ${survey.clusterVisits?.length || 0} clusters`);
          if (survey.clusterVisits?.length > 0) {
            const firstCluster = survey.clusterVisits[0];
            console.log(`     First Cluster: ${firstCluster.clusterName}`);
            if (firstCluster.formWeeks) {
              console.log(`     Structure: New (formWeeks: ${firstCluster.formWeeks.length})`);
            } else if (firstCluster.week1) {
              console.log(`     Structure: Old (week1-week4)`);
            }
          }
          
        } else {
          console.log(`  ❌ NO Docker Survey found`);
        }
      } else {
        console.log(`  ❌ NOT assigned to any ward`);
      }
    }

    // Check for orphaned surveys
    console.log('\n=== Orphaned Docker Surveys ===');
    const allSurveys = await DockerSurvey.find({})
      .populate('ward', 'name wardNumber')
      .populate('wardAdmin', 'name');
    
    console.log(`Found ${allSurveys.length} total surveys:`);
    
    for (const survey of allSurveys) {
      console.log(`\n- Survey ID: ${survey._id}`);
      console.log(`  Ward: ${survey.ward?.name || 'MISSING'} (#${survey.ward?.wardNumber || 'N/A'})`);
      console.log(`  Ward Admin: ${survey.wardAdmin?.name || 'MISSING'}`);
      console.log(`  Completion: ${survey.completionRate}%`);
      console.log(`  Basic Survey: ${survey.basicSurvey?.status || 'not_started'}`);
      console.log(`  Last Updated: ${survey.lastUpdated}`);
      
      if (!survey.ward) {
        console.log(`  ⚠️  ORPHANED: Ward reference missing`);
      }
      if (!survey.wardAdmin) {
        console.log(`  ⚠️  ORPHANED: Ward Admin reference missing`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugDockerSurveySave();