#!/usr/bin/env node

/**
 * AGGRESSIVE SCRIPT TO ELIMINATE ALL RELOAD ISSUES
 * This script removes ALL loading states that could appear on page revisits
 */

const fs = require('fs');
const path = require('path');

// All dashboard and main pages
const PAGES_TO_FIX = [
  'pages/coordinator/index.js',
  'pages/ward/index.js',
  'pages/admin/index.js',
  'pages/coordinator/wards/index.js',
  'pages/coordinator/users/index.js',
  'pages/admin/users/index.js',
  'pages/admin/wards/index.js'
];

// Aggressive replacements to eliminate ALL loading states
const AGGRESSIVE_FIXES = [
  // Replace any loading condition that could show on revisit
  {
    find: /if \(loading.*?\) \{[\s\S]*?return \([\s\S]*?<ShimmerDashboard[\s\S]*?\/>\s*<\/Layout>\s*\);\s*\}/g,
    replace: `// ZERO-RELOAD: Only show loading on absolute first visit with no cache
  if (loading && !data && !dashboardData && typeof window !== 'undefined' && !localStorage.getItem('instant_dashboard_' + (session?.user?.role || 'unknown'))) {
    return (
      <Layout>
        <ShimmerDashboard />
      </Layout>
    );
  }`
  },
  
  // Replace dashboard data hooks with instant load
  {
    find: /const \{ (.*?) \} = useDashboardData\('([^']+)'\);/g,
    replace: `const { data: dashboardData, loading, error, refresh } = useInstantDashboard('$2');
  const stats = dashboardData?.stats || {};
  const recentReports = dashboardData?.recentReports || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const recentLogins = dashboardData?.recentLogins || [];`
  },
  
  // Add instant load import
  {
    find: /import \{ useApiData, useDashboardData \} from '([^']+)';/g,
    replace: `import { useApiData, useDashboardData } from '$1';
import { useInstantDashboard } from '../../hooks/useInstantLoad';`
  },
  
  // Replace any remaining loading checks
  {
    find: /if \(.*loading.*\) \{[\s\S]*?<ShimmerDashboard[\s\S]*?\/>\s*<\/Layout>[\s\S]*?\}/g,
    replace: `// ELIMINATED: No loading states on revisit`
  }
];

function aggressivelyFixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply aggressive fixes
    AGGRESSIVE_FIXES.forEach((fix, index) => {
      const newContent = content.replace(fix.find, fix.replace);
      if (newContent !== content) {
        content = newContent;
        modified = true;
        console.log(`  ✅ Applied fix ${index + 1} to ${path.basename(filePath)}`);
      }
    });

    // Additional aggressive fixes
    
    // Remove any userLoading or instructionsLoading from loading conditions
    content = content.replace(
      /\|\| userLoading \|\| instructionsLoading/g,
      ''
    );
    
    // Replace any remaining complex loading conditions
    content = content.replace(
      /if \(\(loading && [^)]+\) \|\| [^)]+\) \{/g,
      'if (false) { // ELIMINATED: No loading on revisit'
    );

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`🚀 AGGRESSIVELY FIXED: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  Already optimized: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔥 AGGRESSIVELY ELIMINATING ALL RELOAD ISSUES...\n');
  
  let fixedCount = 0;
  
  PAGES_TO_FIX.forEach(pagePath => {
    const fullPath = path.join(__dirname, '..', pagePath);
    console.log(`\n🎯 Processing: ${pagePath}`);
    if (aggressivelyFixFile(fullPath)) {
      fixedCount++;
    }
  });
  
  console.log(`\n🎉 AGGRESSIVELY FIXED ${fixedCount} files`);
  console.log('\n🚀 ZERO-RELOAD SYSTEM ACTIVATED!');
  console.log('\n✅ Benefits:');
  console.log('  • NO loading spinners on tab switch');
  console.log('  • INSTANT page loads on revisit');
  console.log('  • AGGRESSIVE caching (4+ hours)');
  console.log('  • ZERO reload delays');
  console.log('\n🧪 Test by:');
  console.log('  1. Visit any dashboard');
  console.log('  2. Switch tabs for any duration');
  console.log('  3. Return - should be INSTANT');
  console.log('\n💥 RELOAD ISSUES = ELIMINATED!');
}

if (require.main === module) {
  main();
}

module.exports = { aggressivelyFixFile, PAGES_TO_FIX, AGGRESSIVE_FIXES };