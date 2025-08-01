#!/usr/bin/env node

/**
 * Script to fix all incorrect import paths systematically
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

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

    // Fix all incorrect import patterns
    const fixes = [
      // Fix '../components/Shimmer' to correct path based on depth
      {
        pattern: /from\s+['"]\.\.\/components\/Shimmer['"];?/g,
        getReplacement: (filePath) => {
          const depth = path.relative(PAGES_DIR, filePath).split('/').length - 1;
          const dotsPath = '../'.repeat(depth);
          return `from '${dotsPath}components/Shimmer';`;
        }
      },
      // Fix '../hooks/useApiData' to correct path based on depth
      {
        pattern: /from\s+['"]\.\.\/hooks\/useApiData['"];?/g,
        getReplacement: (filePath) => {
          const depth = path.relative(PAGES_DIR, filePath).split('/').length - 1;
          const dotsPath = '../'.repeat(depth);
          return `from '${dotsPath}hooks/useApiData';`;
        }
      },
      // Fix './components/Shimmer' for root level files
      {
        pattern: /from\s+['"]\.\/components\/Shimmer['"];?/g,
        getReplacement: () => `from './components/Shimmer';`
      },
      // Fix './hooks/useApiData' for root level files
      {
        pattern: /from\s+['"]\.\/hooks\/useApiData['"];?/g,
        getReplacement: () => `from './hooks/useApiData';`
      }
    ];

    fixes.forEach(fix => {
      if (fix.pattern.test(content)) {
        const replacement = fix.getReplacement(filePath);
        content = content.replace(fix.pattern, replacement);
      }
    });

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
  console.log('🔧 Fixing all import paths...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  console.log(`Found ${jsFiles.length} JavaScript files to check\n`);
  
  jsFiles.forEach(fixImports);
  
  console.log('\n✅ All import path fixes complete!');
}

if (require.main === module) {
  main();
}

module.exports = { fixImports, getAllJSFiles };