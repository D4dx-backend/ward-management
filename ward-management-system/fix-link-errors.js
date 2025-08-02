#!/usr/bin/env node

/**
 * Script to fix Next.js Link component errors
 * Removes <a> tags and Button components from Link children
 */

const fs = require('fs');
const path = require('path');

// Files that need Link fixes
const filesToFix = [
  'pages/ward/reports/view/[id].js',
  'pages/ward/reports/edit/[id].js', 
  'pages/ward/reports/submit.js',
  'pages/ward/reports/submit/[id].js',
  'pages/admin/reports/index.js',
  'pages/admin/reports/view/[id].js',
  'pages/admin/wards/reports/[id].js',
  'pages/admin/forms/index.js',
  'pages/admin/wards/index.js',
  'pages/admin/ward-visits.js'
];

// Button variant styles mapping
const buttonStyles = {
  'outline': 'inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
  'success': 'inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
  'default': 'inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
};

function fixLinkInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: Link with Button child
  const linkButtonPattern = /<Link\s+href="([^"]+)">\s*<Button([^>]*)>([\s\S]*?)<\/Button>\s*<\/Link>/g;
  content = content.replace(linkButtonPattern, (match, href, buttonProps, buttonContent) => {
    modified = true;
    
    // Extract variant from button props
    const variantMatch = buttonProps.match(/variant="([^"]+)"/);
    const variant = variantMatch ? variantMatch[1] : 'default';
    
    // Extract size and other props
    const sizeMatch = buttonProps.match(/size="([^"]+)"/);
    const size = sizeMatch ? sizeMatch[1] : '';
    
    // Extract className
    const classMatch = buttonProps.match(/className="([^"]+)"/);
    const extraClass = classMatch ? ` ${classMatch[1]}` : '';
    
    // Get base style
    let className = buttonStyles[variant] || buttonStyles.default;
    
    // Adjust for size
    if (size === 'sm') {
      className = className.replace('px-4 py-2', 'px-3 py-2').replace('text-sm', 'text-xs');
    }
    
    className += extraClass;
    
    return `<Link href="${href}" className="${className}">${buttonContent}</Link>`;
  });

  // Pattern 2: Link with anchor child
  const linkAnchorPattern = /<Link\s+href="([^"]+)">\s*<a([^>]*)>([\s\S]*?)<\/a>\s*<\/Link>/g;
  content = content.replace(linkAnchorPattern, (match, href, anchorProps, anchorContent) => {
    modified = true;
    
    // Extract className from anchor
    const classMatch = anchorProps.match(/className="([^"]+)"/);
    const className = classMatch ? classMatch[1] : '';
    
    return `<Link href="${href}" className="${className}">${anchorContent}</Link>`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed Link errors in: ${filePath}`);
  } else {
    console.log(`No Link errors found in: ${filePath}`);
  }
}

// Fix all files
filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);
  fixLinkInFile(fullPath);
});

console.log('Link error fixing complete!');