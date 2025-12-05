#!/bin/bash
# Phase 2: Reddit Data Export Script
# This script runs all export commands in the correct order

set -e  # Exit on error

echo "========================================"
echo "Reddit Data Export - Phase 2"
echo "========================================"
echo ""

# Parse arguments
DRY_RUN=""
LIMIT=""
CHANNEL=""
POST_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN="--dry-run"
      shift
      ;;
    --limit)
      LIMIT="--limit $2"
      shift 2
      ;;
    --channel)
      CHANNEL="--channel $2"
      shift 2
      ;;
    --post-id)
      POST_ID="--post-id $2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run] [--limit N] [--channel name] [--post-id id]"
      exit 1
      ;;
  esac
done

# Show mode
if [ -n "$DRY_RUN" ]; then
  echo "🧪 DRY RUN MODE - No changes will be made"
  echo ""
fi

# Step 1: Export Channels
echo "Step 1/5: Exporting channels..."
docker-compose exec web python manage.py export_reddit_channels $DRY_RUN $LIMIT
echo ""

# Step 2: Export Posts
echo "Step 2/5: Exporting posts..."
docker-compose exec web python manage.py export_reddit_posts $DRY_RUN $LIMIT $CHANNEL
echo ""

# Step 3: Export Comments
echo "Step 3/5: Exporting comments..."
docker-compose exec web python manage.py export_reddit_comments $DRY_RUN $LIMIT $POST_ID
echo ""

# Step 4: Build Comment Trees
echo "Step 4/5: Building comment trees..."
docker-compose exec web python manage.py build_comment_trees $DRY_RUN $LIMIT $POST_ID
echo ""

# Step 5: Verify Data
echo "Step 5/5: Verifying data integrity..."
docker-compose exec web python manage.py verify_reddit_export
echo ""

echo "========================================"
echo "✅ Export complete!"
echo "========================================"
