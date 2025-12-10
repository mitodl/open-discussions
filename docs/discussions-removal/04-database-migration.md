# Database Migration Plan

## Overview

This document provides instructions for safely removing discussion-related database tables and data.

## ⚠️ CRITICAL WARNINGS

1. **BACKUP FIRST**: Create full database backup before proceeding
2. **TEST IN STAGING**: Run all migrations in staging environment first
3. **DOWNTIME**: Plan for maintenance window for production
4. **IRREVERSIBLE**: Data deletion cannot be undone without restore

## Pre-Migration Checklist

- [ ] Full database backup completed
- [ ] Backup verified and downloadable
- [ ] Migrations tested in development environment
- [ ] Migrations tested in staging environment
- [ ] Stakeholders notified of planned downtime
- [ ] Rollback plan documented and tested

## Phase 1: Data Export (Optional)

If you want to preserve discussion data for archival purposes:

### 1.1 Export Channel Data

```bash
python manage.py dumpdata channels.Channel --output=archive/channels.json
python manage.py dumpdata channels.Post --output=archive/posts.json
python manage.py dumpdata channels.Comment --output=archive/comments.json
```

### 1.2 Export to CSV (Alternative)

```python
# Create a management command: export_discussions.py
import csv
from channels.models import Channel, Post, Comment

# Export channels
with open('archive/channels.csv', 'w') as f:
    writer = csv.writer(f)
    writer.writerow(['id', 'name', 'title', 'created_on', 'subscriber_count'])
    for channel in Channel.objects.all():
        writer.writerow([
            channel.id, 
            channel.name, 
            channel.title, 
            channel.created_on,
            # Add other fields as needed
        ])

# Repeat for Posts and Comments
```

Run:
```bash
python manage.py export_discussions
```

### 1.3 Verify Export

```bash
# Check file sizes
ls -lh archive/

# Verify JSON is valid
python -m json.tool archive/channels.json > /dev/null
```

## Phase 2: Search Index Cleanup

Before removing database tables, clean up search indices to avoid orphaned references.

### 2.1 Remove Post and Comment Documents

```python
# Create a management command: cleanup_discussion_search.py

from search.api import remove_all_objects_from_index
from search.constants import POST_TYPE, COMMENT_TYPE

def handle(self, *args, **options):
    # Remove all post documents
    print("Removing posts from search index...")
    remove_all_objects_from_index(POST_TYPE)
    
    # Remove all comment documents  
    print("Removing comments from search index...")
    remove_all_objects_from_index(COMMENT_TYPE)
    
    print("Search index cleanup complete")
```

Run:
```bash
python manage.py cleanup_discussion_search
```

### 2.2 Verify Search Index

```bash
# Check that posts/comments are gone
python manage.py search_index stats

# Verify podcasts/courses still indexed
curl http://localhost:9200/_cat/indices
```

## Phase 3: Create Migration Files

### 3.1 Create Dependency Migrations

For each app that has foreign keys to channels models, create a migration to remove those fields first.

**Example - If profiles app has channel references**:

```bash
python manage.py makemigrations profiles --empty --name remove_channel_references
```

Edit migration:
```python
# profiles/migrations/XXXX_remove_channel_references.py

from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('profiles', 'PREVIOUS_MIGRATION'),
    ]

    operations = [
        # Remove foreign keys to channels
        migrations.RemoveField(
            model_name='profile',
            name='favorite_channels',  # Example field
        ),
        # Add more RemoveField operations as needed
    ]
```

### 3.2 Create Channels Removal Migration

```bash
# This will delete all tables in the channels app
python manage.py makemigrations channels --empty --name delete_all_tables
```

Edit migration:
```python
# channels/migrations/XXXX_delete_all_tables.py

from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('channels', '0029_alter_article_content_alter_channel_about_and_more'),  # Last migration
    ]

    operations = [
        # Delete all models
        migrations.DeleteModel(name='SpamCheckResult'),
        migrations.DeleteModel(name='Article'),
        migrations.DeleteModel(name='Comment'),
        migrations.DeleteModel(name='ChannelMembershipConfig'),
        migrations.DeleteModel(name='ChannelGroupRole'),
        migrations.DeleteModel(name='ChannelSubscription'),
        migrations.DeleteModel(name='Post'),
        migrations.DeleteModel(name='LinkMeta'),
        migrations.DeleteModel(name='ChannelInvitation'),
        migrations.DeleteModel(name='Channel'),
        migrations.DeleteModel(name='Subscription'),
        migrations.DeleteModel(name='RedditAccessToken'),
        migrations.DeleteModel(name='RedditRefreshToken'),
    ]
```

### 3.3 Create Discussions Removal Migration (if applicable)

```bash
python manage.py makemigrations discussions --empty --name delete_all_tables
```

Edit similarly to channels migration.

### 3.4 Create Channels Fields Removal Migration

```bash
python manage.py makemigrations channels_fields --empty --name delete_all_tables
```

## Phase 4: Review Migration Plan

### 4.1 Show Migration Plan

```bash
python manage.py showmigrations
```

Verify order:
1. Dependency apps remove foreign keys first
2. Then channels/discussions/channels_fields delete tables

### 4.2 Generate SQL Preview

```bash
# See what SQL will be executed
python manage.py sqlmigrate channels XXXX_delete_all_tables
```

Review the SQL for:
- DROP TABLE statements
- CASCADE behavior
- Any unexpected operations

## Phase 5: Test Migrations in Development

### 5.1 Apply Migrations

```bash
python manage.py migrate
```

### 5.2 Verify Tables Removed

```bash
python manage.py dbshell

# In database shell:
\dt channels_*    # PostgreSQL
SHOW TABLES LIKE 'channels_%';  # MySQL

# Should return no results
```

### 5.3 Verify App Still Works

```bash
python manage.py runserver

# Test:
# - Search works
# - Podcasts load
# - Courses load
# - User profiles work
# - No errors in logs
```

### 5.4 Test Data Creation

```bash
# Verify you can create new data in preserved apps
python manage.py shell

>>> from course_catalog.models import Podcast
>>> p = Podcast.objects.create(title="Test")
>>> p.save()
# Success means database is healthy
```

## Phase 6: Apply Migrations in Staging

Follow same steps as development, with additional verification:

### 6.1 Backup Staging

```bash
# PostgreSQL
pg_dump -h staging-db -U user dbname > staging-backup-$(date +%Y%m%d).sql

# Verify backup
ls -lh staging-backup-*.sql
```

### 6.2 Apply Migrations

```bash
python manage.py migrate
```

### 6.3 Full Functional Test

- [ ] Search all content types
- [ ] Browse podcasts
- [ ] Browse courses  
- [ ] View user profiles
- [ ] Create/edit learning lists
- [ ] Test API endpoints
- [ ] Check admin interface

### 6.4 Monitor for Errors

```bash
# Check application logs
tail -f logs/django.log

# Check database logs
# Look for errors or unusual queries
```

## Phase 7: Production Migration

### 7.1 Pre-Production Backup

```bash
# CRITICAL: Full backup before migration
pg_dump -h production-db -U user dbname > production-backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup size is reasonable
ls -lh production-backup-*.sql

# Test backup can be read
head -n 100 production-backup-*.sql
```

### 7.2 Announce Maintenance Window

Send notification to users:
- Downtime duration estimate
- Expected completion time
- What will be affected

### 7.3 Enter Maintenance Mode

```bash
# Put site in maintenance mode
# (Implementation depends on your setup)
touch /path/to/maintenance.flag
```

### 7.4 Stop Background Workers

```bash
# Stop Celery workers
supervisorctl stop celery_worker
supervisorctl stop celery_beat

# Verify no tasks running
# Check Celery/RabbitMQ/Redis
```

### 7.5 Apply Migrations

```bash
python manage.py migrate

# Monitor output for any errors
# Migration may take several minutes for large databases
```

### 7.6 Verify Migration Success

```bash
# Check migration status
python manage.py showmigrations

# All should show [X] applied

# Verify tables removed
python manage.py dbshell
# Run table list commands as above
```

### 7.7 Start Application

```bash
# Start workers
supervisorctl start celery_worker
supervisorctl start celery_beat

# Start application servers
supervisorctl restart web

# Remove maintenance mode
rm /path/to/maintenance.flag
```

### 7.8 Smoke Test Production

Immediately test:
- [ ] Homepage loads
- [ ] Search works
- [ ] Podcast page works
- [ ] Course page works
- [ ] User login works
- [ ] Check error logs for issues

### 7.9 Monitor Metrics

Watch for:
- Error rates (should remain low)
- Response times (should be normal or better)
- Database query patterns
- User reports

## Phase 8: Post-Migration Cleanup

### 8.1 Remove Empty App Directories

After confirming everything works:

```bash
# Remove migration directories for deleted apps
rm -rf channels/migrations/
rm -rf discussions/migrations/
rm -rf channels_fields/migrations/

# If apps were completely removed
# (This was done in backend removal phase)
```

### 8.2 Database Optimization

After large deletions, optimize database:

```bash
# PostgreSQL
python manage.py dbshell
VACUUM FULL ANALYZE;

# MySQL
OPTIMIZE TABLE remaining_tables;
```

### 8.3 Update Sequences (PostgreSQL)

```bash
# If needed, reset sequences
python manage.py sqlsequencereset remaining_app | python manage.py dbshell
```

### 8.4 Clean Up Search Indices

```bash
# Rebuild indices for preserved content
python manage.py recreate_index --all
```

## Phase 9: Archive and Documentation

### 9.1 Archive Exports

```bash
# Compress and archive exports
tar -czf discussions-archive-$(date +%Y%m%d).tar.gz archive/

# Move to long-term storage
mv discussions-archive-*.tar.gz /secure/archives/
```

### 9.2 Document Migration

Create a record of:
- Migration date and time
- Who performed migration
- Issues encountered
- Resolution steps taken
- Backup locations

## Rollback Plan

### If Migration Fails

```bash
# 1. Immediately stop application
supervisorctl stop all

# 2. Restore database from backup
psql -h production-db -U user dbname < production-backup-TIMESTAMP.sql

# 3. Verify restore
python manage.py showmigrations
# Should show pre-migration state

# 4. Roll back code changes
git checkout <previous-commit>
git push origin main

# 5. Restart application
supervisorctl start all

# 6. Verify functionality
# Run full test suite
```

### If Issues Found After Migration

If caught within 24-48 hours:
1. Restore from backup (data loss: recent changes since migration)
2. Review and fix issues
3. Re-plan migration

If caught later:
1. Do NOT restore (too much data loss)
2. Fix issues in current state
3. Document problems and solutions

## Database Size Impact

Estimate space savings:

```sql
-- PostgreSQL: Check table sizes before migration
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'channels_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

Document space freed for capacity planning.

## Checklist

Production migration complete when:

- [ ] Backup created and verified
- [ ] Maintenance window announced
- [ ] Application stopped
- [ ] Background workers stopped
- [ ] Migrations applied successfully
- [ ] Tables verified removed
- [ ] Application restarted
- [ ] Smoke tests passed
- [ ] Monitoring shows normal metrics
- [ ] No error spike
- [ ] Users can access preserved features
- [ ] Search works correctly
- [ ] Database optimized
- [ ] Archives created
- [ ] Documentation updated
- [ ] Team notified of completion

## Next Steps

Proceed to [05-dependency-updates.md](./05-dependency-updates.md) for final code cleanup.
