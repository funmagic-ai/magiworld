#!/bin/bash
#
# Database Reset Script
# 数据库重置脚本
#
# Safely resets the database by dropping and recreating the public schema,
# then pushing the current Drizzle schema.
# 安全地重置数据库，删除并重建public schema，然后推送当前的Drizzle schema。
#

set -e

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$PACKAGE_DIR")")"

# Load .env file from root if DATABASE_URL not already set
if [[ -z "$DATABASE_URL" ]]; then
  if [[ -f "$ROOT_DIR/.env" ]]; then
    echo "Loading environment from $ROOT_DIR/.env"
    export $(grep -v '^#' "$ROOT_DIR/.env" | grep DATABASE_URL | xargs)
  elif [[ -f "$PACKAGE_DIR/.env" ]]; then
    echo "Loading environment from $PACKAGE_DIR/.env"
    export $(grep -v '^#' "$PACKAGE_DIR/.env" | grep DATABASE_URL | xargs)
  fi
fi

# Check if DATABASE_URL is set
if [[ -z "$DATABASE_URL" ]]; then
  echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
  exit 1
fi

# Safety check: Refuse to run on production
if [[ "$DATABASE_URL" == *"prod"* ]] || \
   [[ "$DATABASE_URL" == *"production"* ]] || \
   [[ "$NODE_ENV" == "production" ]]; then
  echo -e "${RED}ERROR: Cannot reset production database${NC}"
  echo "DATABASE_URL contains 'prod' or NODE_ENV is 'production'"
  exit 1
fi

# Extract host from DATABASE_URL for display (hide password)
DB_DISPLAY=$(echo "$DATABASE_URL" | sed -E 's|://[^:]+:[^@]+@|://***:***@|')

echo -e "${YELLOW}WARNING: This will permanently DELETE ALL DATA in the database${NC}"
echo -e "Target: ${DB_DISPLAY}"
echo ""

# Confirmation prompt
read -p "Are you sure you want to reset the database? (type 'yes' to confirm): " confirm

if [[ "$confirm" != "yes" ]]; then
  echo "Aborted"
  exit 0
fi

echo ""
echo "Dropping and recreating public schema..."
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Pushing Drizzle schema..."
npx drizzle-kit push

echo ""
echo -e "${GREEN}Database reset complete${NC}"
