#!/usr/bin/env node

/**
 * Final comprehensive fix for all import paths based on actual directory structure
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

// Mapping of directory patterns to correct import paths
const IMPORT_PATH_MAP = {
  // Root level pages (pages/*.js)
  '^[^/]+\\.js$': {
    shimmer: '../components/Shimmer',
    hooks: '../hooks/useApiData'
  },
  // One level deep (pages/admin/*.js, pages/coordinator/*.js, etc.)
  '^[^/]+/[^/]+\\.js$': {
    shimmer: '../../components/Shimmer',
    hooks: '../../hooks/useApiData'
  },
  // Two levels deep (pages/admin/users/*.js, etc.)
  '^[^/]+/[^/]+/[^/]+\\.js$': {
    shimmer: '../../../components/Shimmer',
    hooks: '../../../hooks/useApiData'
  },
  // Three levels deep (pages/admin/users/edit/*.js, etc.)
  '^[^/]+/[^/]+/[^/]+/[^/]+\\.js$': {
    shimmer: '../../../../components/Shimmer',
    hooks: '../../../../hooks/useApiData'
  }
};

function getCorrectPaths(relativePath) {
  for (const [pattern, paths] of Object.entries(IMPORT_PATH_MAP)) {
    if (new RegExp(pattern).test(relativePath)) {
      return paths;
    }
  }
  
  // Fallback for deeper nesting
  const depth = relativePath.split('/').length - 1;
  const dotsPath = '../'.repeat(depth + 1);
  return {
    shimmer: `${dotsPath}components/Shimmer`,
    hooks: `${dotsPath}hooks/useApiData`
  };
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if no shimmer/useApiData imports
    if (!content.includes('Shimmer') && !content.includes('useApiData')) {
      return;
    }

    const relativePath = path.relative(PAGES_DIR, filePath);
    const correctPaths = getCorrectPaths(relativePath);
    
    console.log(`Fixing: ${relativePath}`);
    console.log(`  Expected Shimmer: ${correctPaths.shimmer}`);
    console.log(`  Expected Hooks: ${correctPaths.hooks}`);

    // Fix Shimmer imports - match any existing import and replace with correct path
    const shimmerRegex = /import\s+{[^}]*}\s+from\s+['"][^'"]*components\/Shimmer['"];?/g;
    const shimmerMatches = content.match(shimmerRegex);
    if (shimmerMatches) {
      content = content.replace(shimmerRegex, 
        `import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '${correctPaths.shimmer}';`
      );
      console.log(`  ✓ Fixed Shimmer import`);
    }

    // Fix useApiData imports - match any existing import and replace with correct path
    const hooksRegex = /import\s+{[^}]*}\s+from\s+['"][^'"]*hooks\/useApiData['"];?/g;
    const hooksMatches = content.match(hooksRegex);
    if (hooksMatches) {
      content = content.replace(hooksRegex, 
        `import { useApiData } from '${correctPaths.hooks}';`
      );
      console.log(`  ✓ Fixed useApiData import`);
    }

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ File updated`);
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
  console.log('🔧 Final comprehensive import path fix...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  console.log(`Processing ${jsFiles.length} JavaScript files\n`);
  
  jsFiles.forEach(fixFile);
  
  console.log('\n✅ Final comprehensive fix complete!');
  
  // Quick verification
  console.log('\n🔍 Quick verification...');
  try {
    const { execSync } = require('child_process');
    
    // Check for any remaining problematic patterns
    const badPatterns = [
      'from.*"\\./components/Shimmer"',
      'from.*"\\./hooks/useApiData"',
      'from.*"\\.\\.\\./components/Shimmer".*pages/admin/[^/]*\\.js',
      'from.*"\\.\\.\\./hooks/useApiData".*pages/admin/[^/]*\\.js'
    ];
    
    let foundIssues = false;
    badPatterns.forEach(pattern => {
      try {
        const result = execSync(`grep -r "${pattern}" ward-management/ward-management-system/pages/ || true`, { encoding: 'utf8' });
        if (result.trim()) {
          console.log(`❌ Found remaining issues with pattern: ${pattern}`);
          console.log(result.trim().split('\n').slice(0, 3).join('\n'));
          foundIssues = true;
        }
      } catch (e) {
        // Ignore grep errors
      }
    });
    
    if (!foundIssues) {
      console.log('✅ No obvious import path issues found');
    }
    
  } catch (error) {
    console.log('Could not run verification - please check manually');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, getAllJSFiles };