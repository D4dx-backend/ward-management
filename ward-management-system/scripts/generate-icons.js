#!/usr/bin/env node

/**
 * Generate placeholder PWA icons
 * This creates simple colored squares with "WP" text for the Ward Management System
 */

const fs = require('fs');
const path = require('path');

// Simple SVG template for icons
const generateSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#10b981"/>
  <text 
    x="50%" 
    y="50%" 
    dominant-baseline="middle" 
    text-anchor="middle" 
    font-family="Arial, sans-serif" 
    font-weight="bold" 
    font-size="${size * 0.4}" 
    fill="white"
  >WP</text>
</svg>
`.trim();

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Public directory
const publicDir = path.join(__dirname, '..', 'public');

// Create SVG placeholders
console.log('🎨 Generating PWA icon placeholders...\n');

sizes.forEach(size => {
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(publicDir, filename);
  const svg = generateSVG(size);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Created ${filename}`);
});

// Create maskable versions (same for now)
[192, 512].forEach(size => {
  const filename = `icon-maskable-${size}x${size}.svg`;
  const filepath = path.join(publicDir, filename);
  const svg = generateSVG(size);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Created ${filename}`);
});

console.log('\n✨ All icon placeholders generated successfully!');
console.log('💡 Tip: Replace these SVG files with proper PNG icons for production.');


