#!/usr/bin/env node

/**
 * Selective Database Cleanup Script
 * Allows clearing specific model data while preserving others
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

// Available models for clearing
const AVAILABLE_MODELS = {
  'users': { model: User, name: 'Users (non-admin)', filter: { role: { $ne: 'stateAdmin' } } },
  'all-users': { model: User, name: 'All Users' },
  'wards': { model: Ward, name: 'Wards' },
  'clusters': { model: Cluster, name: 'Clusters' },
  'cluster-visits': { model: ClusterVisit, name: 'Cluster Visits' },
  'ward-visits': { model: WardVisit, name: 'Ward Visits' },
  'ward-basic-data': { model: WardBasicData, name: 'Ward Basic Data' },
  'ward-basic-forms': { model: WardBasicForm, name: 'Ward Basic Forms' },
  'ward-dynamic-data': { model: WardDynamicData, name: 'Ward Dynamic Data' },
  'form-templates': { model: FormTemplate, name: 'Form Templates' },
  'responses': { model: Response, name: 'Responses' },
  'recurring-questions': { model: RecurringQuestion, name: 'Recurring Questions' },
  'recurring-responses': { model: RecurringQuestionResponse, name: 'Recurring Question Responses' },
  'docker-surveys': { model: DockerSurvey, name: 'Docker Surveys' },
  'documents': { model: Document, name: 'Documents' },
  'instructions': { model: Instruction, name: 'Instructions' },
  'activity-logs': { model: ActivityLog, name: 'Activity Logs' },
  'logs': { model: Log, name: 'Logs' },
  'login-history': { model: LoginHistory, name: 'Login History' }
};

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

function showUsage() {
  console.log('📖 Usage: node clear-specific-data.js [model1] [model2] ...\n');
  console.log('Available models:');
  Object.keys(AVAILABLE_MODELS).forEach(key => {
    console.log(`  - ${key}: ${AVAILABLE_MODELS[key].name}`);
  });
  console.log('\n💡 Examples:');
  console.log('  node clear-specific-data.js users wards');
  console.log('  node clear-specific-data.js activity-logs login-history');
  console.log('  node clear-specific-data.js form-templates responses');
}

async function clearSpecificData(modelKeys) {
  try {
    console.log('🧹 Starting selective database cleanup...\n');

    let totalDeleted = 0;

    for (const key of modelKeys) {
      if (!AVAILABLE_MODELS[key]) {
        console.warn(`⚠️  Unknown model: ${key} - skipping`);
        continue;
      }

      const operation = AVAILABLE_MODELS[key];
      
      try {
        const filter = operation.filter || {};
        const result = await operation.model.deleteMany(filter);
        console.log(`🗑️  ${operation.name}: ${result.deletedCount} records deleted`);
        totalDeleted += result.deletedCount;
      } catch (error) {
        console.error(`❌ Error clearing ${operation.name}:`, error.message);
      }
    }

    console.log(`\n✅ Selective cleanup completed!`);
    console.log(`📊 Total records deleted: ${totalDeleted}`);

  } catch (error) {
    console.error('❌ Error during selective cleanup:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showUsage();
    process.exit(0);
  }

  try {
    await connectToDatabase();
    await clearSpecificData(args);
    console.log('\n🎉 Selective cleanup completed successfully!');
  } catch (error) {
    console.error('\n💥 Selective cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
main();