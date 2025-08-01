#!/usr/bin/env node

/**
 * Script to fix all remaining import path issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

// Function to fix imports based on file depth
function fixFileImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if no shimmer/useApiData imports
    if (!content.includes('Shimmer') && !content.includes('useApiData')) {
      return;
    }

    const relativePath = path.relative(PAGES_DIR, filePath);
    const depth = relativePath.split('/').length - 1;
    
    let correctComponentsPath, correctHooksPath;
    
    if (depth === 0) {
      // Root level
      correctComponentsPath = './components/Shimmer';
      correctHooksPath = './hooks/useApiData';
    } else if (depth === 1) {
      // One level deep
      correctComponentsPath = '../components/Shimmer';
      correctHooksPath = '../hooks/useApiData';
    } else if (depth === 2) {
      // Two levels deep
      correctComponentsPath = '../../components/Shimmer';
      correctHooksPath = '../../hooks/useApiData';
    } else if (depth === 3) {
      // Three levels deep
      correctComponentsPath = '../../../components/Shimmer';
      correctHooksPath = '../../../hooks/useApiData';
    } else {
      // Deeper nesting
      const dotsPath = '../'.repeat(depth);
      correctComponentsPath = `${dotsPath}components/Shimmer`;
      correctHooksPath = `${dotsPath}hooks/useApiData`;
    }

    // Fix all possible incorrect Shimmer import patterns
    const shimmerPatterns = [
      /import\s+{[^}]*}\s+from\s+['"]\.\.\/components\/Shimmer['"];?/g,
      /import\s+{[^}]*}\s+from\s+['"]\.\/components\/Shimmer['"];?/g,
      /import\s+{[^}]*}\s+from\s+['"]\.\.\/\.\.\/\.\.\/components\/Shimmer['"];?/g,
      /import\s+{[^}]*}\s+from\s+['"]\.\.\/\.\.\/components\/Shimmer['"];?/g
    ];

    shimmerPatterns.forEach(pattern => {
      content = content.replace(pattern, 
        `import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '${correctComponentsPath}';`
      );
    });

    // Fix all possible incorrect useApiData import patterns
    const hookPatterns = [
      /import\s+{[^}]*}\s+from\s+['"]\.\.\/hooks\/useApiData['"];?/g,
      /import\s+{[^}]*}\s+from\s+['"]\.\/hooks\/useApiData['"];?/g,
      /import\s+{[^}]*}\s+from\s+['"]\.\.\/\.\.\/\.\.\/hooks\/useApiData['"];?/g,
      /import\s+{[^}]*}\s+from\s+['"]\.\.\/\.\.\/hooks\/useApiData['"];?/g
    ];

    hookPatterns.forEach(pattern => {
      content = content.replace(pattern, 
        `import { useApiData } from '${correctHooksPath}';`
      );
    });

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Fixed: ${relativePath}`);
    }

  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
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
  console.log('🔧 Fixing all remaining import path issues...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  console.log(`Found ${jsFiles.length} JavaScript files to process\n`);
  
  jsFiles.forEach(fixFileImports);
  
  console.log('\n✅ All import path fixes complete!');
  
  // Verify no more incorrect imports remain
  console.log('\n🔍 Verifying fixes...');
  try {
    const shimmerCheck = execSync('grep -r "from.*components/Shimmer" ward-management/ward-management-system/pages/ || true', { encoding: 'utf8' });
    const hooksCheck = execSync('grep -r "from.*hooks/useApiData" ward-management/ward-management-system/pages/ || true', { encoding: 'utf8' });
    
    if (shimmerCheck.trim()) {
      console.log('⚠️  Remaining Shimmer imports to check:');
      console.log(shimmerCheck);
    } else {
      console.log('✅ All Shimmer imports look correct');
    }
    
    if (hooksCheck.trim()) {
      console.log('⚠️  Remaining useApiData imports to check:');
      console.log(hooksCheck);
    } else {
      console.log('✅ All useApiData imports look correct');
    }
  } catch (error) {
    console.log('Could not verify - please check manually');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFileImports, getAllJSFiles };