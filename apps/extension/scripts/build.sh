#!/bin/bash

# Build script for Pocket Room Extension

echo "Building Pocket Room Extension..."

# Run TypeScript compiler
echo "Running TypeScript compiler..."
tsc --noEmit

# Build with Vite
echo "Building with Vite..."
vite build

# Copy manifest.json to dist
echo "Copying manifest.json..."
cp manifest.json dist/

# Copy public assets to dist
echo "Copying public assets..."
if [ -d "public" ]; then
  cp -r public/* dist/ 2>/dev/null || true
fi

echo "Build complete! Extension is ready in dist/"
echo ""
echo "To load the extension:"
echo "1. Open chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist/' directory"
