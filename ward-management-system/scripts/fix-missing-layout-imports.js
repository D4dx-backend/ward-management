#!/usr/bin/env node

/**
 * Script to fix missing Layout imports in pages that use <Layout>
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

function fixMissingLayoutImport(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if file doesn't use Layout component
    if (!content.includes('<Layout>') && !content.includes('<Layout ')) {
      return false;
    }
    
    // Skip if Layout is already imported
    if (content.includes("import Layout from") || content.includes("import { Layout }")) {
      return false;
    }
    
    const relativePath = path.relative(PAGES_DIR, filePath);
    console.log(`Fixing: ${relativePath}`);
    
    // Determine correct import path based on file depth
    const depth = relativePath.split('/').length - 1;
    let layoutImportPath;
    
    if (depth === 0) {
      layoutImportPath = '../components/Layout';
    } else if (depth === 1) {
      layoutImportPath = '../../components/Layout';
    } else if (depth === 2) {
      layoutImportPath = '../../../components/Layout';
    } else {
      const dotsPath = '../'.repeat(depth + 1);
      layoutImportPath = `${dotsPath}components/Layout`;
    }
    
    // Find the last import statement to add Layout import after it
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') && lines[i].includes('from ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex !== -1) {
      // Insert Layout import after the last import
      lines.splice(lastImportIndex + 1, 0, `import Layout from '${layoutImportPath}';`);
      content = lines.join('\n');
      console.log(`  ✓ Added Layout import: ${layoutImportPath}`);
    } else {
      // If no imports found, add at the beginning
      content = `import Layout from '${layoutImportPath}';\n${content}`;
      console.log(`  ✓ Added Layout import at beginning: ${layoutImportPath}`);
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
  console.log('🔧 Fixing missing Layout imports...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  let fixedFiles = 0;
  
  jsFiles.forEach(file => {
    if (fixMissingLayoutImport(file)) {
      fixedFiles++;
    }
  });
  
  console.log(`\n✅ Fixed ${fixedFiles} files with missing Layout imports`);
  console.log(`Checked ${jsFiles.length} files total.`);
}

if (require.main === module) {
  main();
}

module.exports = { fixMissingLayoutImport, getAllJSFiles };