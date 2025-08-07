// Script to seed test cluster data for coordinator
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const Ward = require('./models/Ward');
const Cluster = require('./models/Cluster');
const User = require('./models/User');

async function seedClusterData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a coordinator user (or create one for testing)
    let coordinator = await User.findOne({ role: 'coordinator' });
    
    if (!coordinator) {
      console.log('No coordinator found. Creating test coordinator...');
      coordinator = new User({
        name: 'Test Coordinator',
        email: 'coordinator@test.com',
        role: 'coordinator',
        district: 'Test District',
        isActive: true
      });
      await coordinator.save();
      console.log('Test coordinator created');
    }

    console.log('Using coordinator:', coordinator.name, coordinator._id);

    // Create test wards for the coordinator
    const wardNames = ['Central Ward', 'East Ward', 'West Ward', 'North Ward'];
    const wards = [];

    for (let i = 0; i < wardNames.length; i++) {
      let ward = await Ward.findOne({ 
        name: wardNames[i], 
        coordinator: coordinator._id 
      });

      if (!ward) {
        ward = new Ward({
          name: wardNames[i],
          wardNumber: `W${i + 1}`,
          panchayath: 'Test Panchayath',
          district: coordinator.district,
          coordinator: coordinator._id,
          population: Math.floor(Math.random() * 5000) + 1000,
          area: `${Math.floor(Math.random() * 10) + 1} sq km`,
          isActive: true,
          createdBy: coordinator._id
        });
        await ward.save();
        console.log(`Created ward: ${ward.name}`);
      }
      wards.push(ward);
    }

    // Create test clusters for each ward
    for (const ward of wards) {
      const existingClusters = await Cluster.find({ ward: ward._id });
      
      if (existingClusters.length === 0) {
        const clusterCount = Math.floor(Math.random() * 5) + 3; // 3-7 clusters per ward
        
        for (let i = 0; i < clusterCount; i++) {
          const cluster = new Cluster({
            name: `${ward.name} Cluster ${i + 1}`,
            clusterNumber: `C${i + 1}`,
            description: `Test cluster ${i + 1} in ${ward.name}`,
            ward: ward._id,
            coordinator: {
              name: 'Local Coordinator',
              mobileNumber: `98765432${i}${Math.floor(Math.random() * 10)}`,
              email: `cluster${i + 1}@test.com`
            },
            status: 'active',
            householdCount: Math.floor(Math.random() * 100) + 20,
            population: Math.floor(Math.random() * 500) + 100,
            area: Math.floor(Math.random() * 5) + 1,
            lastVisited: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
            isActive: true,
            createdBy: coordinator._id
          });
          
          await cluster.save();
          console.log(`Created cluster: ${cluster.name}`);
        }
      } else {
        console.log(`Ward ${ward.name} already has ${existingClusters.length} clusters`);
      }
    }

    console.log('\n✅ Cluster data seeding completed successfully!');
    console.log(`Created/verified ${wards.length} wards with clusters for coordinator: ${coordinator.name}`);

  } catch (error) {
    console.error('❌ Error seeding cluster data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding
seedClusterData();