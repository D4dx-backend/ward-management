#!/usr/bin/env node

/**
 * Script to check for duplicate imports across all files
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

function checkDuplicateImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const imports = [];
    let hasDuplicates = false;
    
    // Extract all import statements
    lines.forEach((line, index) => {
      if (line.trim().startsWith('import ') && line.includes('from ')) {
        const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          const importPath = importMatch[1];
          const existingImport = imports.find(imp => imp.path === importPath);
          
          if (existingImport) {
            console.log(`❌ Duplicate import found in ${path.relative(PAGES_DIR, filePath)}:`);
            console.log(`  Line ${existingImport.line + 1}: ${existingImport.statement}`);
            console.log(`  Line ${index + 1}: ${line.trim()}`);
            console.log('');
            hasDuplicates = true;
          } else {
            imports.push({
              path: importPath,
              line: index,
              statement: line.trim()
            });
          }
        }
      }
    });
    
    return hasDuplicates;
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
  console.log('🔍 Checking for duplicate imports...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  let totalDuplicates = 0;
  
  jsFiles.forEach(file => {
    if (checkDuplicateImports(file)) {
      totalDuplicates++;
    }
  });
  
  if (totalDuplicates === 0) {
    console.log('✅ No duplicate imports found!');
  } else {
    console.log(`❌ Found duplicate imports in ${totalDuplicates} file(s)`);
  }
  
  console.log(`\nChecked ${jsFiles.length} files total.`);
}

if (require.main === module) {
  main();
}

module.exports = { checkDuplicateImports, getAllJSFiles };