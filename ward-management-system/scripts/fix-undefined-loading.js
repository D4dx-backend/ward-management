#!/usr/bin/env node

/**
 * Script to fix undefined 'loading' variables in pages
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

function fixLoadingVariable(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if file doesn't have the issue
    if (!content.includes('if (loading)') && !content.includes('if(loading)')) {
      return false;
    }
    
    const relativePath = path.relative(PAGES_DIR, filePath);
    console.log(`Checking: ${relativePath}`);
    
    // Check if the file has a proper loading variable defined
    const hasLoadingVariable = (
      content.includes('const [loading,') ||
      content.includes('const [isLoading,') ||
      content.includes('loading,') ||
      content.includes('loading:') ||
      content.includes('= useApiData(') ||
      content.includes('= useDashboardData(')
    );
    
    if (!hasLoadingVariable) {
      // This file uses 'loading' but doesn't define it
      // Replace with status === 'loading' for session loading
      content = content.replace(/if\s*\(\s*loading\s*\)/g, "if (status === 'loading')");
      console.log(`  ✓ Fixed undefined loading variable`);
    } else {
      console.log(`  → Loading variable properly defined`);
    }
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ File updated`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`  ✗ Error fixing ${filePath}:`, error.message);
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
  console.log('🔧 Fixing undefined loading variables...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  let fixedFiles = 0;
  
  jsFiles.forEach(file => {
    if (fixLoadingVariable(file)) {
      fixedFiles++;
    }
  });
  
  console.log(`\n✅ Fixed ${fixedFiles} files with undefined loading variables`);
  console.log(`Checked ${jsFiles.length} files total.`);
}

if (require.main === module) {
  main();
}

module.exports = { fixLoadingVariable, getAllJSFiles };