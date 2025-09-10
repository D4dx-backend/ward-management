#!/usr/bin/env node

/**
 * Database Optimization Script
 * 
 * This script creates indexes to improve query performance,
 * especially for the wards collection which is causing timeouts.
 * 
 * Run this script in production to optimize database performance:
 * node scripts/optimize-database.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function optimizeDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Optimize Wards collection
    console.log('\n📊 Optimizing Wards collection...');
    
    const wardsCollection = db.collection('wards');
    
    // Create compound indexes for common queries
    const wardIndexes = [
      // For filtering by district and panchayath
      { district: 1, panchayath: 1, isActive: 1 },
      // For ward admin queries
      { wardAdmin: 1, isActive: 1 },
      // For coordinator queries
      { coordinator: 1, isActive: 1 },
      // For sorting and general queries
      { district: 1, name: 1, isActive: 1 },
      // For unique constraints
      { name: 1, district: 1, isActive: 1 },
      { wardNumber: 1, panchayath: 1, district: 1, isActive: 1 }
    ];

    for (const index of wardIndexes) {
      try {
        await wardsCollection.createIndex(index);
        console.log(`✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`❌ Failed to create index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    // Optimize Clusters collection
    console.log('\n📊 Optimizing Clusters collection...');
    
    const clustersCollection = db.collection('clusters');
    
    const clusterIndexes = [
      // For filtering by ward
      { 'ward': 1, isActive: 1 },
      // For searching by name and number
      { name: 1, isActive: 1 },
      { clusterNumber: 1, isActive: 1 },
      // For coordinator queries
      { 'coordinator.name': 1, isActive: 1 },
      // For sorting
      { name: 1, clusterNumber: 1 }
    ];

    for (const index of clusterIndexes) {
      try {
        await clustersCollection.createIndex(index);
        console.log(`✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`❌ Failed to create index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    // Optimize Users collection
    console.log('\n📊 Optimizing Users collection...');
    
    const usersCollection = db.collection('users');
    
    const userIndexes = [
      // For authentication
      { email: 1 },
      { mobileNumber: 1 },
      // For role-based queries
      { role: 1, isActive: 1 },
      // For district-based queries
      { district: 1, role: 1 }
    ];

    for (const index of userIndexes) {
      try {
        await usersCollection.createIndex(index);
        console.log(`✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`❌ Failed to create index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    // Show collection stats
    console.log('\n📈 Collection Statistics:');
    
    const collections = ['wards', 'clusters', 'users'];
    for (const collectionName of collections) {
      try {
        const stats = await db.collection(collectionName).stats();
        console.log(`\n${collectionName.toUpperCase()}:`);
        console.log(`  Documents: ${stats.count.toLocaleString()}`);
        console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Indexes: ${stats.nindexes}`);
        console.log(`  Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.log(`  ${collectionName}: Collection not found or error getting stats`);
      }
    }

    console.log('\n🎉 Database optimization completed successfully!');
    console.log('\n💡 Tips for better performance:');
    console.log('  - Monitor slow queries in production');
    console.log('  - Consider pagination for large datasets');
    console.log('  - Use projection to limit returned fields');
    console.log('  - Implement caching for frequently accessed data');

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the optimization
if (require.main === module) {
  optimizeDatabase().catch(console.error);
}

module.exports = { optimizeDatabase };