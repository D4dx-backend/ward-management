#!/usr/bin/env node

/**
 * Comprehensive script to fix all loading variable issues
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

function fixLoadingVariables(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if file doesn't have loading checks
    if (!content.includes('if (loading)') && !content.includes('if(loading)')) {
      return false;
    }
    
    const relativePath = path.relative(PAGES_DIR, filePath);
    console.log(`Checking: ${relativePath}`);
    
    let hasChanges = false;
    
    // Check what loading variables are defined in the file
    const hasIsLoading = content.includes('[isLoading,') || content.includes('isLoading:') || content.includes('const isLoading');
    const hasLoadingFromHook = content.includes('loading,') || content.includes('loading:') || content.includes('= useApiData(') || content.includes('= useDashboardData(');
    const hasStatusLoading = content.includes('useSession()') || content.includes('status');
    
    // Determine what to replace 'loading' with
    let replacement;
    if (hasIsLoading) {
      replacement = 'isLoading';
      console.log(`  → Using isLoading variable`);
    } else if (hasLoadingFromHook) {
      replacement = 'loading';
      console.log(`  → Loading variable from hook is properly defined`);
      return false; // No change needed
    } else if (hasStatusLoading) {
      replacement = "status === 'loading'";
      console.log(`  → Using session status loading`);
    } else {
      console.log(`  → No suitable loading variable found, using session status`);
      replacement = "status === 'loading'";
    }
    
    // Replace if (loading) with the appropriate variable
    const loadingCheckRegex = /if\s*\(\s*loading\s*\)/g;
    if (loadingCheckRegex.test(content)) {
      content = content.replace(loadingCheckRegex, `if (${replacement})`);
      hasChanges = true;
      console.log(`  ✓ Fixed loading check: if (${replacement})`);
    }
    
    // Write back if changed
    if (hasChanges && content !== originalContent) {
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
  console.log('🔧 Fixing all loading variable issues...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  let fixedFiles = 0;
  
  jsFiles.forEach(file => {
    if (fixLoadingVariables(file)) {
      fixedFiles++;
    }
  });
  
  console.log(`\n✅ Fixed ${fixedFiles} files with loading variable issues`);
  console.log(`Checked ${jsFiles.length} files total.`);
}

if (require.main === module) {
  main();
}

module.exports = { fixLoadingVariables, getAllJSFiles };