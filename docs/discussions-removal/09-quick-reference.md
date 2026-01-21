# Quick Reference Guide

## Overview

Quick reference for the discussion removal process. For detailed instructions, see the individual plan documents.

## Directory Structure

```
docs/discussions-removal/
├── README.md                    # Main overview and strategy
├── 01-scope-analysis.md        # What to remove (files, models, etc.)
├── 02-frontend-removal.md      # React/JS removal steps
├── 03-backend-removal.md       # Django/Python removal steps
├── 04-database-migration.md    # Database cleanup procedures
├── 05-dependency-updates.md    # Final cleanup and updates
├── 06-verification-plan.md     # Testing procedures
├── 07-rollback-plan.md         # Emergency rollback procedures
├── 08-ai-agent-guide.md        # Instructions for AI coding tools
└── 09-quick-reference.md       # This file
```

## Execution Order

**DO IN THIS ORDER**:

1. ✅ Frontend Removal (02-frontend-removal.md)
2. ✅ Backend Removal (03-backend-removal.md)  
3. ✅ Database Migration (04-database-migration.md)
4. ✅ Dependency Updates (05-dependency-updates.md)
5. ✅ Verification (06-verification-plan.md)

## Critical Path Items

### Before Starting

```bash
# 1. Backup database
pg_dump dbname > backup-$(date +%Y%m%d).sql

# 2. Create branch
git checkout -b remove-discussions

# 3. Verify dev environment
python manage.py check
npm run build
```

### During Execution

**MUST DO IN ORDER**:

1. Update `search/` imports BEFORE deleting `channels/`
2. Remove FK references BEFORE deleting models
3. Test after each phase
4. Commit after each phase

### After Completion

```bash
# 1. Run all tests
pytest && npm test

# 2. Manual smoke test
# - Search works
# - Podcasts work
# - Courses work

# 3. Deploy to staging
# 4. Full regression test
# 5. Production deployment
```

## Files to Remove

### Frontend (~100 files)
```bash
# Pages
frontends/open-discussions/src/pages/Channel*
frontends/open-discussions/src/pages/admin/*Channel*

# Components  
frontends/open-discussions/src/components/Channel*
frontends/open-discussions/src/components/Post*
frontends/open-discussions/src/components/Comment*

# State
frontends/open-discussions/src/reducers/{channels,posts,comments}*
frontends/open-discussions/src/actions/{channel,post,comment}*

# API
frontends/open-discussions/src/lib/api/{channels,posts,comments}*
```

### Backend (~50 files)
```bash
# Apps
channels/
channels_fields/
discussions/  # Verify not in use first

# Fixtures
fixtures/reddit.py
```

## Files to Modify

### Frontend
```javascript
// reducers/index.js - Remove channels, posts, comments
// actions/index.js - Remove discussion exports
// pages/App.js - Remove discussion routes
// pages/HomePage.js - Remove discussion feed
```

### Backend
```python
# search/constants.py - Add local POST_TYPE, COMMENT_TYPE
# search/serializers.py - Remove post/comment serializers
# search/search_index_helpers.py - Remove post/comment functions
# search/api.py - Remove channel filtering
# search/tasks.py - Remove post/comment tasks

# profiles/views.py - Remove post/comment display
# notifications/notifiers/ - Delete comments.py

# open_discussions/urls.py - Remove discussion URLs
# open_discussions/settings.py - Remove from INSTALLED_APPS
# open_discussions/settings_celery.py - Remove discussion tasks
```

## Models to Delete

```python
# channels/models.py
- RedditRefreshToken
- RedditAccessToken
- Subscription
- Channel
- ChannelInvitation
- LinkMeta
- Post
- Article
- Comment
- ChannelSubscription
- ChannelGroupRole
- ChannelMembershipConfig
- SpamCheckResult
```

## Python Dependencies to Remove

```toml
# pyproject.toml
praw = "..."       # DELETE
prawcore = "..."   # DELETE
base36 = "..."     # DELETE
akismet = "..."    # DELETE (if only for discussions)
```

## URLs to Remove

```python
# All these should 404 after removal:
/c/:channel_name
/c/:channel_name/:post_id/:slug
/create_post
/manage/c/...
/api/v0/channels/
/api/v0/posts/
/api/v0/comments/
```

## URLs to Preserve

```python
# These MUST still work:
/
/search/
/podcasts/
/courses/
/profile/:username
/api/v0/search/
/api/v0/podcasts/
/api/v0/courses/
```

## Test Commands

```bash
# Backend
python manage.py check
python manage.py migrate --plan
pytest

# Frontend
npm run build
npm test
npm run lint

# Manual
curl http://localhost:8000/api/v0/search/?q=test
curl http://localhost:8000/api/v0/podcasts/
curl http://localhost:8000/api/v0/courses/
```

## Environment Variables to Remove

```bash
OPEN_DISCUSSIONS_REDDIT_URL
OPEN_DISCUSSIONS_REDDIT_CLIENT_ID
OPEN_DISCUSSIONS_REDDIT_SECRET
AKISMET_API_KEY
AKISMET_BLOG_URL
```

## Django Settings Changes

```python
# settings.py

# REMOVE from INSTALLED_APPS:
'channels',
'channels_fields',
'discussions',  # if not in use

# REMOVE from MIDDLEWARE:
'open_discussions.middleware.channel_api.ChannelApiMiddleware',

# settings_celery.py

# REMOVE from CELERY_BEAT_SCHEDULE:
'update-discussions',
'update-discussion-channels',
'update-discussion-posts',
# ... all discussion tasks
```

## Migration Commands

```bash
# Create migrations
python manage.py makemigrations channels --empty --name delete_all_tables

# Preview SQL
python manage.py sqlmigrate channels XXXX

# Apply
python manage.py migrate

# Verify
python manage.py dbshell
\dt channels_*  # Should show nothing
```

## Search Index Cleanup

```python
# Create command: search/management/commands/cleanup_discussion_search.py
from search.api import remove_all_objects_from_index
from search.constants import POST_TYPE, COMMENT_TYPE

remove_all_objects_from_index(POST_TYPE)
remove_all_objects_from_index(COMMENT_TYPE)
```

## Common Errors and Fixes

### ImportError: No module named 'channels'

**Fix**: Update search/ imports BEFORE deleting channels/

```python
# search/constants.py
# Add at top:
POST_TYPE = "post"
COMMENT_TYPE = "comment"

# Then remove:
from channels.constants import POST_TYPE, COMMENT_TYPE
```

### Migration Error: Table doesn't exist

**Fix**: Check migration order. FK references must be removed first.

### Frontend Build Error: Cannot find module

**Fix**: Update reducers/index.js and actions/index.js to remove deleted modules

### Tests Failing

**Fix**: Remove test files for deleted functionality, update imports in remaining tests

## Rollback Quick Steps

```bash
# If things go wrong:
git reset --hard origin/main

# Or restore database:
psql dbname < backup-YYYYMMDD.sql

# See 07-rollback-plan.md for details
```

## Success Indicators

✅ `python manage.py check` passes
✅ `npm run build` succeeds
✅ All tests pass
✅ Search works (podcasts, courses)
✅ Podcasts browsable
✅ Courses browsable
✅ No errors in logs
✅ Removed URLs return 404

## Time Estimates

- Frontend: 8-12 hours
- Backend: 12-16 hours
- Database: 4-6 hours  
- Testing: 8-12 hours
- **Total**: 32-46 hours (4-6 days)

## Team Roles

- **Developer**: Execute removal steps
- **QA**: Verify testing checklist
- **DevOps**: Handle deployment, backups
- **Product**: Communicate with stakeholders
- **DBA**: Handle database migration/rollback

## Support Resources

- Detailed plans in docs/discussions-removal/
- Original codebase structure in 01-scope-analysis.md
- AI agent instructions in 08-ai-agent-guide.md
- Rollback procedures in 07-rollback-plan.md

## Emergency Contacts

Document for your team:
- Technical Lead: [Name/Contact]
- Database Admin: [Name/Contact]
- DevOps: [Name/Contact]
- On-Call: [Contact]

## Decision Points

**When to rollback**:
- Application won't start
- Critical features broken
- Data corruption
- Within 24-48 hours of deployment

**When to fix forward**:
- Minor UI issues
- Non-critical bugs
- After 48 hours deployed
- Issues easily fixable

## Key Principles

1. **Test at every step**
2. **Commit after each phase**
3. **Preserve over remove** (when uncertain)
4. **Document everything**
5. **Backup before migration**

## Final Checklist

Before production:

- [ ] All tests pass
- [ ] Staging tested
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Team notified
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Stakeholders informed

## Getting Help

1. Review detailed plan documents
2. Check 01-scope-analysis.md for what's being removed
3. Consult 07-rollback-plan.md if issues arise
4. Use 08-ai-agent-guide.md for automated execution

## Post-Completion

- [ ] Archive discussion data
- [ ] Update monitoring dashboards
- [ ] Update API documentation
- [ ] Notify external API consumers
- [ ] Remove Reddit credentials
- [ ] Update README.md
- [ ] Celebrate! 🎉
