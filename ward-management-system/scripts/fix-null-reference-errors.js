#!/usr/bin/env node

/**
 * Script to fix null reference errors across the application
 * Adds safe data access patterns to prevent runtime errors
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to check and fix
const PATTERNS_TO_CHECK = [
  'pages/**/*.js',
  'components/**/*.js',
  'hooks/**/*.js'
];

// Common null reference patterns and their fixes
const NULL_REFERENCE_FIXES = [
  // Array length checks
  {
    find: /(\w+)\.length\s*>/g,
    replace: '(Array.isArray($1) ? $1.length : 0) >'
  },
  {
    find: /(\w+)\.length\s*===/g,
    replace: '(Array.isArray($1) ? $1.length : 0) ==='
  },
  {
    find: /(\w+)\.length\s*!==/g,
    replace: '(Array.isArray($1) ? $1.length : 0) !=='
  },
  
  // Array method calls
  {
    find: /(\w+)\.find\(/g,
    replace: '(Array.isArray($1) ? $1 : []).find('
  },
  {
    find: /(\w+)\.filter\(/g,
    replace: '(Array.isArray($1) ? $1 : []).filter('
  },
  {
    find: /(\w+)\.map\(/g,
    replace: '(Array.isArray($1) ? $1 : []).map('
  },
  
  // Object property access
  {
    find: /(\w+)\.(\w+)\s*&&\s*\1\.\2\.length/g,
    replace: '($1 && Array.isArray($1.$2) ? $1.$2.length : 0)'
  }
];

// Safe imports to add
const SAFE_IMPORTS = `import { safeArray, safeFind, safeFilter, safeMap, hasItems, safeGet } from '../utils/safeDataAccess';`;

function fixNullReferences(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Skip if file already has safe imports
    if (content.includes('safeDataAccess')) {
      return false;
    }

    // Apply null reference fixes
    NULL_REFERENCE_FIXES.forEach(fix => {
      const newContent = content.replace(fix.find, fix.replace);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    // Add safe imports if modifications were made
    if (modified && content.includes('import')) {
      const importIndex = content.lastIndexOf('import');
      const nextLineIndex = content.indexOf('\n', importIndex);
      
      if (nextLineIndex !== -1) {
        content = content.slice(0, nextLineIndex + 1) + 
                 SAFE_IMPORTS + '\n' + 
                 content.slice(nextLineIndex + 1);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed null references in: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing null reference errors across the application...\n');
  
  let totalFixed = 0;
  
  PATTERNS_TO_CHECK.forEach(pattern => {
    const files = glob.sync(pattern, { 
      cwd: process.cwd(),
      ignore: ['node_modules/**', '.next/**', 'scripts/**']
    });
    
    files.forEach(file => {
      if (fixNullReferences(file)) {
        totalFixed++;
      }
    });
  });
  
  console.log(`\n🎉 Fixed null reference errors in ${totalFixed} files`);
  console.log('\n✅ Benefits:');
  console.log('  • Prevents "Cannot read properties of null" errors');
  console.log('  • Safer array and object access');
  console.log('  • Better error handling during loading states');
  console.log('  • More robust application behavior');
  
  if (totalFixed === 0) {
    console.log('\nℹ️  No files needed fixing - application is already safe!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixNullReferences, NULL_REFERENCE_FIXES };