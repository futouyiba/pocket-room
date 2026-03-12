#!/bin/bash

# =============================================================================
# Setup Production Database Script
# =============================================================================
# This script sets up the production Supabase database
# Run: bash scripts/setup-production-db.sh
# =============================================================================

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Pocket Room Production Database Setup${NC}"
echo "===================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI not found. Installing...${NC}"
    brew install supabase/tap/supabase
fi

echo "This script will:"
echo "1. Connect to your production Supabase project"
echo "2. Execute database migrations"
echo "3. Set up RLS policies"
echo "4. Create storage buckets"
echo ""

echo -n "Enter your Supabase project reference ID: "
read -r PROJECT_REF

echo ""
echo "Linking to Supabase project..."
supabase link --project-ref "$PROJECT_REF"

echo ""
echo -e "${BLUE}Step 1: Executing database migrations${NC}"
echo "===================================="

# Check if docs/db.sql exists
if [ -f "docs/db.sql" ]; then
    echo "Found database schema file: docs/db.sql"
    echo -n "Execute database migrations? (y/n): "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        supabase db push
        echo -e "${GREEN}✓ Database migrations executed${NC}"
    else
        echo -e "${YELLOW}⚠ Skipped database migrations${NC}"
    fi
else
    echo -e "${RED}✗ Database schema file not found: docs/db.sql${NC}"
    echo "Please create the schema file first."
fi

echo ""
echo -e "${BLUE}Step 2: Setting up RLS policies${NC}"
echo "===================================="

# Check if docs/rls-policies.sql exists
if [ -f "docs/rls-policies.sql" ]; then
    echo "Found RLS policies file: docs/rls-policies.sql"
    echo -n "Execute RLS policies? (y/n): "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        supabase db push
        echo -e "${GREEN}✓ RLS policies configured${NC}"
    else
        echo -e "${YELLOW}⚠ Skipped RLS policies${NC}"
    fi
else
    echo -e "${YELLOW}⚠ RLS policies file not found: docs/rls-policies.sql${NC}"
    echo "RLS policies should be included in db.sql or created manually."
fi

echo ""
echo -e "${BLUE}Step 3: Creating storage buckets${NC}"
echo "===================================="

echo "Creating 'message-attachments' bucket..."
echo "Please create this bucket manually in Supabase Dashboard:"
echo "1. Go to Storage in Supabase Dashboard"
echo "2. Create new bucket: 'message-attachments'"
echo "3. Set as public bucket"
echo "4. Configure CORS if needed"
echo ""
echo -n "Press Enter when done..."
read -r

echo ""
echo -e "${GREEN}✓ Production database setup completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify tables in Supabase Dashboard > Database > Tables"
echo "2. Verify RLS policies in Supabase Dashboard > Database > Policies"
echo "3. Verify storage bucket in Supabase Dashboard > Storage"
echo "4. Test database connection from your application"
