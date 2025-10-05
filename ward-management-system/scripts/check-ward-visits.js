const mongoose = require('mongoose');
require('dotenv').config();

// Import the WardVisit model
const WardVisit = require('../models/WardVisit');

async function checkWardVisits() {
  try {
    // Connect to MongoDB using the same method as the app
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all ward visits
    const visits = await WardVisit.find({})
      .populate('coordinator', 'name email role')
      .populate('recordedBy', 'name email role')
      .populate('ward', 'name')
      .sort({ visitDate: -1 })
      .limit(10);

    console.log('\n=== Recent Ward Visits Data ===');
    visits.forEach((visit, index) => {
      console.log(`\n${index + 1}. Visit ID: ${visit._id}`);
      console.log(`   guestVisit: "${visit.guestVisit}"`);
      console.log(`   recordedByRole: "${visit.recordedByRole}"`);
      console.log(`   coordinator: ${visit.coordinator?.name || 'N/A'}`);
      console.log(`   recordedBy: ${visit.recordedBy?.name || 'N/A'}`);
      console.log(`   purpose: ${visit.purpose?.substring(0, 50)}...`);
      console.log(`   visitDate: ${visit.visitDate}`);
    });

    // Check for visits with "Ward Admin" as guestVisit
    const wardAdminVisits = await WardVisit.find({ guestVisit: 'Ward Admin' });
    console.log(`\n=== Visits with "Ward Admin" as guestVisit: ${wardAdminVisits.length} ===`);

    // Check for visits with empty guestVisit
    const emptyGuestVisits = await WardVisit.find({ 
      $or: [
        { guestVisit: '' },
        { guestVisit: { $exists: false } },
        { guestVisit: null }
      ]
    });
    console.log(`\n=== Visits with empty guestVisit: ${emptyGuestVisits.length} ===`);

    // Check for coordinator visits
    const coordinatorVisits = await WardVisit.find({ recordedByRole: 'coordinator' });
    console.log(`\n=== Coordinator visits: ${coordinatorVisits.length} ===`);

    // Check for ward admin visits
    const wardAdminRecordedVisits = await WardVisit.find({ recordedByRole: 'wardAdmin' });
    console.log(`\n=== Ward Admin recorded visits: ${wardAdminRecordedVisits.length} ===`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkWardVisits();
