#!/usr/bin/env node

/**
 * Script to automatically fix reload issues across all dashboard pages
 * Run with: node scripts/fix-reload-issues.js
 */

const fs = require('fs');
const path = require('path');

// Pages that need to be updated
const PAGES_TO_FIX = [
  'pages/admin/index.js',
  'pages/coordinator/index.js', 
  'pages/ward/index.js',
  'pages/admin/users/index.js',
  'pages/admin/wards/index.js',
  'pages/coordinator/wards/index.js',
  'pages/coordinator/users/index.js'
];

// Pattern to find and replace loading conditions
const LOADING_PATTERNS = [
  {
    find: /if \(loading\) \{[\s\S]*?return \([\s\S]*?<ShimmerDashboard \/>\s*<\/Layout>\s*\);\s*\}/g,
    replace: `// Only show loading if we don't have any data and we're actually loading
  if (loading && !stats && !recentReports?.length && !recentActivity?.length) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }`
  },
  {
    find: /const \{ stats, recentReports, recentActivity, recentLogins, loading, error, refetch \} = useDashboardData\('([^']+)'\);/g,
    replace: `// Use the no-reload dashboard hook to prevent loading on tab switch
  const { data: dashboardData, loading, error, refresh } = useNoReloadDashboard('$1');
  
  // Extract data from dashboard response
  const stats = dashboardData?.stats || {};
  const recentReports = dashboardData?.recentReports || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const recentLogins = dashboardData?.recentLogins || [];`
  }
];

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Add import if not present
    if (!content.includes('useNoReloadDashboard')) {
      content = content.replace(
        /import \{ useApiData, useDashboardData \} from '([^']+)';/,
        `import { useApiData, useDashboardData } from '$1';
import { useNoReloadDashboard } from '../../hooks/useNoReload';`
      );
      modified = true;
    }

    // Apply patterns
    LOADING_PATTERNS.forEach(pattern => {
      const newContent = content.replace(pattern.find, pattern.replace);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    // Fix refetch calls
    content = content.replace(/refetch\(\)/g, 'refresh()');
    if (content !== fs.readFileSync(filePath, 'utf8')) {
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing reload issues in dashboard pages...\n');
  
  let fixedCount = 0;
  
  PAGES_TO_FIX.forEach(pagePath => {
    const fullPath = path.join(__dirname, '..', pagePath);
    if (fixFile(fullPath)) {
      fixedCount++;
    }
  });
  
  console.log(`\n✨ Fixed ${fixedCount} files`);
  console.log('\n📋 Next steps:');
  console.log('1. Test tab switching on dashboard pages');
  console.log('2. Verify data loads instantly on page revisit');
  console.log('3. Check that background refresh works');
  console.log('\n🎯 The reload issue should now be resolved!');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, PAGES_TO_FIX, LOADING_PATTERNS };