#!/bin/bash

# =============================================================================
# Pre-Deployment Check Script
# =============================================================================
# This script performs checks before deploying to production
# Run: bash scripts/pre-deploy-check.sh
# =============================================================================

set -e

echo "🚀 Pocket Room Pre-Deployment Check"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counter
CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "1. Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    print_success "Node.js version: $(node -v)"
else
    print_error "Node.js version must be 18 or higher. Current: $(node -v)"
fi

echo ""
echo "2. Checking dependencies..."
cd apps/web
if npm list --depth=0 > /dev/null 2>&1; then
    print_success "All dependencies installed"
else
    print_error "Missing dependencies. Run: npm install"
fi

echo ""
echo "3. Running TypeScript type check..."
if npx tsc --noEmit > /dev/null 2>&1; then
    print_success "TypeScript type check passed"
else
    print_error "TypeScript type check failed. Run: npx tsc --noEmit"
fi

echo ""
echo "4. Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    print_success "ESLint check passed"
else
    print_warning "ESLint warnings found. Review with: npm run lint"
fi

echo ""
echo "5. Running tests..."
if npm run test > /dev/null 2>&1; then
    print_success "All tests passed"
else
    print_error "Tests failed. Run: npm run test"
fi

echo ""
echo "6. Checking environment variables..."
if [ -f ".env.local" ]; then
    print_success ".env.local file exists"
else
    print_warning ".env.local not found (OK for CI/CD)"
fi

echo ""
echo "7. Building production bundle..."
if npm run build > /dev/null 2>&1; then
    print_success "Production build successful"
else
    print_error "Production build failed. Run: npm run build"
fi

echo ""
echo "8. Checking build output..."
if [ -d ".next" ]; then
    BUILD_SIZE=$(du -sh .next | cut -f1)
    print_success "Build output exists (Size: $BUILD_SIZE)"
else
    print_error "Build output not found"
fi

echo ""
echo "===================================="
echo "Pre-Deployment Check Summary"
echo "===================================="
echo -e "Checks passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to deploy.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please fix the issues before deploying.${NC}"
    exit 1
fi
