#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "  🧪 PWA Testing Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Starting tests..."
echo ""

# Check if service worker exists
if [ -f "public/sw.js" ]; then
    echo "✅ Service Worker file exists"
else
    echo "❌ Service Worker file missing"
fi

# Check if manifest exists
if [ -f "public/manifest.json" ]; then
    echo "✅ Manifest file exists"
else
    echo "❌ Manifest file missing"
fi

# Check if offline page exists
if [ -f "pages/offline.js" ]; then
    echo "✅ Offline page exists"
else
    echo "❌ Offline page missing"
fi

# Check if PWA install button exists
if [ -f "components/PWAInstallButton.js" ]; then
    echo "✅ PWA install button component exists"
else
    echo "❌ PWA install button component missing"
fi

# Check if test page exists
if [ -f "public/test-pwa.html" ]; then
    echo "✅ PWA test page exists"
else
    echo "❌ PWA test page missing"
fi

echo ""
echo "Checking for icons..."
ICON_SIZES=(72 96 128 144 152 192 384 512)
MISSING_ICONS=0

for size in "${ICON_SIZES[@]}"; do
    if [ -f "public/icon-${size}x${size}.png" ]; then
        echo "✅ Icon ${size}x${size} exists"
    else
        echo "⏳ Icon ${size}x${size} missing (need to generate)"
        MISSING_ICONS=$((MISSING_ICONS + 1))
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
if [ $MISSING_ICONS -eq 0 ]; then
    echo "  🎉 ALL FILES READY! You can test now."
    echo "  Run: npm run dev"
    echo "  Visit: http://localhost:3000/test-pwa.html"
else
    echo "  ⏳ $MISSING_ICONS icons need to be generated"
    echo "  See GENERATE_ICONS.md for instructions"
    echo "  Takes only 5 minutes!"
fi
echo "═══════════════════════════════════════════════════════════════"
