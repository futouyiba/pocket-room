#!/bin/bash

# =============================================================================
# Deploy to Vercel Script
# =============================================================================
# This script deploys Pocket Room to Vercel
# Run: bash scripts/deploy-to-vercel.sh [--production]
# =============================================================================

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pocket Room Deployment to Vercel${NC}"
echo "===================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Run pre-deployment checks
echo "Running pre-deployment checks..."
if bash scripts/pre-deploy-check.sh; then
    echo -e "${GREEN}✓ Pre-deployment checks passed${NC}"
else
    echo -e "${YELLOW}⚠ Some checks failed. Continue anyway? (y/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

echo ""
echo "===================================="
echo "Deployment Options"
echo "===================================="
echo "1. Preview deployment (staging)"
echo "2. Production deployment"
echo ""
echo -n "Select option (1 or 2): "
read -r option

case $option in
    1)
        echo ""
        echo -e "${BLUE}Deploying to preview environment...${NC}"
        cd apps/web
        vercel
        ;;
    2)
        echo ""
        echo -e "${YELLOW}⚠ WARNING: This will deploy to PRODUCTION${NC}"
        echo -n "Are you sure? (yes/no): "
        read -r confirm
        if [[ "$confirm" == "yes" ]]; then
            echo ""
            echo -e "${BLUE}Deploying to production...${NC}"
            cd apps/web
            vercel --prod
        else
            echo "Production deployment cancelled."
            exit 0
        fi
        ;;
    *)
        echo "Invalid option. Deployment cancelled."
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓ Deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify the deployment in Vercel Dashboard"
echo "2. Test the deployed application"
echo "3. Configure custom domain (if not done)"
echo "4. Set up monitoring and alerts"
