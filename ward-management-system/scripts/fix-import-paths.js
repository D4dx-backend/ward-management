#!/usr/bin/env node

/**
 * Script to fix incorrect import paths for Shimmer and useApiData
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

// Function to calculate correct relative path
function getCorrectImportPath(filePath, targetDir) {
  const relativePath = path.relative(path.dirname(filePath), path.join(path.dirname(filePath), '../../..', targetDir));
  return relativePath.replace(/\\/g, '/'); // Normalize for cross-platform
}

// Function to fix imports in a file
function fixImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if no shimmer/useApiData imports
    if (!content.includes('Shimmer') && !content.includes('useApiData')) {
      return;
    }

    const relativePath = path.relative(PAGES_DIR, filePath);
    console.log(`Fixing: ${relativePath}`);

    // Determine the correct path depth
    const depth = relativePath.split('/').length - 1;
    let componentsPath, hooksPath;

    if (depth === 0) {
      // Root level (pages/index.js)
      componentsPath = './components/Shimmer';
      hooksPath = './hooks/useApiData';
    } else if (depth === 1) {
      // One level deep (pages/admin/index.js)
      componentsPath = '../components/Shimmer';
      hooksPath = '../hooks/useApiData';
    } else if (depth === 2) {
      // Two levels deep (pages/admin/users/index.js)
      componentsPath = '../../components/Shimmer';
      hooksPath = '../../hooks/useApiData';
    } else if (depth === 3) {
      // Three levels deep (pages/admin/users/edit/[id].js)
      componentsPath = '../../../components/Shimmer';
      hooksPath = '../../../hooks/useApiData';
    } else {
      // Fallback for deeper nesting
      const dotsPath = '../'.repeat(depth);
      componentsPath = `${dotsPath}components/Shimmer`;
      hooksPath = `${dotsPath}hooks/useApiData`;
    }

    // Fix Shimmer import
    content = content.replace(
      /import\s+{[^}]*}\s+from\s+['"][^'"]*components\/Shimmer['"];?/g,
      `import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '${componentsPath}';`
    );

    // Fix useApiData import
    content = content.replace(
      /import\s+{[^}]*}\s+from\s+['"][^'"]*hooks\/useApiData['"];?/g,
      `import { useApiData } from '${hooksPath}';`
    );

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`  ✓ Fixed imports`);
    } else {
      console.log(`  → No changes needed`);
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
  console.log('🔧 Fixing import paths for Shimmer and useApiData...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  console.log(`Found ${jsFiles.length} JavaScript files to check\n`);
  
  jsFiles.forEach(fixImports);
  
  console.log('\n✅ Import path fixes complete!');
}

if (require.main === module) {
  main();
}

module.exports = { fixImports, getAllJSFiles };