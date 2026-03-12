#!/bin/bash

# =============================================================================
# Build Production Extension Script
# =============================================================================
# This script builds the production version of the browser extension
# Run: bash scripts/build-production.sh
# =============================================================================

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Building Pocket Room Browser Extension${NC}"
echo "===================================="
echo ""

# Check if we're in the extension directory
if [ ! -f "manifest.json" ]; then
    echo "Error: manifest.json not found. Please run from apps/extension directory."
    exit 1
fi

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist/
echo -e "${GREEN}✓ Cleaned${NC}"

# Check environment variables
echo ""
echo "Checking environment variables..."
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠ .env.production not found. Using .env.example as template.${NC}"
    echo "Please create .env.production with your production values."
    echo ""
    echo -n "Continue anyway? (y/n): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Build cancelled."
        exit 1
    fi
fi

# Build extension
echo ""
echo "Building extension..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

# Get version from manifest
VERSION=$(node -p "require('./manifest.json').version")

# Create ZIP package
echo ""
echo "Creating ZIP package..."
cd dist
ZIP_NAME="pocket-room-extension-v${VERSION}.zip"
zip -r "../${ZIP_NAME}" .
cd ..

if [ -f "$ZIP_NAME" ]; then
    ZIP_SIZE=$(du -h "$ZIP_NAME" | cut -f1)
    echo -e "${GREEN}✓ Package created: ${ZIP_NAME} (${ZIP_SIZE})${NC}"
else
    echo -e "${RED}✗ Failed to create package${NC}"
    exit 1
fi

# Verify package contents
echo ""
echo "Verifying package contents..."
unzip -l "$ZIP_NAME" | grep -E "(manifest.json|icons/|\.js|\.html|\.css)"

echo ""
echo "===================================="
echo -e "${GREEN}✓ Extension build completed!${NC}"
echo ""
echo "Package: $ZIP_NAME"
echo "Size: $ZIP_SIZE"
echo ""
echo "Next steps:"
echo "1. Test the extension locally:"
echo "   - Open chrome://extensions/"
echo "   - Enable Developer mode"
echo "   - Load unpacked extension from dist/"
echo ""
echo "2. Upload to Chrome Web Store:"
echo "   - Go to https://chrome.google.com/webstore/devconsole"
echo "   - Upload $ZIP_NAME"
echo "   - Fill in store listing information"
echo "   - Submit for review"
