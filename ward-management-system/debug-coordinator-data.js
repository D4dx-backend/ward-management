// Debug script to check coordinator data
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User').default;
const Ward = require('./models/Ward').default;
const WardVisit = require('./models/WardVisit').default;

async function debugCoordinatorData() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Find all coordinators
    const coordinators = await User.find({ role: 'coordinator' });
    console.log(`Found ${coordinators.length} coordinators`);

    for (const coordinator of coordinators) {
      console.log(`\n--- Coordinator: ${coordinator.name} (${coordinator.email}) ---`);
      
      // Find wards assigned to this coordinator
      const wards = await Ward.find({ 
        coordinator: coordinator._id,
        isActive: true 
      });
      
      console.log(`Assigned wards: ${wards.length}`);
      wards.forEach(ward => {
        console.log(`  - ${ward.name} (Ward #${ward.wardNumber}) in ${ward.district}`);
      });
      
      if (wards.length > 0) {
        const wardIds = wards.map(w => w._id);
        
        // Find visits for these wards
        const visits = await WardVisit.find({ 
          ward: { $in: wardIds }
        }).populate('ward', 'name wardNumber');
        
        console.log(`Ward visits: ${visits.length}`);
        visits.forEach(visit => {
          console.log(`  - ${visit.ward?.name} on ${visit.visitDate.toDateString()}: ${visit.purpose?.substring(0, 50)}...`);
        });
      }
    }

    await mongoose.disconnect();
    console.log('\nDatabase connection closed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugCoordinatorData();