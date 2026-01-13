# AI Agent Execution Guide

## Overview

This document provides a structured guide for AI coding agents (like Cursor, GitHub Copilot Workspace, Aider, etc.) to execute the discussion removal plan.

## Target Audience

This guide is written for:
- Agentic AI coding tools (Cursor Agent, GitHub Copilot Workspace, etc.)
- Autonomous code modification systems
- AI-assisted development workflows

## Pre-Execution Requirements

### Environment Setup
```bash
# Required tools
- Python 3.11+
- Node.js 18+
- PostgreSQL 13+
- Git

# Verify environment
python --version
node --version
git --version
```

### Branch Strategy
```bash
# Create feature branch
git checkout -b feature/remove-discussions-YYYYMMDD
git push -u origin feature/remove-discussions-YYYYMMDD
```

## Execution Phases

### Phase 1: Frontend Removal (Estimated: 2-3 hours)

**Objective**: Remove all React components, pages, and state management for discussions

**Commands**:
```bash
cd frontends/open-discussions

# Remove files as specified in 02-frontend-removal.md
# Use find/rm commands or file deletion APIs

# Examples:
rm -rf src/pages/ChannelAboutPage.js
rm -rf src/pages/ChannelRouter.js
rm -rf src/components/Channel*.js
rm -rf src/components/Post*.js
rm -rf src/components/Comment*.js
rm -rf src/reducers/channels.js
rm -rf src/reducers/posts.js
rm -rf src/reducers/comments.js
rm -rf src/actions/channel.js
rm -rf src/actions/post.js
rm -rf src/actions/comment.js
rm -rf src/lib/api/channels.js
rm -rf src/lib/api/posts.js
rm -rf src/lib/api/comments.js
```

**Files to Modify**:
```javascript
// src/reducers/index.js
// REMOVE: channels, posts, comments from combineReducers

// src/actions/index.js  
// REMOVE: exports for removed actions

// src/pages/App.js
// REMOVE: routes for /c/:channel, /create_post, /manage/c/*

// src/pages/HomePage.js
// MODIFY: Remove discussion feed, keep search/podcasts

// src/components/Markdown.js
// REMOVE: import from reddit_objects
```

**Verification**:
```bash
npm install
npm run build
npm test
```

**Commit**:
```bash
git add .
git commit -m "feat: remove discussion frontend components"
```

### Phase 2: Backend API Removal (Estimated: 3-4 hours)

**Objective**: Remove Django views, URLs, and API endpoints

**Commands**:
```bash
# Update dependent apps first (CRITICAL ORDER)

# 1. Update search/constants.py
# Add local POST_TYPE, COMMENT_TYPE definitions
# Remove from VALID_OBJECT_TYPES
# Remove CONTENT_OBJECT_TYPE

# 2. Update search/serializers.py
# Remove OSPostSerializer, OSCommentSerializer
# Remove channels imports

# 3. Update search/search_index_helpers.py
# Remove post/comment serialization functions

# 4. Update search/api.py
# Remove channel filtering

# 5. Update search/tasks.py
# Remove post/comment indexing tasks

# 6. Update notifications/notifiers/
rm notifications/notifiers/comments.py

# 7. Update profiles/views.py
# Remove post/comment display
# Remove channels imports

# 8. Update mail/ templates
# Remove discussion email templates
```

**URL Updates**:
```python
# open_discussions/urls.py
# REMOVE:
# - include("channels.urls")
# - include("channels_fields.urls")  
# - All /c/ routes
# - All /create_post routes
# - All /manage/c/ routes

# Remove view functions:
# - channel_post
# - channel_redirect
```

**Settings Updates**:
```python
# open_discussions/settings.py
# INSTALLED_APPS - REMOVE:
# - 'channels'
# - 'channels_fields'
# - 'discussions' (verify not in use)

# MIDDLEWARE - REMOVE:
# - 'open_discussions.middleware.channel_api.ChannelApiMiddleware'

# open_discussions/settings_celery.py
# CELERY_BEAT_SCHEDULE - REMOVE:
# - All discussion update tasks
# - Spam check tasks
# - Subscription email tasks
```

**Verification**:
```bash
python manage.py check
python manage.py check --deploy
```

**Commit**:
```bash
git add .
git commit -m "feat: remove discussion API endpoints and URLs"
```

### Phase 3: Remove Django Apps (Estimated: 1 hour)

**Objective**: Delete channels, discussions, channels_fields apps

**Commands**:
```bash
# Remove entire app directories
rm -rf channels/
rm -rf channels_fields/
rm -rf discussions/  # Verify not in use first
rm -rf embedly/  # If only used for discussions

# Remove fixtures
rm fixtures/reddit.py

# Update fixtures/common.py
# Remove mock_reddit_object_indexer
```

**Dependency Cleanup**:
```bash
# pyproject.toml - REMOVE:
# - praw
# - prawcore
# - base36
# - akismet (if only for discussions)

poetry lock
poetry install
```

**Verification**:
```bash
python manage.py check
pytest --collect-only  # See what tests remain
```

**Commit**:
```bash
git add .
git commit -m "feat: remove channels, discussions, channels_fields apps"
```

### Phase 4: Database Migrations (Estimated: 2-3 hours)

**Objective**: Create and test migrations to remove database tables

⚠️ **CRITICAL**: Test extensively in development before production

**Create Migrations**:
```bash
# For any apps with FK to channels, remove those fields first
python manage.py makemigrations profiles --empty --name remove_channel_refs

# Create deletion migration for channels
python manage.py makemigrations channels --empty --name delete_all_tables

# Edit migration file:
# operations = [
#     migrations.DeleteModel(name='SpamCheckResult'),
#     migrations.DeleteModel(name='Article'),
#     migrations.DeleteModel(name='Comment'),
#     migrations.DeleteModel(name='ChannelMembershipConfig'),
#     migrations.DeleteModel(name='ChannelGroupRole'),
#     migrations.DeleteModel(name='ChannelSubscription'),
#     migrations.DeleteModel(name='Post'),
#     migrations.DeleteModel(name='LinkMeta'),
#     migrations.DeleteModel(name='ChannelInvitation'),
#     migrations.DeleteModel(name='Channel'),
#     migrations.DeleteModel(name='Subscription'),
#     migrations.DeleteModel(name='RedditAccessToken'),
#     migrations.DeleteModel(name='RedditRefreshToken'),
# ]
```

**Test Migrations**:
```bash
# Preview SQL
python manage.py sqlmigrate channels XXXX_delete_all_tables

# Apply in dev
python manage.py migrate

# Verify
python manage.py dbshell
# Run: \dt channels_*
# Should show no results
```

**Verification**:
```bash
python manage.py runserver
# Test preserved features work
```

**Commit**:
```bash
git add .
git commit -m "feat: create migrations to remove discussion tables"
```

### Phase 5: Cleanup and Testing (Estimated: 3-4 hours)

**Objective**: Remove remaining references and test everything

**Search Cleanup**:
```python
# Create management command to clean search index
# File: search/management/commands/cleanup_discussion_search.py

from django.core.management.base import BaseCommand
from search.api import remove_all_objects_from_index
from search.constants import POST_TYPE, COMMENT_TYPE

class Command(BaseCommand):
    def handle(self, *args, **options):
        remove_all_objects_from_index(POST_TYPE)
        remove_all_objects_from_index(COMMENT_TYPE)
        self.stdout.write("Discussion content removed from search index")
```

**Run**:
```bash
python manage.py cleanup_discussion_search
```

**Find Remaining References**:
```bash
# Search for imports
grep -r "from channels" --include="*.py" . | grep -v ".venv" | grep -v migrations | grep -v docs/

# Search for string references  
grep -r "'channels\." --include="*.py" . | grep -v ".venv"
grep -r '"channels\.' --include="*.py" . | grep -v ".venv"

# Fix each reference found
```

**Update Documentation**:
```bash
# README.md - Remove Reddit setup section
# docs/ - Remove discussion documentation
# Keep this removal documentation
```

**Run Tests**:
```bash
# Backend tests
pytest search/ course_catalog/ profiles/ authentication/

# Frontend tests
cd frontends/open-discussions
npm test

# Integration tests
pytest -m integration
```

**Commit**:
```bash
git add .
git commit -m "feat: final cleanup and documentation updates"
```

### Phase 6: Verification (Estimated: 2-3 hours)

**Objective**: Comprehensive testing of preserved features

**Automated Tests**:
```bash
# Full test suite
pytest

# Frontend tests
cd frontends/open-discussions
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

**Manual Testing Checklist**:
```
- [ ] Homepage loads
- [ ] Search works (podcasts, courses, videos)
- [ ] Search filters work  
- [ ] Podcast browsing works
- [ ] Podcast playback works
- [ ] Course browsing works
- [ ] User profiles work (no post/comment sections)
- [ ] User authentication works
- [ ] Admin panel accessible
- [ ] Admin shows no discussion sections
- [ ] No console errors
- [ ] No 404s for preserved pages
- [ ] Removed URLs return 404
```

**Performance Testing**:
```bash
# Page load times
lighthouse http://localhost:8000/ --view
lighthouse http://localhost:8000/podcasts/ --view

# API response times
ab -n 100 -c 10 http://localhost:8000/api/v0/search/?q=test
```

**Commit**:
```bash
git add .
git commit -m "test: verify all preserved features working"
```

## AI Agent Specific Instructions

### For Cursor/Copilot Workspace

**Use these prompts at each phase**:

1. **Frontend Removal**:
   ```
   Remove all discussion-related frontend code including:
   - Pages: ChannelAboutPage, ChannelRouter, PostDetailSidebar, and all admin/Channel*.js
   - Components: All Channel*, Post*, Comment* components
   - State: All discussion reducers and actions
   - API: channels.js, posts.js, comments.js
   Update imports and routes. Preserve search, podcast, and course functionality.
   ```

2. **Backend Removal**:
   ```
   Update Django backend to remove discussion dependencies:
   - Update search/ to remove POST_TYPE, COMMENT_TYPE handling
   - Remove notifications/notifiers/comments.py
   - Update profiles/ to remove post/comment display
   - Remove channels URLs from open_discussions/urls.py
   - Remove 'channels', 'channels_fields' from INSTALLED_APPS
   - Remove discussion Celery tasks from settings_celery.py
   Preserve search, podcasts, courses functionality.
   ```

3. **App Deletion**:
   ```
   Delete Django apps:
   - rm -rf channels/
   - rm -rf channels_fields/  
   - rm -rf discussions/ (verify not in use)
   Remove from pyproject.toml: praw, prawcore, base36, akismet
   Run poetry lock && poetry install
   ```

4. **Migrations**:
   ```
   Create Django migrations to remove discussion database tables:
   1. Create migration to remove FK references to channels
   2. Create channels migration to DeleteModel for all models
   3. Test with python manage.py sqlmigrate
   4. Apply with python manage.py migrate
   5. Verify tables removed with \dt channels_* in dbshell
   ```

5. **Verification**:
   ```
   Test preserved functionality:
   - Run pytest for backend
   - Run npm test for frontend
   - Manual test: search, podcasts, courses
   - Verify no errors in console/logs
   - Verify removed URLs 404
   - Check admin panel has no discussion sections
   ```

### For Aider

**Use sequential commands**:

```bash
# Phase 1
aider --yes --message "Remove all discussion frontend components from frontends/open-discussions/src. Delete pages/Channel*, components/Channel*, components/Post*, components/Comment*, reducers/channels.js, reducers/posts.js, reducers/comments.js, actions/channel.js, actions/post.js, actions/comment.js, lib/api/channels.js, lib/api/posts.js, lib/api/comments.js. Update reducers/index.js and actions/index.js to remove these. Update pages/App.js to remove discussion routes."

# Phase 2  
aider --yes --message "Update Django backend. In search/constants.py add local POST_TYPE and COMMENT_TYPE definitions, remove from VALID_OBJECT_TYPES. In search/serializers.py remove OSPostSerializer and OSCommentSerializer. Remove discussion URL patterns from open_discussions/urls.py. Remove 'channels', 'channels_fields' from INSTALLED_APPS in settings.py."

# Phase 3
aider --yes --message "Delete channels/, channels_fields/, discussions/ directories. Remove praw, prawcore, base36, akismet from pyproject.toml."

# Phase 4
aider --yes --message "Create Django migration in channels app to delete all models: RedditRefreshToken, RedditAccessToken, Subscription, Channel, ChannelInvitation, LinkMeta, Post, Article, Comment, ChannelSubscription, ChannelGroupRole, ChannelMembershipConfig, SpamCheckResult."

# Phase 5
aider --yes --message "Find and remove all remaining references to 'from channels' in Python files. Update README.md to remove Reddit setup instructions."
```

### For GitHub Copilot Workspace

**Create issue with this plan**:

```markdown
Title: Remove Reddit-backed discussion functionality

Description:
Remove channels, posts, and comments backed by Reddit while preserving search and podcast features.

Tasks:
- [ ] Remove discussion frontend (pages, components, state)
- [ ] Remove discussion backend (views, URLs, APIs)
- [ ] Delete channels, channels_fields, discussions apps
- [ ] Create database migrations to remove tables
- [ ] Clean up remaining references
- [ ] Update documentation
- [ ] Test preserved features (search, podcasts, courses)

See docs/discussions-removal/ for detailed plan.
```

## Verification Commands

After AI execution, run these to verify:

```bash
# Build checks
python manage.py check --deploy
cd frontends/open-discussions && npm run build

# Test checks
pytest
cd frontends/open-discussions && npm test

# Import checks
python -c "import search; import course_catalog; import profiles"

# Database checks
python manage.py showmigrations | grep channels
# Should show no channels app or all migrations deleted

# File checks
ls channels/ 2>/dev/null && echo "ERROR: channels still exists" || echo "OK: channels removed"
ls channels_fields/ 2>/dev/null && echo "ERROR: channels_fields exists" || echo "OK: channels_fields removed"

# Import scan
grep -r "from channels" --include="*.py" . | grep -v ".venv" | grep -v migrations | grep -v docs/
# Should return nothing
```

## Common Pitfalls for AI Agents

1. **Import Order**: Update search/ BEFORE deleting channels/
2. **Migration Order**: Delete FK references BEFORE deleting models
3. **Circular Dependencies**: Break by removing imports, then deleting files
4. **Test Files**: Delete test files when deleting main files
5. **Settings**: Update INSTALLED_APPS and MIDDLEWARE together
6. **Frontend State**: Remove from reducers/index.js when deleting reducers

## Success Criteria

The AI agent has successfully completed the task when:

✅ Application builds without errors
✅ All tests pass (preserved features)
✅ Search works for podcasts/courses/videos
✅ Podcast pages work
✅ Course pages work  
✅ User profiles work
✅ No discussion-related code in codebase
✅ No channels tables in database
✅ Documentation updated

## Rollback for AI Agents

If issues arise:

```bash
# Reset to start
git reset --hard origin/main

# Or revert specific changes
git revert <commit-hash>
git push
```

## Verification Process

### Code Quality Checks

After making changes, verify code quality with these checks:

```bash
# Python code formatting
docker-compose exec web poetry run black --check .

# Python linting
docker-compose exec web poetry run pylint ./**/*.py

# JavaScript/TypeScript formatting
yarn run fmt-check

# JavaScript/TypeScript linting
yarn run lint-check
```

### Expected Results

**Pylint**:
- Score: ≥9.5/10
- All errors in production code must be resolved
- Test file errors for deprecated functionality are acceptable
- Common issues to fix:
  - Unused imports (W0611)
  - Missing constructor parameters (E1120)
  - Undefined variables (E0602)
  - Import errors for removed modules (E0401, E0611)

**Black**:
- All files must pass formatting check
- Run `black .` to auto-format if needed

**ESLint/Prettier**:
- No errors in production code
- Follow project style guidelines

### CI Workflow Validation

Before pushing, verify the GitHub Actions workflow will pass:

```bash
# Check .github/workflows/ci.yml for required steps

# Python tests workflow:
# 1. Code formatting (black)
# 2. Linting (pylint) 
# 3. Unit tests
# 4. Coverage report

# JavaScript tests workflow:
# 1. Webpack build
# 2. Linting
# 3. Code formatting
# 4. SCSS lint
# 5. TypeScript check
# 6. Unit tests
```

### Manual Testing Checklist

After code changes:

- [ ] Application starts without errors
- [ ] Home page loads correctly
- [ ] Course catalog search works
- [ ] User profiles accessible
- [ ] No console errors in browser
- [ ] No 500 errors in Django logs
- [ ] Database migrations apply cleanly
- [ ] No broken links in navigation

### Common Issues and Resolutions

**Issue**: Pylint errors for missing imports
- **Solution**: Remove import statements for deleted modules

**Issue**: Pylint errors for undefined variables
- **Solution**: Remove or stub functions that reference deleted models

**Issue**: Constructor parameter mismatches
- **Solution**: Update `__init__` methods to match parent class signatures

**Issue**: Black formatting failures
- **Solution**: Run `poetry run black .` to auto-format

**Issue**: Test failures for discussion features
- **Solution**: Acceptable if tests are for deprecated functionality. Otherwise, update tests to remove discussion references.

## Support

For complex decisions, AI agents should:
1. Flag for human review
2. Document decision in commit message
3. Create GitHub issue for discussion
4. Follow principle: "Preserve over remove" when uncertain

## Completion Report

AI agent should generate a report:

```markdown
# Discussion Removal Completion Report

## Summary
- Files deleted: X
- Files modified: Y
- Lines removed: Z
- Tests passing: W/W

## Commits
- Commit 1: [hash] - Frontend removal
- Commit 2: [hash] - Backend removal
- Commit 3: [hash] - App deletion
- Commit 4: [hash] - Migrations
- Commit 5: [hash] - Cleanup

## Verification
- [x] Builds successfully
- [x] Tests pass
- [x] Pylint score ≥9.5/10
- [x] Black formatting passes
- [x] Manual testing complete
- [x] Documentation updated

## Issues Encountered
[Any issues that required human intervention]

## Next Steps
- Deploy to staging for testing
- Run full regression test
- Plan production deployment
```
