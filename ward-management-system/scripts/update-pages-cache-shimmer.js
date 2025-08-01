#!/usr/bin/env node

/**
 * Script to update all pages with cache and shimmer loading
 * This script will add the necessary imports and replace loading states
 */

const fs = require('fs');
const path = require('path');

// Pages directory
const PAGES_DIR = path.join(__dirname, '../pages');

// Common imports to add
const CACHE_IMPORTS = `
import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../components/Shimmer';
import { useApiData } from '../hooks/useApiData';
`.trim();

// Function to get all JS files recursively
function getAllJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'api') {
      getAllJSFiles(filePath, fileList);
    } else if (file.endsWith('.js') && !file.startsWith('_')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to update a single file
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Skip if already has shimmer imports
    if (content.includes('Shimmer') || content.includes('useApiData')) {
      console.log(`Skipping ${filePath} - already updated`);
      return;
    }
    
    // Skip API files and special files
    if (filePath.includes('/api/') || filePath.includes('_app.js') || filePath.includes('_document.js')) {
      return;
    }
    
    // Add imports after existing imports
    const importRegex = /import.*from.*['"];?\s*$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
      
      // Add cache and shimmer imports
      content = content.slice(0, lastImportIndex) + '\n' + CACHE_IMPORTS + '\n' + content.slice(lastImportIndex);
      modified = true;
    }
    
    // Replace common loading patterns
    const loadingPatterns = [
      {
        // Replace spinner loading with shimmer
        pattern: /return \(\s*<div className="min-h-screen flex items-center justify-center[^>]*>\s*<div className="animate-spin[^>]*><\/div>\s*<\/div>\s*\);/g,
        replacement: `return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );`
      },
      {
        // Replace isLoading state checks
        pattern: /if \(.*isLoading.*\) \{[\s\S]*?return[\s\S]*?;\s*\}/g,
        replacement: `if (loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }`
      }
    ];
    
    loadingPatterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });
    
    // Add useApiData hook for data fetching
    if (content.includes('axios.get') && !content.includes('useApiData')) {
      // This is a more complex transformation, we'll handle it case by case
      console.log(`${filePath} - needs manual API data hook integration`);
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${filePath}`);
    }
    
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
}

// Main execution
function main() {
  console.log('Starting cache and shimmer loading updates...');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  console.log(`Found ${jsFiles.length} JS files to process`);
  
  jsFiles.forEach(updateFile);
  
  console.log('Update complete!');
}

if (require.main === module) {
  main();
}

module.exports = { updateFile, getAllJSFiles };