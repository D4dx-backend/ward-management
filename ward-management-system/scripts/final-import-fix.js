#!/usr/bin/env node

/**
 * Final comprehensive script to fix all import path issues
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

// List of files that need specific fixes based on build errors
const PROBLEMATIC_FILES = [
  'admin/cluster-visits.js',
  'admin/clusters/index.js', 
  'admin/debug-whatsapp.js'
];

// Function to fix imports based on exact file path
function fixSpecificFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    const relativePath = path.relative(PAGES_DIR, filePath);
    console.log(`Fixing: ${relativePath}`);

    // Calculate correct depth
    const depth = relativePath.split('/').length - 1;
    let correctComponentsPath, correctHooksPath;
    
    if (depth === 0) {
      correctComponentsPath = './components/Shimmer';
      correctHooksPath = './hooks/useApiData';
    } else if (depth === 1) {
      correctComponentsPath = '../components/Shimmer';
      correctHooksPath = '../hooks/useApiData';
    } else if (depth === 2) {
      correctComponentsPath = '../../components/Shimmer';
      correctHooksPath = '../../hooks/useApiData';
    } else if (depth === 3) {
      correctComponentsPath = '../../../components/Shimmer';
      correctHooksPath = '../../../hooks/useApiData';
    } else {
      const dotsPath = '../'.repeat(depth);
      correctComponentsPath = `${dotsPath}components/Shimmer`;
      correctHooksPath = `${dotsPath}hooks/useApiData`;
    }

    // Fix any incorrect Shimmer imports
    const shimmerRegex = /import\s+{[^}]*}\s+from\s+['"][^'"]*components\/Shimmer['"];?/g;
    content = content.replace(shimmerRegex, 
      `import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '${correctComponentsPath}';`
    );

    // Fix any incorrect useApiData imports
    const hooksRegex = /import\s+{[^}]*}\s+from\s+['"][^'"]*hooks\/useApiData['"];?/g;
    content = content.replace(hooksRegex, 
      `import { useApiData } from '${correctHooksPath}';`
    );

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`  ✓ Fixed imports`);
    } else {
      console.log(`  → Already correct`);
    }

  } catch (error) {
    console.error(`  ✗ Error fixing ${filePath}:`, error.message);
  }
}

// Get all JS files recursively
function getAllJSFiles(dir) {
  let files = [];
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'api') {
      files = files.concat(getAllJSFiles(fullPath));
    } else if (item.endsWith('.js') && !item.startsWith('_')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main execution
function main() {
  console.log('🔧 Final import path fixes...\n');
  
  // Fix all files
  const jsFiles = getAllJSFiles(PAGES_DIR);
  console.log(`Processing ${jsFiles.length} JavaScript files\n`);
  
  jsFiles.forEach(fixSpecificFile);
  
  console.log('\n✅ Final import fixes complete!');
}

if (require.main === module) {
  main();
}

module.exports = { fixSpecificFile, getAllJSFiles };