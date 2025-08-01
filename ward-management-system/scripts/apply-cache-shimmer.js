#!/usr/bin/env node

/**
 * Comprehensive script to apply cache and shimmer loading to all pages
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../pages');

// Template for adding imports
const addImports = (content) => {
  // Check if already has shimmer imports
  if (content.includes('Shimmer') && content.includes('useApiData')) {
    return content;
  }

  // Find the last import statement
  const importLines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].trim().startsWith('import ') && importLines[i].includes('from ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) return content;

  // Add shimmer and cache imports
  const newImports = [
    "import { ShimmerDashboard, ShimmerTable, ShimmerCard, ShimmerList, ShimmerForm } from '../components/Shimmer';",
    "import { useApiData } from '../hooks/useApiData';"
  ];

  // Adjust import paths based on directory depth
  const depth = (content.match(/\.\.\//g) || []).length;
  if (depth === 0) {
    // Root level pages
    newImports[0] = newImports[0].replace('../components/', './components/');
    newImports[1] = newImports[1].replace('../hooks/', './hooks/');
  } else if (depth === 1) {
    // One level deep (admin, coordinator, ward)
    // Keep as is
  } else if (depth === 2) {
    // Two levels deep (admin/users, etc.)
    newImports[0] = newImports[0].replace('../components/', '../../../components/');
    newImports[1] = newImports[1].replace('../hooks/', '../../../hooks/');
  }

  importLines.splice(lastImportIndex + 1, 0, ...newImports);
  return importLines.join('\n');
};

// Replace loading patterns
const replaceLoadingPatterns = (content) => {
  let modified = content;

  // Replace spinner loading with shimmer
  const spinnerPattern = /return \(\s*<div className="min-h-screen flex items-center justify-center[^>]*>\s*<div className="animate-spin[^>]*><\/div>\s*<\/div>\s*\);/g;
  modified = modified.replace(spinnerPattern, `return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );`);

  // Replace simple loading checks
  const loadingPattern = /if \(.*(?:isLoading|loading).*\) \{\s*return[\s\S]*?;\s*\}/g;
  const matches = modified.match(loadingPattern);
  
  if (matches) {
    matches.forEach(match => {
      if (match.includes('ShimmerDashboard')) return; // Already updated
      
      const replacement = `if (loading) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }`;
      
      modified = modified.replace(match, replacement);
    });
  }

  return modified;
};

// Add useApiData hook for common patterns
const addApiDataHook = (content) => {
  // Look for axios.get patterns and suggest useApiData
  if (content.includes('axios.get') && !content.includes('useApiData')) {
    console.log('  → Contains axios.get calls - consider using useApiData hook');
  }
  
  return content;
};

// Process a single file
const processFile = (filePath) => {
  try {
    const relativePath = path.relative(PAGES_DIR, filePath);
    console.log(`Processing: ${relativePath}`);

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Skip API routes and special files
    if (filePath.includes('/api/') || 
        filePath.includes('_app.js') || 
        filePath.includes('_document.js') ||
        filePath.includes('.test.js') ||
        filePath.includes('.spec.js')) {
      console.log('  → Skipped (API/special file)');
      return;
    }

    // Skip if not a React component
    if (!content.includes('export default function') && !content.includes('export default class')) {
      console.log('  → Skipped (not a React component)');
      return;
    }

    // Apply transformations
    content = addImports(content);
    content = replaceLoadingPatterns(content);
    content = addApiDataHook(content);

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log('  ✓ Updated');
    } else {
      console.log('  → No changes needed');
    }

  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}:`, error.message);
  }
};

// Get all JS files recursively
const getAllJSFiles = (dir) => {
  let files = [];
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.')) {
      files = files.concat(getAllJSFiles(fullPath));
    } else if (item.endsWith('.js') && !item.startsWith('_')) {
      files.push(fullPath);
    }
  }
  
  return files;
};

// Main execution
const main = () => {
  console.log('🚀 Starting cache and shimmer loading implementation...\n');
  
  const jsFiles = getAllJSFiles(PAGES_DIR);
  console.log(`Found ${jsFiles.length} JavaScript files to process\n`);
  
  jsFiles.forEach(processFile);
  
  console.log('\n✅ Cache and shimmer loading implementation complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Review the updated files');
  console.log('2. Replace axios.get calls with useApiData hook where appropriate');
  console.log('3. Test the loading states');
  console.log('4. Adjust cache TTL values as needed');
};

if (require.main === module) {
  main();
}

module.exports = { processFile, getAllJSFiles };