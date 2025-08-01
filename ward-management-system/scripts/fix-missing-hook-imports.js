#!/usr/bin/env node

/**
 * Script to fix missing hook imports from useApiData
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

// Hooks that might be used from useApiData
const API_HOOKS = [
  'useApiData',
  'useDashboardData',
  'useApiMutation'
];

function fixMissingHookImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    const relativePath = path.relative(PAGES_DIR, filePath);
    let hasChanges = false;
    let missingHooks = [];
    
    // Check which hooks are used but not imported
    API_HOOKS.forEach(hook => {
      const hookUsageRegex = new RegExp(`\\b${hook}\\s*\\(`, 'g');
      const hookImportRegex = new RegExp(`import.*${hook}.*from.*useApiData`, 'g');
      
      if (hookUsageRegex.test(content) && !hookImportRegex.test(content)) {
        missingHooks.push(hook);
      }
    });
    
    if (missingHooks.length === 0) {
      return false;
    }
    
    console.log(`Fixing: ${relativePath}`);
    console.log(`  Missing hooks: ${missingHooks.join(', ')}`);
    
    // Find existing useApiData import to update it
    const useApiDataImportRegex = /import\s*{\s*([^}]*)\s*}\s*from\s*['"][^'"]*hooks\/useApiData['"];?/;
    const match = content.match(useApiDataImportRegex);
    
    if (match) {
      // Update existing import
      const existingImports = match[1].split(',').map(imp => imp.trim()).filter(imp => imp);
      const allImports = [...new Set([...existingImports, ...missingHooks])];
      const newImportStatement = `import { ${allImports.join(', ')} } from '${getCorrectHookPath(relativePath)}';`;
      
      content = content.replace(useApiDataImportRegex, newImportStatement);
      hasChanges = true;
      console.log(`  ✓ Updated existing import: { ${allImports.join(', ')} }`);
    } else {
      // Add new import
      const hookPath = getCorrectHookPath(relativePath);
      const newImportStatement = `import { ${missingHooks.join(', ')} } from '${hookPath}';`;
      
      // Find the last import statement to add after it
      const lines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') && lines[i].includes('from ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, newImportStatement);
        content = lines.join('\n');
        hasChanges = true;
        console.log(`  ✓ Added new import: { ${missingHooks.join(', ')} }`);
      }
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

function getCorrectHookPath(relativePath) {
  const depth = relativePath.split('/').length - 1;
  
  if (depth === 0) {
    return '../hooks/useApiData';
  } else if (depth === 1) {
    return '../../hooks/useApiData';
  } else if (depth === 2) {
    return '../../../hooks/useApiData';
  } else {
    const dotsPath = '../'.repeat(depth + 1);
    return `${dotsPath}hooks/useApiData`;
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
  console.log('🔧 Fixing missing hook imports...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  let fixedFiles = 0;
  
  jsFiles.forEach(file => {
    if (fixMissingHookImports(file)) {
      fixedFiles++;
    }
  });
  
  console.log(`\n✅ Fixed ${fixedFiles} files with missing hook imports`);
  console.log(`Checked ${jsFiles.length} files total.`);
}

if (require.main === module) {
  main();
}

module.exports = { fixMissingHookImports, getAllJSFiles };