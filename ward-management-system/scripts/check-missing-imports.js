#!/usr/bin/env node

/**
 * Script to check for any missing imports in pages
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

// Common components that might be used without imports
const COMMON_COMPONENTS = [
  { name: 'Layout', importPath: 'Layout' },
  { name: 'Card', importPath: 'Card' },
  { name: 'Button', importPath: 'Button' },
  { name: 'Modal', importPath: 'Modal' },
  { name: 'Head', importPath: 'Head', from: 'next/head' }
];

function checkMissingImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(PAGES_DIR, filePath);
    
    let hasIssues = false;
    
    COMMON_COMPONENTS.forEach(component => {
      const componentRegex = new RegExp(`<${component.name}[\\s>]`, 'g');
      const importRegex = new RegExp(`import.*${component.name}.*from`, 'g');
      
      if (componentRegex.test(content) && !importRegex.test(content)) {
        if (!hasIssues) {
          console.log(`❌ Missing imports in ${relativePath}:`);
          hasIssues = true;
        }
        console.log(`  - Missing: ${component.name}`);
      }
    });
    
    return hasIssues;
  } catch (error) {
    console.error(`Error checking ${filePath}:`, error.message);
    return false;
  }
}

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

function main() {
  console.log('🔍 Checking for missing imports...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  let filesWithIssues = 0;
  
  jsFiles.forEach(file => {
    if (checkMissingImports(file)) {
      filesWithIssues++;
      console.log('');
    }
  });
  
  if (filesWithIssues === 0) {
    console.log('✅ No missing imports found!');
  } else {
    console.log(`❌ Found missing imports in ${filesWithIssues} file(s)`);
  }
  
  console.log(`\nChecked ${jsFiles.length} files total.`);
}

if (require.main === module) {
  main();
}

module.exports = { checkMissingImports, getAllJSFiles };