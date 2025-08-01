#!/usr/bin/env node

/**
 * Script to verify all import paths are correct
 */

const { execSync } = require('child_process');

function main() {
  console.log('🔍 Verifying all import paths...\n');
  
  try {
    // Check for any remaining incorrect imports
    console.log('Checking for incorrect Shimmer imports...');
    const shimmerCheck = execSync('find ward-management/ward-management-system/pages -name "*.js" -exec grep -l "from.*components/Shimmer" {} \\; | head -10', { encoding: 'utf8' });
    
    if (shimmerCheck.trim()) {
      console.log('Files with Shimmer imports:');
      const files = shimmerCheck.trim().split('\n');
      
      for (const file of files) {
        const content = execSync(`grep "components/Shimmer" "${file}"`, { encoding: 'utf8' });
        const relativePath = file.replace('ward-management/ward-management-system/', '');
        const depth = relativePath.split('/').length - 2; // -2 because we start from pages/
        
        let expectedPath;
        if (depth === 0) {
          expectedPath = '../components/Shimmer';
        } else if (depth === 1) {
          expectedPath = '../../components/Shimmer';
        } else if (depth === 2) {
          expectedPath = '../../../components/Shimmer';
        } else {
          expectedPath = '../'.repeat(depth + 1) + 'components/Shimmer';
        }
        
        const isCorrect = content.includes(`'${expectedPath}'`) || content.includes(`"${expectedPath}"`);
        
        console.log(`  ${isCorrect ? '✅' : '❌'} ${relativePath}`);
        if (!isCorrect) {
          console.log(`    Current: ${content.trim()}`);
          console.log(`    Expected: import { ... } from '${expectedPath}';`);
        }
      }
    } else {
      console.log('✅ No Shimmer imports found (this might indicate an issue)');
    }
    
    console.log('\nChecking for incorrect useApiData imports...');
    const hooksCheck = execSync('find ward-management/ward-management-system/pages -name "*.js" -exec grep -l "hooks/useApiData" {} \\; | head -5', { encoding: 'utf8' });
    
    if (hooksCheck.trim()) {
      console.log('Sample files with useApiData imports:');
      const files = hooksCheck.trim().split('\n').slice(0, 5);
      
      for (const file of files) {
        const content = execSync(`grep "hooks/useApiData" "${file}"`, { encoding: 'utf8' });
        const relativePath = file.replace('ward-management/ward-management-system/', '');
        console.log(`  ✅ ${relativePath}`);
        console.log(`    ${content.trim()}`);
      }
    }
    
    console.log('\n🎯 Checking specific problematic patterns...');
    
    // Check for './components/Shimmer' in pages directory (should be '../components/Shimmer')
    try {
      const badRootImports = execSync('grep -r "from.*\\./components/Shimmer" ward-management/ward-management-system/pages/ || true', { encoding: 'utf8' });
      if (badRootImports.trim()) {
        console.log('❌ Found incorrect root-level imports:');
        console.log(badRootImports);
      } else {
        console.log('✅ No incorrect root-level imports found');
      }
    } catch (e) {
      console.log('✅ No incorrect root-level imports found');
    }
    
    // Check for '../components/Shimmer' in admin directory (should be '../../components/Shimmer')
    try {
      const badAdminImports = execSync('grep -r "from.*\\.\\./components/Shimmer" ward-management/ward-management-system/pages/admin/ || true', { encoding: 'utf8' });
      if (badAdminImports.trim()) {
        console.log('❌ Found incorrect admin-level imports:');
        console.log(badAdminImports);
      } else {
        console.log('✅ No incorrect admin-level imports found');
      }
    } catch (e) {
      console.log('✅ No incorrect admin-level imports found');
    }
    
    console.log('\n✅ Import verification complete!');
    
  } catch (error) {
    console.error('Error during verification:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };