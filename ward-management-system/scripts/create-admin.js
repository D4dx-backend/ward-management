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
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    unique: function() {
      return this.role === 'coordinator' || this.role === 'wardAdmin';
    },
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
  district: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create admin user
async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create User model
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@d4media.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const adminUser = new User({
      name: 'State Admin',
      email: 'admin@d4media.com',
      password: hashedPassword,
      role: 'stateAdmin',
      // Mobile number and PIN are not required for state admin
    });

    await adminUser.save();
    console.log('Admin user created successfully');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
createAdminUser();