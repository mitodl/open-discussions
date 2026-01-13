# Rollback Plan

## Overview

This document provides procedures for rolling back the discussion removal changes if critical issues are discovered.

## ⚠️ CRITICAL INFORMATION

**Rollback Window**: Optimal rollback is possible within 24-48 hours of deployment. After this window, rollback becomes increasingly difficult due to:
- New data created in production
- Database divergence from backup
- User expectations of new system

**Decision Point**: Determine if rollback is appropriate vs. fixing forward.

## Rollback Decision Matrix

| Time Since Deployment | Data Loss Risk | Recommended Action |
|-----------------------|----------------|-------------------|
| 0-2 hours | Minimal | Rollback acceptable |
| 2-24 hours | Low | Rollback if critical issues |
| 24-48 hours | Moderate | Fix forward preferred |
| 48+ hours | High | Fix forward only |

## Rollback Scenarios

### Scenario 1: Critical Functionality Broken

**Symptoms**:
- Application won't start
- Database migrations failed
- Search completely broken
- Unable to login

**Action**: IMMEDIATE ROLLBACK

### Scenario 2: Major Feature Issues

**Symptoms**:
- Podcasts not loading
- Course search broken
- Significant performance degradation
- Data integrity issues

**Action**: Rollback if within 24 hours, otherwise fix forward

### Scenario 3: Minor Issues

**Symptoms**:
- UI glitches
- Some search results missing
- Non-critical features affected

**Action**: Fix forward

## Pre-Rollback Checklist

Before initiating rollback:

- [ ] Severity assessment completed
- [ ] Stakeholders notified
- [ ] Team assembled
- [ ] Rollback plan reviewed
- [ ] Recent backup verified
- [ ] Impact analysis done
- [ ] Communication plan ready

## Phase 1: Immediate Response

### 1.1 Stop Further Changes

```bash
# Put site in maintenance mode
sudo systemctl stop nginx
# Or use your maintenance mode method

# Stop background workers
supervisorctl stop celery_worker
supervisorctl stop celery_beat

# Stop application servers
supervisorctl stop web
```

### 1.2 Assess Situation

**Questions to answer**:
1. What specifically is broken?
2. How many users are affected?
3. Is data being corrupted?
4. Can we fix forward quickly?
5. How much new data will be lost in rollback?

### 1.3 Notify Team

```bash
# Send alerts
# - Engineering team
# - Product team  
# - Support team
# - Management

# Document issue
# - Screenshot errors
# - Copy error logs
# - Note time of discovery
```

## Phase 2: Database Rollback

### 2.1 Verify Backup Available

```bash
# List available backups
ls -lh /backups/postgresql/

# Verify latest pre-migration backup
BACKUP_FILE="production-backup-YYYY-MM-DD-HHMMSS.sql"
ls -lh /backups/postgresql/$BACKUP_FILE

# Check backup is readable
head -n 100 /backups/postgresql/$BACKUP_FILE
```

### 2.2 Calculate Data Loss

```bash
# Check what will be lost
python manage.py shell

>>> from django.contrib.auth.models import User
>>> User.objects.filter(date_joined__gte='DEPLOYMENT_TIMESTAMP').count()
# New users since deployment

>>> from course_catalog.models import Podcast
>>> Podcast.objects.filter(created_on__gte='DEPLOYMENT_TIMESTAMP').count()
# New content since deployment
```

**Document**: What data will be lost in rollback

### 2.3 Export Recent Data (If Possible)

If time permits and database is accessible:

```bash
# Export data created since deployment
python manage.py dumpdata auth.User \
  --indent 2 \
  --pks $(python manage.py shell -c "from django.contrib.auth.models import User; print(','.join(str(u.id) for u in User.objects.filter(date_joined__gte='DEPLOYMENT_TIMESTAMP')))") \
  > recent_users.json

# Export other critical recent data
# This can potentially be re-imported after rollback
```

### 2.4 Perform Database Restore

```bash
# CRITICAL: This will delete ALL data since backup
# Including user registrations, content updates, etc.

# Backup current state first (if database is accessible)
pg_dump -h localhost -U postgres dbname > pre-rollback-backup-$(date +%Y%m%d-%H%M%S).sql

# Stop all database connections
supervisorctl stop all

# Restore from backup
psql -h localhost -U postgres dbname < /backups/postgresql/$BACKUP_FILE

# Verify restore
psql -h localhost -U postgres dbname -c "SELECT COUNT(*) FROM django_migrations WHERE app='channels';"
# Should show channels migrations exist (pre-removal state)
```

### 2.5 Verify Database State

```bash
python manage.py showmigrations

# Should show pre-removal migration state:
# channels
#  [X] 0001_initial
#  [X] 0002_...
#  ... (all old migrations present)

# discussions (if was present)
#  [X] 0001_initial
#  ...
```

## Phase 3: Code Rollback

### 3.1 Identify Rollback Point

```bash
# Find last good commit before removal
git log --oneline --graph

# Find the commit before removal started
# Usually tagged or noted in commit message
LAST_GOOD_COMMIT="abc123def"
```

### 3.2 Rollback Application Code

```bash
# Create rollback branch
git checkout -b rollback-discussions-$(date +%Y%m%d)

# Revert to last good state
git reset --hard $LAST_GOOD_COMMIT

# Or if removal was in feature branch that was merged
git revert -m 1 $MERGE_COMMIT_HASH

# Verify code state
git status
git diff main
```

### 3.3 Rollback Frontend

```bash
cd frontends/open-discussions

# Verify package.json is restored
cat package.json | grep "dependencies"

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Verify build successful
ls -la build/
```

### 3.4 Rollback Backend

```bash
# Verify requirements restored
cat pyproject.toml | grep praw

# Reinstall dependencies
poetry install

# Collect static files
python manage.py collectstatic --noinput

# Verify channels app present
python manage.py check
# Should not error about missing channels
```

## Phase 4: Service Restoration

### 4.1 Start Database

```bash
# Database should already be running from restore
# Verify connections work
psql -h localhost -U postgres dbname -c "SELECT 1;"
```

### 4.2 Run Any Necessary Migrations

```bash
# Unlikely to be needed, but check
python manage.py migrate

# Should show all migrations in sync with code
python manage.py showmigrations
```

### 4.3 Start Application

```bash
# Start web servers
supervisorctl start web

# Check logs
tail -f /var/log/open-discussions/web.log

# Verify no errors on startup
```

### 4.4 Start Background Workers

```bash
# Start Celery
supervisorctl start celery_worker
supervisorctl start celery_beat

# Check worker logs
tail -f /var/log/open-discussions/celery.log
```

### 4.5 Start Web Server

```bash
# Start nginx
sudo systemctl start nginx

# Verify site accessible
curl -I http://localhost/
# Should return 200 OK
```

## Phase 5: Verification

### 5.1 Smoke Test

```bash
#!/bin/bash
# File: rollback_smoke_test.sh

echo "Testing homepage..."
curl -f http://localhost/ || echo "FAIL: Homepage"

echo "Testing channel page..."
curl -f http://localhost/c/test_channel/ || echo "FAIL: Channel page"

echo "Testing search..."
curl -f http://localhost/api/v0/search/?q=test || echo "FAIL: Search"

echo "Testing channel API..."
curl -f http://localhost/api/v0/channels/ || echo "FAIL: Channel API"

echo "Testing podcasts (should still work)..."
curl -f http://localhost/api/v0/podcasts/ || echo "FAIL: Podcasts"
```

### 5.2 Functional Verification

Manual tests:
- [ ] Homepage loads
- [ ] Can login
- [ ] Channels visible
- [ ] Can view posts
- [ ] Can view comments
- [ ] Search works (all types)
- [ ] Podcasts work
- [ ] Courses work
- [ ] Admin accessible

### 5.3 Check Logs

```bash
# Check for errors
tail -100 /var/log/open-discussions/web.log | grep ERROR
tail -100 /var/log/open-discussions/celery.log | grep ERROR

# Check application logs
python manage.py shell -c "from django.db import connection; print(connection.queries[:10])"
```

## Phase 6: Data Recovery

### 6.1 Restore Recent Data (If Exported)

If you exported recent data before rollback:

```bash
# Load recent users
python manage.py loaddata recent_users.json

# Load other recent data
python manage.py loaddata recent_content.json

# Resolve any conflicts manually
```

### 6.2 Notify Affected Users

If data was lost:

```markdown
Subject: Service Restoration Notification

We experienced technical issues and had to restore from a backup.

Data affected:
- User registrations after [TIMESTAMP]
- Content updates after [TIMESTAMP]

We apologize for any inconvenience.

Please re-register if you signed up recently.
```

## Phase 7: Search Index Restoration

### 7.1 Rebuild Search Index

```bash
# Recreate indices for all content types (including posts/comments)
python manage.py recreate_index --all

# This will take time for large datasets
# Monitor progress
tail -f /var/log/open-discussions/celery.log | grep index
```

### 7.2 Verify Search

```bash
# Test all content types
curl "http://localhost/api/v0/search/?q=test&type=post"
curl "http://localhost/api/v0/search/?q=test&type=comment"
curl "http://localhost/api/v0/search/?q=test&type=podcast"
curl "http://localhost/api/v0/search/?q=test&type=course"

# All should return results
```

## Phase 8: Monitoring

### 8.1 Enable Enhanced Monitoring

```bash
# Increase log verbosity temporarily
# Update log level in settings
DEBUG = True  # Temporarily, for monitoring

# Monitor error rates
watch -n 5 'tail -100 /var/log/open-discussions/web.log | grep ERROR | wc -l'

# Monitor response times
# Use your monitoring tool (Datadog, New Relic, etc.)
```

### 8.2 Monitor User Activity

```bash
# Check user sessions
python manage.py shell

>>> from django.contrib.sessions.models import Session
>>> Session.objects.filter(expire_date__gte=timezone.now()).count()
# Should increase as users return

# Monitor errors in Sentry/error tracking
```

## Phase 9: Communication

### 9.1 Update Status Page

```markdown
[RESOLVED] System Maintenance

We have restored normal operations after experiencing technical issues.

All features should now be working as expected.

We apologize for any inconvenience.
```

### 9.2 Notify Stakeholders

Email to:
- Engineering team: Technical details
- Product team: User impact
- Support team: What to tell users
- Management: Business impact

### 9.3 Document Incident

Create incident report:

```markdown
# Incident Report - [Date]

## Summary
Attempted to remove discussion functionality but encountered critical issues requiring rollback.

## Timeline
- HH:MM - Deployment started
- HH:MM - Issues detected
- HH:MM - Rollback initiated
- HH:MM - Service restored

## Impact
- Downtime: X hours
- Users affected: Y
- Data lost: [details]

## Root Cause
[What went wrong]

## Resolution
[What was done to fix]

## Lessons Learned
[What we'll do differently]

## Action Items
- [ ] Fix issue that caused rollback
- [ ] Improve testing
- [ ] Update rollback procedures
```

## Phase 10: Post-Rollback Analysis

### 10.1 Determine Root Cause

**Questions**:
1. What specifically failed?
2. Why did testing not catch it?
3. Was the issue in code, database, or deployment?
4. Could this have been prevented?

### 10.2 Plan Fix Forward

Once system is stable:
1. Analyze what went wrong
2. Create fix for the issue
3. Test extensively
4. Plan new deployment
5. Consider partial rollout

### 10.3 Update Removal Plan

Based on rollback experience:
- Update testing procedures
- Add missing test cases
- Improve rollback procedures
- Document gotchas

## Partial Rollback Scenarios

### Scenario: Rollback Only Database

If code is fine but database migration failed:

```bash
# Restore database only
supervisorctl stop web celery_worker celery_beat
pg_dump ... # backup current
psql ... < backup.sql
supervisorctl start all
```

### Scenario: Rollback Only Code

If database is fine but code has issues:

```bash
# Keep database, rollback code
git revert ...
git push
# Deploy code only
```

## Prevention for Next Attempt

Before trying removal again:

- [ ] Fix issues that caused rollback
- [ ] Add tests for failure scenario
- [ ] Test rollback procedure
- [ ] Improve monitoring
- [ ] Add better error handling
- [ ] Consider gradual rollout
- [ ] Have longer testing period
- [ ] Get more stakeholder review

## Rollback Checklist

Complete rollback when:

- [ ] Database restored from backup
- [ ] Code reverted to last good state
- [ ] All services restarted
- [ ] Smoke tests pass
- [ ] Functional tests pass
- [ ] No errors in logs
- [ ] Monitoring shows normal metrics
- [ ] Users can access all features
- [ ] Search index rebuilt
- [ ] Stakeholders notified
- [ ] Incident documented
- [ ] Post-mortem scheduled

## Emergency Contacts

Document who to contact during rollback:

- **Technical Lead**: [Name] - [Phone]
- **Database Admin**: [Name] - [Phone]
- **DevOps**: [Name] - [Phone]
- **Product Manager**: [Name] - [Phone]
- **On-Call Engineer**: [Rotation number]

## Conclusion

This rollback plan provides procedures for safely reverting changes if issues arise. The key is quick detection and decisive action within the optimal rollback window.

**Remember**: The goal is not to avoid rollbacks, but to handle them smoothly when necessary.
