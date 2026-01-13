# Dependency Updates and Final Cleanup

## Overview

After removing the channels apps and migrating the database, this document covers final cleanup tasks and updates to dependent code.

## Phase 1: Update Remaining App Dependencies

### 1.1 Update Widgets App

**File**: `widgets/models.py`

**Check for**: References to channels

```python
# If WidgetList is referenced by Channel model
# Ensure no orphaned widget lists remain
```

**Action**:
```python
# Remove channel-specific widget functionality if it exists
# Keep general widget functionality for courses/podcasts
```

### 1.2 Update Course Catalog

**File**: `course_catalog/models.py`

**Verify**: No references to channels remain

```bash
grep -r "channels" course_catalog/ --include="*.py" | grep -v test
```

If any found, update or remove.

### 1.3 Update Interactions App

**File**: `interactions/` 

**Check**: What this app tracks

```bash
ls -la interactions/
cat interactions/models.py | head -50
```

**Action**: If it tracks interactions with posts/comments, update or simplify.

## Phase 2: Clean Up Imports

### 2.1 Find Remaining References

```bash
# Search for any lingering imports
grep -r "from channels" --include="*.py" . | grep -v ".venv" | grep -v migrations | grep -v "docs/"

grep -r "import channels" --include="*.py" . | grep -v ".venv" | grep -v migrations | grep -v "docs/"
```

### 2.2 Update or Remove Each Reference

For each file found:
1. Determine if it's critical
2. Either remove the import and dependent code
3. Or update to use alternative approach

### 2.3 Check for Lazy References

```bash
# Check for string-based references
grep -r "'channels\." --include="*.py" . | grep -v ".venv"
grep -r '"channels\.' --include="*.py" . | grep -v ".venv"
```

## Phase 3: Update Settings and Configuration

### 3.1 Clean Up Settings

**File**: `open_discussions/settings.py`

**Remove**:
```python
# Reddit-related settings
OPEN_DISCUSSIONS_REDDIT_URL = ...  # DELETE
OPEN_DISCUSSIONS_REDDIT_CLIENT_ID = ...  # DELETE
OPEN_DISCUSSIONS_REDDIT_SECRET = ...  # DELETE

# Akismet (if only for discussions)
AKISMET_API_KEY = ...  # DELETE
AKISMET_BLOG_URL = ...  # DELETE

# Any channel-specific feature flags
FEATURES = {
    # "CHANNELS_ENABLED": True,  # DELETE
}
```

### 3.2 Update Environment Variable Documentation

**File**: `.env.example`

**Remove**:
```bash
# OPEN_DISCUSSIONS_REDDIT_URL=
# OPEN_DISCUSSIONS_REDDIT_CLIENT_ID=
# OPEN_DISCUSSIONS_REDDIT_SECRET=
# AKISMET_API_KEY=
# AKISMET_BLOG_URL=
```

### 3.3 Update Docker Configuration

**Files**: `docker-compose.yml`, `Dockerfile`

**Remove**:
- Any Reddit service configurations
- Environment variables for Reddit
- Any discussion-specific services

## Phase 4: Update Celery Configuration

### 4.1 Verify Task Removal

**File**: `open_discussions/celery.py`

**Check**: Auto-discovery still works

```python
# Ensure this doesn't fail with missing apps
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)
```

### 4.2 Update Periodic Tasks

**File**: `open_discussions/settings_celery.py`

**Verify all discussion tasks removed**:
```python
CELERY_BEAT_SCHEDULE = {
    # Ensure no discussion-related tasks remain
    # Keep:
    "update-podcasts": {...},
    "update-courses": {...},
    # etc.
}
```

## Phase 5: Update Templates

### 5.1 Find Email Templates

```bash
find templates/ -name "*.html" -o -name "*.txt" | xargs grep -l "channel\|post\|comment" | grep -v discussion_removal
```

### 5.2 Update or Remove Templates

For each template:
- Remove if purely for discussions
- Update if it has mixed content
- Keep if for preserved features

**Common templates to check**:
- `templates/mail/` - Email templates
- `templates/notifications/` - Notification templates

### 5.3 Update Admin Templates

```bash
find templates/admin/ -name "*.html" | xargs grep -l "channel\|post\|comment"
```

Remove or update as needed.

## Phase 6: Update Static Files

### 6.1 Remove Discussion Images

```bash
# Check for channel/discussion-specific images
find static/ -name "*channel*" -o -name "*post*" -o -name "*comment*"

# Remove if no longer needed
```

### 6.2 Update CSS

```bash
# Find discussion-specific styles
grep -r "\.channel\|\.post\|\.comment" static/css/ --include="*.css"

# Remove unused styles
```

## Phase 7: Update Documentation

### 7.1 Update README.md

**File**: `README.md`

**Remove sections**:
- Reddit setup instructions
- Channel creation guides
- Discussion moderation documentation

**Update**:
- Feature list (remove discussions)
- Architecture diagrams
- Getting started guide

### 7.2 Update API Documentation

**Files**: `docs/api/` or OpenAPI/Swagger specs

**Remove**:
- `/api/v0/channels/` endpoints
- `/api/v0/posts/` endpoints
- `/api/v0/comments/` endpoints
- `/api/v0/frontpage/` endpoint

**Keep**:
- `/api/v0/search/` (updated)
- `/api/v0/podcasts/`
- `/api/v0/courses/`

### 7.3 Update Developer Documentation

**Files**: `docs/`

**Remove or archive**:
- Channel architecture docs
- Reddit integration docs
- Discussion API guides

## Phase 8: Update Permissions

### 8.1 Review Django Permissions

```bash
python manage.py shell

>>> from django.contrib.auth.models import Permission
>>> Permission.objects.filter(content_type__app_label='channels')
# Should return empty QuerySet after migration
```

### 8.2 Update Guardian Permissions

If using django-guardian for object-level permissions:

```python
# Clean up any orphaned permissions
from guardian.models import UserObjectPermission, GroupObjectPermission

# These should be auto-cleaned by CASCADE, but verify
UserObjectPermission.objects.filter(content_type__app_label='channels').delete()
GroupObjectPermission.objects.filter(content_type__app_label='channels').delete()
```

### 8.3 Update Permission Checks in Code

```bash
# Find permission checks
grep -r "can_.*channel\|can_.*post\|can_.*comment" --include="*.py" . | grep -v ".venv"

# Update or remove as needed
```

## Phase 9: Update Logging and Monitoring

### 9.1 Update Logging Configuration

**File**: `open_discussions/settings.py`

**Remove**:
```python
LOGGING = {
    'loggers': {
        # 'channels.api': {...},  # DELETE if exists
        # 'channels.tasks': {...},  # DELETE if exists
    }
}
```

### 9.2 Update Monitoring Dashboards

If you have monitoring (Datadog, New Relic, etc.):
- Remove discussion-related metrics
- Remove channel API endpoint monitors
- Update alert thresholds
- Archive historical discussion metrics

### 9.3 Update Error Tracking

In Sentry or similar:
- Update project settings
- Remove discussion-related error grouping
- Archive old discussion errors

## Phase 10: Update External Integrations

### 10.1 Update API Clients

If external services consume your API:
- Notify them of endpoint removal
- Provide migration timeline
- Update API client libraries

### 10.2 Update Webhooks

If webhooks send discussion events:
- Remove webhook endpoints
- Update webhook configurations
- Notify webhook consumers

## Phase 11: Clean Up Test Infrastructure

### 11.1 Update Test Settings

**File**: `conftest.py`

**Remove**:
```python
# Discussion-related fixtures
# @pytest.fixture
# def reddit_factories(...):
#     ...
```

### 11.2 Update Test Fixtures

**File**: `fixtures/`

**Remove**:
```bash
rm fixtures/reddit.py
```

**Update**: `fixtures/common.py` to remove Reddit mocking

### 11.3 Update Test Data

```bash
# Remove discussion test data
find . -name "test_data" -type d | xargs grep -r "channel\|post\|comment"
```

### 11.4 Update CI/CD Pipeline

**Files**: `.github/workflows/`, `.gitlab-ci.yml`, etc.

**Update**:
- Remove discussion-specific test jobs
- Update test coverage thresholds
- Remove Reddit service containers
- Update environment variables

## Phase 12: Verify Search Still Works

### 12.1 Test Search API

```bash
# Test search for preserved types
curl "http://localhost:8000/api/v0/search/?q=test&type=podcast"
curl "http://localhost:8000/api/v0/search/?q=test&type=course"
curl "http://localhost:8000/api/v0/search/?q=test&type=video"

# Verify no errors for removed types
curl "http://localhost:8000/api/v0/search/?q=test&type=post"
# Should return empty or error gracefully
```

### 12.2 Rebuild Search Index

```bash
# Recreate indices for preserved content
python manage.py recreate_index

# Verify index health
python manage.py search_index stats
```

### 12.3 Test Search UI

- Search for podcasts ✓
- Search for courses ✓
- Search for videos ✓
- Verify filters work ✓
- Verify sorting works ✓

## Phase 13: Performance Optimization

### 13.1 Database Query Optimization

With discussions removed, optimize remaining queries:

```bash
# Check slow queries
python manage.py shell

>>> from django.db import connection
>>> from django.test.utils import override_settings
>>> # Run typical operations and check query count
```

### 13.2 Remove Unused Database Indices

```sql
-- Find indices on removed tables (already gone)
-- Add new indices for preserved features if needed

-- Example: Index podcast searches
CREATE INDEX idx_podcast_title ON course_catalog_podcast(title);
```

### 13.3 Update Caching

```python
# Remove discussion-related cache keys
# Update cache invalidation logic
# Optimize cache for preserved features
```

## Phase 14: Update Analytics

### 14.1 Update Analytics Tracking

Remove tracking for:
- Channel views
- Post views/interactions
- Comment interactions
- Discussion creation

Keep tracking for:
- Search queries
- Podcast views
- Course views
- User sessions

### 14.2 Update Analytics Dashboards

- Archive discussion metrics
- Create new dashboards for preserved features
- Update KPIs and goals

## Phase 15: Security Audit

### 15.1 Review Exposed Endpoints

```bash
# List all URL patterns
python manage.py show_urls

# Verify no discussion endpoints exposed
```

### 15.2 Update Security Policies

- Remove channel-specific security rules
- Update CORS settings if needed
- Review rate limiting rules
- Update CSP headers

### 15.3 Update OAuth/API Keys

- Revoke Reddit API credentials
- Remove from secrets management
- Update API documentation

## Final Verification Checklist

Before considering removal complete:

### Code Quality
- [ ] No references to removed apps in code
- [ ] All imports resolve correctly
- [ ] No deprecated code warnings
- [ ] Code coverage acceptable for preserved features

### Functionality
- [ ] Search works for all preserved types
- [ ] Podcasts browsable and viewable
- [ ] Courses browsable and viewable
- [ ] User profiles work
- [ ] Authentication works
- [ ] Admin interface functional

### Database
- [ ] All migrations applied
- [ ] No orphaned tables
- [ ] No orphaned data
- [ ] Database optimized
- [ ] Backups current

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] End-to-end tests pass
- [ ] Performance tests acceptable

### Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] Developer docs updated
- [ ] Deployment docs updated

### Operations
- [ ] Monitoring updated
- [ ] Logging cleaned up
- [ ] Alerts updated
- [ ] Runbooks updated

### External
- [ ] API consumers notified
- [ ] Users notified
- [ ] Stakeholders updated
- [ ] Marketing materials updated

## Maintenance Tasks

### Weekly (First Month)
- Monitor error logs
- Check search functionality
- Review user feedback
- Monitor performance metrics

### Monthly (First Quarter)
- Review analytics
- Audit database size
- Check for issues
- Update documentation as needed

## Next Steps

Proceed to [06-verification-plan.md](./06-verification-plan.md) for comprehensive testing procedures.
