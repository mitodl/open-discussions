# Phase 2: Reddit Data Migration - Quick Reference

## ✅ Status: COMPLETE

All management commands for exporting data from Reddit have been implemented and tested.

## Commands Available

```bash
docker-compose exec web python manage.py help | grep -E "(export_|build_|verify_)"
```

Output:
- `build_comment_trees` - Build MaterializedPath trees
- `export_reddit_channels` - Export channel metadata
- `export_reddit_comments` - Export comments with scores
- `export_reddit_posts` - Export posts with scores
- `verify_reddit_export` - Verify data integrity

## Quick Start

### 1. Test with Dry Run (Recommended First)
```bash
./scripts/export_reddit_data.sh --dry-run --limit 5
```

### 2. Export Specific Channel
```bash
docker-compose exec web python manage.py export_reddit_posts --channel channelname
```

### 3. Export Everything
```bash
./scripts/export_reddit_data.sh
```

### 4. Verify Results
```bash
docker-compose exec web python manage.py verify_reddit_export
```

## Common Options

All export commands support:
- `--dry-run` - Test without making changes
- `--limit N` - Process only N items
- `--batch-size N` - Control batch size (default: 100)

## Command Details

### Export Channels
```bash
docker-compose exec web python manage.py export_reddit_channels [options]
```
Updates existing channels with Reddit metadata and reddit_id.

### Export Posts
```bash
docker-compose exec web python manage.py export_reddit_posts [options] [--channel NAME]
```
Exports posts with frozen scores, supports per-channel export.

### Export Comments
```bash
docker-compose exec web python manage.py export_reddit_comments [options] [--post-id ID]
```
Exports comments with frozen scores, supports per-post export.

### Build Trees
```bash
docker-compose exec web python manage.py build_comment_trees [options] [--rebuild] [--post-id ID]
```
Builds MaterializedPath tree structures for efficient traversal.

### Verify Export
```bash
docker-compose exec web python manage.py verify_reddit_export
```
Checks data integrity and reports statistics.

## Execution Order

For complete migration:
1. Export channels
2. Export posts
3. Export comments
4. Build comment trees
5. Verify results

Or use the automated script: `./scripts/export_reddit_data.sh`

## Files Created

```
channels/management/commands/
├── _base_reddit_export.py          # Base class
├── export_reddit_channels.py       # Channel export
├── export_reddit_posts.py          # Post export
├── export_reddit_comments.py       # Comment export
├── build_comment_trees.py          # Tree builder
└── verify_reddit_export.py         # Verification

scripts/
└── export_reddit_data.sh           # Automated script

Documentation:
├── PHASE_2_IMPLEMENTATION_COMPLETE.md
├── PHASE_2_SUMMARY.md
└── README_PHASE_2.md (this file)
```

## Example Output

```
$ docker-compose exec web python manage.py verify_reddit_export
Verifying Reddit export...

✓ Channels: 1
  - With reddit_id: 1
✓ Posts: 2
  - With reddit_id: 2
  - With score: 0
✓ Comments: 1
  - With reddit_id: 1
✓ Comment Trees: 1 posts
  - Total tree nodes: 2
  - Posts without trees: 1

==================================================
✓ All verifications passed!
```

## Troubleshooting

### Command Not Found
Ensure you're running in the Docker container:
```bash
docker-compose exec web python manage.py help
```

### Reddit API Errors
Check environment variables:
- REDDIT_CLIENT_ID
- REDDIT_SECRET
- REDDIT_URL
- INDEXING_API_USERNAME

### Tree Building Errors
1. Verify comments are exported first
2. Check parent_reddit_id is populated
3. Try rebuilding: `--rebuild`

## Safety Features

✅ **Idempotent** - Safe to re-run  
✅ **Dry-run mode** - Test without changes  
✅ **Error handling** - Continues on individual errors  
✅ **Progress tracking** - Shows statistics  
✅ **Verification** - Check data integrity  

## Documentation

- **Implementation Guide**: `PHASE_2_IMPLEMENTATION_COMPLETE.md`
- **Summary**: `PHASE_2_SUMMARY.md`
- **Original Plan**: `docs/reddit-termination-plan/PHASE_2_DATA_MIGRATION.md`

## Next Steps

1. Test on staging environment
2. Run full export
3. Verify data integrity
4. Proceed to Phase 3

---

**Status**: ✅ COMPLETE  
**Date**: 2024-12-05  
**Ready for**: Full export execution
