const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User').default;
const Ward = require('./models/Ward').default;
const DockerSurvey = require('./models/DockerSurvey').default;
const Cluster = require('./models/Cluster').default;
const FormTemplate = require('./models/FormTemplate').default;

// Helper function to calculate week number from date
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function fixDockerSurveyStructure() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all surveys with old structure
    const surveys = await DockerSurvey.find({});
    console.log(`\n=== Found ${surveys.length} Docker Surveys ===`);

    for (const survey of surveys) {
      console.log(`\n--- Processing Survey ${survey._id} ---`);
      
      // Get ward info
      const ward = await Ward.findById(survey.ward);
      if (!ward) {
        console.log(`❌ Ward not found for survey ${survey._id}`);
        continue;
      }
      
      console.log(`Ward: ${ward.name} (#${ward.wardNumber})`);
      
      // Check if survey has old structure
      const hasOldStructure = survey.clusterVisits?.some(cluster => 
        cluster.week1 !== undefined || cluster.week2 !== undefined
      );
      
      const hasNewStructure = survey.clusterVisits?.some(cluster => 
        cluster.formWeeks !== undefined || cluster.weeklyData !== undefined
      );
      
      console.log(`Old structure: ${hasOldStructure ? 'YES' : 'NO'}`);
      console.log(`New structure: ${hasNewStructure ? 'YES' : 'NO'}`);
      
      if (hasOldStructure || !hasNewStructure) {
        console.log(`🔄 Converting to new structure...`);
        
        // Get all clusters for this ward
        const clusters = await Cluster.find({ 
          ward: survey.ward, 
          isActive: { $ne: false } 
        }).sort({ clusterNumber: 1 });
        
        console.log(`Found ${clusters.length} clusters for ward`);
        
        // Get form weeks from FormTemplate
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

        console.log(`Using ${sortedFormWeeks.length} form weeks:`, 
          sortedFormWeeks.map(w => `Week ${w.weekNumber}, ${w.year}`).join(', ')
        );

        // Create new cluster visits structure
        const newClusterVisits = clusters.map(cluster => {
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

          // Try to preserve old data if it exists
          const oldCluster = survey.clusterVisits?.find(c => 
            c.clusterName === cluster.name || c.clusterId?.toString() === cluster._id.toString()
          );
          
          if (oldCluster) {
            console.log(`  Preserving data for cluster: ${cluster.name}`);
            
            // Map old week data to new structure
            const oldWeeks = ['week1', 'week2', 'week3', 'week4'];
            oldWeeks.forEach((oldWeek, index) => {
              if (oldCluster[oldWeek] && sortedFormWeeks[index]) {
                const week = sortedFormWeeks[index];
                const weekKey = `${week.year}-${week.weekNumber}`;
                visitData.weeklyData[weekKey] = {
                  houses: oldCluster[oldWeek].houses || 0,
                  days: oldCluster[oldWeek].days || 0,
                  weekNumber: week.weekNumber,
                  year: week.year
                };
              }
            });
          }

          return visitData;
        });

        // Update the survey
        survey.clusterVisits = newClusterVisits;
        survey.markModified('clusterVisits');
        
        try {
          await survey.save();
          console.log(`✅ Survey structure updated successfully`);
          console.log(`   Clusters: ${newClusterVisits.length}`);
          console.log(`   Weeks per cluster: ${sortedFormWeeks.length}`);
        } catch (saveError) {
          console.log(`❌ Failed to save survey:`, saveError.message);
        }
        
      } else {
        console.log(`✅ Survey already has new structure`);
      }
    }

    console.log('\n=== Structure Fix Complete ===');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixDockerSurveyStructure();