const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

// Define User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  mobileNumber: String,
  pinCode: String,
  role: String,
  district: String,
  createdAt: { type: Date, default: Date.now },
});

async function verifyLogin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    console.log('=== AVAILABLE LOGIN OPTIONS ===\n');

    // Check State Admin
    const stateAdmin = await User.findOne({ role: 'stateAdmin' });
    if (stateAdmin) {
      console.log('🔑 STATE ADMIN LOGIN:');
      console.log(`   Email: ${stateAdmin.email}`);
      console.log(`   Password: admin123 (default)`);
      console.log(`   Role: ${stateAdmin.role}`);
      console.log(`   Can create wards: ✅ YES\n`);
    }

    // Check Coordinators
    const coordinators = await User.find({ role: 'coordinator' });
    if (coordinators.length > 0) {
      console.log('👥 COORDINATOR LOGIN(S):');
      for (const coord of coordinators) {
        console.log(`   Name: ${coord.name}`);
        console.log(`   Mobile: ${coord.mobileNumber}`);
        console.log(`   PIN: ${coord.pinCode} (4-digit PIN)`);
        console.log(`   Role: ${coord.role}`);
        console.log(`   Can create wards: ✅ YES\n`);
      }
    }

    // Check Ward Admins (for reference)
    const wardAdmins = await User.find({ role: 'wardAdmin' });
    if (wardAdmins.length > 0) {
      console.log('🏢 WARD ADMIN LOGIN(S):');
      for (const admin of wardAdmins) {
        console.log(`   Name: ${admin.name}`);
        console.log(`   Mobile: ${admin.mobileNumber}`);
        console.log(`   PIN: ${admin.pinCode} (4-digit PIN)`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Can create wards: ❌ NO\n`);
      }
    }

    console.log('=== INSTRUCTIONS ===');
    console.log('To create wards, you must log in as either:');
    console.log('1. State Admin (using email & password)');
    console.log('2. Coordinator (using mobile & PIN)');
    console.log('');
    console.log('If you\'re getting "Unauthorized" error:');
    console.log('- Make sure you\'re logged in');
    console.log('- Check you\'re using the correct role');
    console.log('- Try logging out and logging back in');
    console.log('');
    console.log('Login URL: http://localhost:3000/auth/signin');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

verifyLogin();