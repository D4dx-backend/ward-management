#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Clear Next.js cache
const nextCacheDir = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextCacheDir)) {
  fs.rmSync(nextCacheDir, { recursive: true, force: true });
  console.log('✅ Next.js cache cleared');
}

// Clear node_modules/.cache if it exists
const nodeModulesCacheDir = path.join(__dirname, '..', 'node_modules', '.cache');
if (fs.existsSync(nodeModulesCacheDir)) {
  fs.rmSync(nodeModulesCacheDir, { recursive: true, force: true });
  console.log('✅ Node modules cache cleared');
}

console.log('🎉 All caches cleared successfully!');