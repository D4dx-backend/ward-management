#!/usr/bin/env node

/**
 * Database Verification Script
 * Shows current data counts in all collections
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Import all models
import User from './models/User.js';
import Ward from './models/Ward.js';
import Cluster from './models/Cluster.js';
import ClusterVisit from './models/ClusterVisit.js';
import WardVisit from './models/WardVisit.js';
import WardBasicData from './models/WardBasicData.js';
import WardBasicForm from './models/WardBasicForm.js';
import WardDynamicData from './models/WardDynamicData.js';
import FormTemplate from './models/FormTemplate.js';
import Response from './models/Response.js';
import RecurringQuestion from './models/RecurringQuestion.js';
import RecurringQuestionResponse from './models/RecurringQuestionResponse.js';
import DockerSurvey from './models/DockerSurvey.js';
import Document from './models/Document.js';
import Instruction from './models/Instruction.js';
import ActivityLog from './models/ActivityLog.js';
import Log from './models/Log.js';
import LoginHistory from './models/LoginHistory.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not defined');
  process.exit(1);
}

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      maxIdleTimeMS: 30000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

async function verifyDatabase() {
  try {
    console.log('🔍 Database Verification Report\n');
    console.log('=' .repeat(50));

    const models = [
      { model: User, name: 'Users' },
      { model: Ward, name: 'Wards' },
      { model: Cluster, name: 'Clusters' },
      { model: ClusterVisit, name: 'Cluster Visits' },
      { model: WardVisit, name: 'Ward Visits' },
      { model: WardBasicData, name: 'Ward Basic Data' },
      { model: WardBasicForm, name: 'Ward Basic Forms' },
      { model: WardDynamicData, name: 'Ward Dynamic Data' },
      { model: FormTemplate, name: 'Form Templates' },
      { model: Response, name: 'Responses' },
      { model: RecurringQuestion, name: 'Recurring Questions' },
      { model: RecurringQuestionResponse, name: 'Recurring Question Responses' },
      { model: DockerSurvey, name: 'Docker Surveys' },
      { model: Document, name: 'Documents' },
      { model: Instruction, name: 'Instructions' },
      { model: ActivityLog, name: 'Activity Logs' },
      { model: Log, name: 'Logs' },
      { model: LoginHistory, name: 'Login History' }
    ];

    let totalRecords = 0;

    for (const { model, name } of models) {
      try {
        const count = await model.countDocuments();
        console.log(`📊 ${name.padEnd(30)}: ${count.toString().padStart(6)} records`);
        totalRecords += count;
      } catch (error) {
        console.error(`❌ Error counting ${name}:`, error.message);
      }
    }

    console.log('=' .repeat(50));
    console.log(`📈 Total Records: ${totalRecords}`);

    // Show admin users specifically
    console.log('\n👤 Admin Users:');
    const adminUsers = await User.find({ role: 'stateAdmin' }, 'name email role');
    if (adminUsers.length > 0) {
      adminUsers.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.name} (${admin.email}) - ${admin.role}`);
      });
    } else {
      console.log('   No admin users found');
    }

    // Show user breakdown by role
    console.log('\n👥 User Breakdown by Role:');
    const userRoles = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    if (userRoles.length > 0) {
      userRoles.forEach(role => {
        console.log(`   ${role._id}: ${role.count} users`);
      });
    } else {
      console.log('   No users found');
    }

  } catch (error) {
    console.error('❌ Error during database verification:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectToDatabase();
    await verifyDatabase();
    console.log('\n✅ Database verification completed!');
  } catch (error) {
    console.error('\n💥 Database verification failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
main();