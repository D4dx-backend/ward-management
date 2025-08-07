const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User').default;
const Ward = require('./models/Ward').default;

async function debugWardAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all Ward Incharge users
    const wardAdmins = await User.find({ role: 'wardAdmin' }).select('name email mobileNumber');
    console.log('\n=== Ward Incharge Users ===');
    console.log(`Found ${wardAdmins.length} Ward Incharge users:`);
    
    for (const admin of wardAdmins) {
      console.log(`- ${admin.name} (ID: ${admin._id})`);
      console.log(`  Email: ${admin.email || 'Not set'}`);
      console.log(`  Mobile: ${admin.mobileNumber || 'Not set'}`);
      
      // Check if this Ward Incharge is assigned to any ward
      const assignedWard = await Ward.findOne({ wardAdmin: admin._id })
        .populate('coordinator', 'name')
        .select('name wardNumber panchayath district coordinator');
      
      if (assignedWard) {
        console.log(`  ✅ Assigned to ward: ${assignedWard.name} (#${assignedWard.wardNumber})`);
        console.log(`     Panchayath: ${assignedWard.panchayath}, District: ${assignedWard.district}`);
        console.log(`     Coordinator: ${assignedWard.coordinator?.name || 'Not assigned'}`);
      } else {
        console.log(`  ❌ NOT assigned to any ward`);
      }
      console.log('');
    }

    // Check for wards without Ward Incharges
    const wardsWithoutAdmin = await Ward.find({ wardAdmin: { $exists: false } })
      .populate('coordinator', 'name')
      .select('name wardNumber panchayath district coordinator');
    
    console.log('\n=== Wards Without Ward Incharge ===');
    console.log(`Found ${wardsWithoutAdmin.length} wards without Ward Incharge:`);
    
    for (const ward of wardsWithoutAdmin) {
      console.log(`- ${ward.name} (#${ward.wardNumber})`);
      console.log(`  Panchayath: ${ward.panchayath}, District: ${ward.district}`);
      console.log(`  Coordinator: ${ward.coordinator?.name || 'Not assigned'}`);
      console.log('');
    }

    // Check for wards with null Ward Incharge
    const wardsWithNullAdmin = await Ward.find({ wardAdmin: null })
      .populate('coordinator', 'name')
      .select('name wardNumber panchayath district coordinator');
    
    console.log('\n=== Wards With Null Ward Incharge ===');
    console.log(`Found ${wardsWithNullAdmin.length} wards with null Ward Incharge:`);
    
    for (const ward of wardsWithNullAdmin) {
      console.log(`- ${ward.name} (#${ward.wardNumber})`);
      console.log(`  Panchayath: ${ward.panchayath}, District: ${ward.district}`);
      console.log(`  Coordinator: ${ward.coordinator?.name || 'Not assigned'}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugWardAdmin();