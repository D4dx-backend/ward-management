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

async function fixUserIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create User model
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    console.log('Starting user index fixes...');

    // 1. Drop existing indexes that might be causing issues
    try {
      console.log('Dropping existing indexes...');
      await User.collection.dropIndexes();
      console.log('✅ Dropped existing indexes');
    } catch (error) {
      console.log('⚠️  No indexes to drop or error dropping indexes:', error.message);
    }

    // 2. Create proper indexes
    console.log('Creating new indexes...');
    
    // Email index (sparse - allows null values)
    await User.collection.createIndex({ email: 1 }, { 
      unique: true, 
      sparse: true,
      name: 'email_unique_sparse'
    });
    console.log('✅ Created email index (sparse, unique)');

    // Mobile number index (sparse - allows null values)
    await User.collection.createIndex({ mobileNumber: 1 }, { 
      sparse: true,
      name: 'mobileNumber_sparse'
    });
    console.log('✅ Created mobile number index (sparse)');

    // Role index for faster queries
    await User.collection.createIndex({ role: 1 }, {
      name: 'role_index'
    });
    console.log('✅ Created role index');

    // District index for filtering
    await User.collection.createIndex({ district: 1 }, {
      sparse: true,
      name: 'district_sparse'
    });
    console.log('✅ Created district index (sparse)');

    // 3. Fix any duplicate mobile numbers for coordinators/Ward Incharges
    console.log('Checking for duplicate mobile numbers...');
    const duplicateMobiles = await User.aggregate([
      {
        $match: {
          mobileNumber: { $exists: true, $ne: null, $ne: '' },
          role: { $in: ['coordinator', 'wardAdmin'] }
        }
      },
      {
        $group: {
          _id: '$mobileNumber',
          count: { $sum: 1 },
          users: { $push: { id: '$_id', name: '$name', role: '$role' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    if (duplicateMobiles.length > 0) {
      console.log('⚠️  Found duplicate mobile numbers:');
      for (const duplicate of duplicateMobiles) {
        console.log(`   Mobile: ${duplicate._id}`);
        duplicate.users.forEach((user, index) => {
          console.log(`     ${index + 1}. ${user.name} (${user.role}) - ID: ${user.id}`);
        });
      }
      console.log('Please manually resolve these duplicates before proceeding.');
    } else {
      console.log('✅ No duplicate mobile numbers found');
    }

    // 4. Fix any duplicate emails
    console.log('Checking for duplicate emails...');
    const duplicateEmails = await User.aggregate([
      {
        $match: {
          email: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$email',
          count: { $sum: 1 },
          users: { $push: { id: '$_id', name: '$name', role: '$role' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    if (duplicateEmails.length > 0) {
      console.log('⚠️  Found duplicate emails:');
      for (const duplicate of duplicateEmails) {
        console.log(`   Email: ${duplicate._id}`);
        duplicate.users.forEach((user, index) => {
          console.log(`     ${index + 1}. ${user.name} (${user.role}) - ID: ${user.id}`);
        });
      }
      console.log('Please manually resolve these duplicates before proceeding.');
    } else {
      console.log('✅ No duplicate emails found');
    }

    // 5. Validate user data integrity
    console.log('Validating user data integrity...');
    
    const invalidUsers = await User.find({
      $or: [
        // State admin without email
        { role: 'stateAdmin', email: { $in: [null, ''] } },
        // State admin without password
        { role: 'stateAdmin', password: { $in: [null, ''] } },
        // Coordinator/Ward Incharge without mobile number
        { 
          role: { $in: ['coordinator', 'wardAdmin'] }, 
          mobileNumber: { $in: [null, ''] } 
        }
      ]
    });

    if (invalidUsers.length > 0) {
      console.log('⚠️  Found users with invalid data:');
      invalidUsers.forEach(user => {
        console.log(`   ${user.name} (${user.role}) - ID: ${user._id}`);
        if (user.role === 'stateAdmin' && !user.email) {
          console.log('     Missing email');
        }
        if (user.role === 'stateAdmin' && !user.password) {
          console.log('     Missing password');
        }
        if (['coordinator', 'wardAdmin'].includes(user.role) && !user.mobileNumber) {
          console.log('     Missing mobile number');
        }
      });
    } else {
      console.log('✅ All users have valid data');
    }

    // 6. Show current user statistics
    console.log('\n📊 User Statistics:');
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    userStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} users`);
    });

    const totalUsers = await User.countDocuments();
    console.log(`   Total: ${totalUsers} users`);

    console.log('\n✅ User index fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing user indexes:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
fixUserIndexes();