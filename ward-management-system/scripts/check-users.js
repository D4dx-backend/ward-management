const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

// Define User Schema (matching the current model)
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
  },
  mobileNumber: {
    type: String,
    sparse: true,
  },
  pinCode: {
    type: String,
  },
  role: {
    type: String,
    enum: ['stateAdmin', 'coordinator', 'wardAdmin'],
    required: true,
  },
  district: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

async function checkUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create User model
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    console.log('Checking users in database...\n');

    // Get all users
    const allUsers = await User.find({}).select('name email role district mobileNumber');
    console.log(`Total users: ${allUsers.length}\n`);

    // Group by role
    const usersByRole = allUsers.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});

    // Display users by role
    Object.keys(usersByRole).forEach(role => {
      console.log(`${role.toUpperCase()} (${usersByRole[role].length}):`);
      usersByRole[role].forEach(user => {
        console.log(`  - ${user.name} ${user.email ? `(${user.email})` : ''} ${user.district ? `[${user.district}]` : '[No District]'} ${user.mobileNumber ? `{${user.mobileNumber}}` : ''}`);
      });
      console.log('');
    });

    // Check for coordinators specifically
    const coordinators = await User.find({ role: 'coordinator' });
    console.log(`\nCoordinators available for ward assignment: ${coordinators.length}`);
    coordinators.forEach(coord => {
      console.log(`  - ${coord.name} (District: ${coord.district || 'Not Set'}) (Mobile: ${coord.mobileNumber || 'Not Set'})`);
    });

    // Check for Ward Incharges
    const wardAdmins = await User.find({ role: 'wardAdmin' });
    console.log(`\nWard Incharges available for ward assignment: ${wardAdmins.length}`);
    wardAdmins.forEach(admin => {
      console.log(`  - ${admin.name} (District: ${admin.district || 'Not Set'}) (Mobile: ${admin.mobileNumber || 'Not Set'})`);
    });

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
checkUsers();