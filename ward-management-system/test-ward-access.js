const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const User = require('./models/User').default;
const Ward = require('./models/Ward').default;

async function testWardAccess() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a Ward Incharge user
    const wardAdmin = await User.findOne({ role: 'wardAdmin' });
    if (!wardAdmin) {
      console.log('No Ward Incharge found');
      return;
    }

    console.log(`Testing access for Ward Incharge: ${wardAdmin.name} (ID: ${wardAdmin._id})`);

    // Find the ward assigned to this Ward Incharge
    const assignedWard = await Ward.findOne({ wardAdmin: wardAdmin._id });
    if (!assignedWard) {
      console.log('❌ Ward Incharge is not assigned to any ward');
      
      // Check if there are any wards without Ward Incharge
      const unassignedWards = await Ward.find({ 
        $or: [
          { wardAdmin: { $exists: false } },
          { wardAdmin: null }
        ]
      }).limit(1);
      
      if (unassignedWards.length > 0) {
        console.log(`Found unassigned ward: ${unassignedWards[0].name}`);
        console.log('Assigning Ward Incharge to this ward...');
        
        unassignedWards[0].wardAdmin = wardAdmin._id;
        await unassignedWards[0].save();
        
        console.log('✅ Ward Incharge assigned successfully');
      }
      
      return;
    }

    console.log(`✅ Ward Incharge is assigned to: ${assignedWard.name} (#${assignedWard.wardNumber})`);
    console.log(`Ward ID: ${assignedWard._id}`);

    // Test the access verification logic
    async function verifyWardAccess(user, wardId) {
      try {
        if (user.role === 'wardAdmin') {
          const ward = await Ward.findOne({
            _id: wardId,
            wardAdmin: user.id || user._id
          });
          return !!ward;
        }
        return false;
      } catch (error) {
        console.error('Error verifying ward access:', error);
        return false;
      }
    }

    const hasAccess = await verifyWardAccess(wardAdmin, assignedWard._id);
    console.log(`Access verification result: ${hasAccess ? '✅ GRANTED' : '❌ DENIED'}`);

    // Test with wrong ward ID
    const otherWard = await Ward.findOne({ _id: { $ne: assignedWard._id } });
    if (otherWard) {
      const hasAccessToOther = await verifyWardAccess(wardAdmin, otherWard._id);
      console.log(`Access to other ward (${otherWard.name}): ${hasAccessToOther ? '❌ GRANTED (should be denied)' : '✅ DENIED (correct)'}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testWardAccess();