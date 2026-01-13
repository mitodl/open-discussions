# Backend Removal Plan

## Overview

This document provides step-by-step instructions for removing discussion-related backend code from the Django application.

## Prerequisites

1. Frontend removal completed (or on separate branch)
2. Create git branch: `git checkout -b remove-discussions-backend`
3. Database backup created
4. Local development environment running

## Phase 1: Update Dependent Apps First

Before removing the channels app entirely, update apps that depend on it.

### 1.1 Update Search App

**File**: `search/constants.py`

**Changes**:
```python
# REMOVE this import
from channels.constants import COMMENT_TYPE, POST_TYPE

# ADD local definitions (to maintain backwards compatibility with existing indices)
POST_TYPE = "post"  # Keep constant for cleanup, mark as deprecated
COMMENT_TYPE = "comment"  # Keep constant for cleanup, mark as deprecated

# In VALID_OBJECT_TYPES, REMOVE:
# POST_TYPE,
# COMMENT_TYPE,

VALID_OBJECT_TYPES = (
    PROFILE_TYPE,
    COURSE_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
    STAFF_LIST_TYPE,
    VIDEO_TYPE,
    PODCAST_TYPE,
    PODCAST_EPISODE_TYPE,
)

# In MAPPING, REMOVE:
# POST_TYPE: {...},
# COMMENT_TYPE: {...},

# REMOVE CONTENT_OBJECT_TYPE definition entirely
```

**File**: `search/serializers.py`

**Changes**:
```python
# REMOVE these imports
from channels.constants import COMMENT_TYPE, POST_TYPE
from channels.models import Comment, Post

# REMOVE these serializers
# class OSPostSerializer(...)
# class OSCommentSerializer(...)
```

**File**: `search/search_index_helpers.py`

**Changes**:
```python
# REMOVE these imports
from channels.constants import COMMENT_TYPE, POST_TYPE, VoteActions
from channels.models import Comment
from channels.utils import render_article_text

# REMOVE these functions
# def serialize_post_for_bulk(...)
# def serialize_comment_for_bulk(...)
# def gen_post_id(...)
# def gen_comment_id(...)
# def update_post_text(...)
# def update_comment_text(...)
# Any reddit_object_* functions
```

**File**: `search/api.py`

**Changes**:
```python
# REMOVE these imports
from channels.constants import (...)  # All channel-related imports
from channels.models import ChannelGroupRole

# In search filter logic, REMOVE:
# - Channel membership filtering
# - Channel type filtering
# - Any channel-related query modifications
```

**File**: `search/tasks.py`

**Changes**:
```python
# REMOVE these imports
from channels.constants import COMMENT_TYPE, LINK_TYPE_LINK, POST_TYPE
from channels.models import Comment, Post

# REMOVE these tasks
# @app.task def index_posts(...)
# @app.task def index_comments(...)
# Any task that indexes posts/comments
```

### 1.2 Update Notifications App

**File**: `notifications/notifiers/comments.py`

**Action**: DELETE ENTIRE FILE

**File**: `notifications/notifiers/__init__.py` (or wherever notifiers are registered)

**Changes**: Remove import and registration of comment notifier

### 1.3 Update Profiles App

**File**: `profiles/views.py`

**Changes**:
```python
# REMOVE these imports
from channels.models import Comment
from channels.proxies import proxy_posts
from channels.serializers.posts import BasePostSerializer
from channels.serializers.comments import BaseCommentSerializer
from channels.utils import (...)

# In profile views, REMOVE:
# - User posts section
# - User comments section
# - Any channel membership display
```

**File**: `profiles/api.py`

**Changes**:
```python
# REMOVE this import
from channels.models import ChannelGroupRole

# Remove any channel role queries
```

### 1.4 Update Mail App

**File**: `mail/` (various templates and views)

**Changes**:
- Remove discussion subscription email templates
- Remove frontpage email logic (if it sends post summaries)
- Remove comment notification emails
- Keep: General system emails

## Phase 2: Remove URL Patterns

### 2.1 Update Main URLs

**File**: `open_discussions/urls.py`

**Changes**:
```python
# REMOVE these imports
from open_discussions.views import channel_post, channel_redirect

# REMOVE these URL patterns
re_path(r"", include("channels.urls")),
re_path(r"", include("channels_fields.urls")),

re_path(r"^c/(?P<channel_name>[A-Za-z0-9_]+)/(?P<post_id>[A-Za-z0-9_]+)/"
        r"(?P<post_slug>{post_slug_pattern})/comment/(?P<comment_id>[A-Za-z0-9_]+)/?$",
        channel_post, name="channel-post-comment"),

re_path(r"^c/(?P<channel_name>[A-Za-z0-9_]+)/(?P<post_id>[A-Za-z0-9_]+)/"
        r"(?P<post_slug>{post_slug_pattern})/?$",
        channel_post, name="channel-post"),

re_path(r"^c/(?P<channel_name>[A-Za-z0-9_]+)/$", index, name="channel"),

re_path(r"^manage/c/edit/(?P<channel_name>[A-Za-z0-9_]+)/basic/$",
        index, name="manage-channel"),

re_path(r"^c/", index),
re_path(r"^channel/", channel_redirect),
re_path(r"^manage/", index),
re_path(r"^create_post/", index),

# REMOVE POST_SLUG_PATTERN if not used elsewhere
```

### 2.2 Update View Functions

**File**: `open_discussions/views.py`

**Changes**:
```python
# REMOVE these functions
# def channel_post(...)
# def channel_redirect(...)
```

## Phase 3: Remove Middleware

**File**: `open_discussions/middleware/channel_api.py`

**Action**: DELETE ENTIRE FILE

**File**: `open_discussions/settings.py`

**Changes**:
```python
# In MIDDLEWARE, REMOVE:
"open_discussions.middleware.channel_api.ChannelApiMiddleware",
```

## Phase 4: Update Settings

**File**: `open_discussions/settings.py`

**Changes**:
```python
# In INSTALLED_APPS, REMOVE:
"channels",
"channels_fields",
# Consider removing if not used:
# "discussions",  # Verify usage first

# Remove any channel-specific settings
# Remove Reddit API settings
# Remove Akismet settings (if only used for discussions)
```

**File**: `open_discussions/settings_celery.py`

**Changes**:
```python
# In CELERY_BEAT_SCHEDULE, REMOVE:
# - update-discussions
# - update-discussion-channels  
# - update-discussion-posts
# - spam-check tasks
# - subscription email tasks
# Any other discussion-related periodic tasks
```

## Phase 5: Remove Django Apps

### 5.1 Remove Channels App

```bash
# Remove the entire channels directory
rm -rf channels/
```

**Files Removed**:
- `channels/models.py` - All discussion models
- `channels/api.py` - Reddit API integration
- `channels/tasks.py` - Celery tasks
- `channels/views/` - All API views
- `channels/serializers/` - All serializers
- `channels/admin.py` - Admin configuration
- `channels/urls.py` - URL patterns
- `channels/utils.py` - Utilities
- `channels/proxies.py` - Proxy objects
- `channels/spam.py` - Spam checking
- `channels/factories/` - Test factories
- All tests and migrations

### 5.2 Remove Channels Fields App

```bash
# Remove the entire channels_fields directory
rm -rf channels_fields/
```

### 5.3 Remove or Update Discussions App

**Action**: First verify if this app is in use

```bash
# Check for imports
grep -r "from discussions" --include="*.py" . | grep -v ".venv" | grep -v test

# If not in use, remove it
rm -rf discussions/
```

**If in use**: Update to remove Reddit-backed functionality while keeping any standalone features.

## Phase 6: Remove Embedly Integration (if applicable)

**Check Usage**:
```bash
grep -r "embedly" --include="*.py" . | grep -v ".venv" | grep -v test | grep -v channels
```

**If only used for discussion link previews**:
```bash
rm -rf embedly/
```

**In settings.py**:
```python
# REMOVE from INSTALLED_APPS if removed
# Remove Embedly API key settings
```

## Phase 7: Clean Up Fixtures and Test Data

```bash
# Remove Reddit-specific fixtures
rm fixtures/reddit.py

# Update common fixtures
# File: fixtures/common.py
```

**File**: `fixtures/common.py`

**Changes**:
```python
# REMOVE
# - mock_reddit_object_indexer
# - Any Reddit-related mocking
```

## Phase 8: Update Authentication (if needed)

**File**: `authentication/` (various)

**Check**: If any authentication logic is tied to channel membership or Reddit

**Action**: Remove or update as needed

## Phase 9: Remove Python Dependencies

**File**: `pyproject.toml`

**Changes**:
```toml
# REMOVE these dependencies
# praw = "..."
# prawcore = "..."
# base36 = "..."
# akismet = "..."  # If only used for discussions
```

**Run**:
```bash
poetry lock
poetry install
```

## Phase 10: Build and Test Backend

### 10.1 Check for Import Errors

```bash
python manage.py check
```

Fix any import errors or missing references.

### 10.2 Run Migrations Check

```bash
python manage.py makemigrations --dry-run
```

Should show no pending migrations yet (migrations come in next phase).

### 10.3 Run Tests

```bash
# Run tests for preserved apps
pytest search/
pytest course_catalog/
pytest profiles/

# Check for failures related to removed code
pytest
```

Fix failures by:
1. Removing tests for deleted functionality
2. Updating imports
3. Removing discussion-related assertions

### 10.4 Start Development Server

```bash
python manage.py runserver
```

Verify:
- ✅ Server starts without errors
- ✅ Admin interface loads
- ✅ No import errors in logs

### 10.5 Test API Endpoints

```bash
# Test preserved endpoints
curl http://localhost:8000/api/v0/search/
curl http://localhost:8000/api/v0/podcasts/
curl http://localhost:8000/api/v0/courses/

# Verify removed endpoints return 404
curl http://localhost:8000/api/v0/channels/  # Should 404
curl http://localhost:8000/api/v0/posts/     # Should 404
```

## Phase 11: Update Admin Interface

**File**: `open_discussions/admin.py` (or main admin config)

**Changes**: Remove any channel/post/comment admin registrations if they're referenced

## Phase 12: Clean Up Management Commands

```bash
# Check for channel-related management commands
find . -path "*/management/commands/*" -name "*.py" | xargs grep -l "channel\|post\|comment" | grep -v ".venv"
```

**Action**: Remove or update any management commands that:
- Sync with Reddit
- Manage channels
- Import posts/comments
- Run spam checks on discussions

## Phase 13: Update Documentation

**Files to Update**:
- `README.md` - Remove Reddit setup instructions
- `docs/` - Remove discussion-related documentation
- API documentation - Remove discussion endpoints

## Environment Variables to Remove

Document these for production deployment:

```bash
# Remove from .env and deployment configs
OPEN_DISCUSSIONS_REDDIT_URL
OPEN_DISCUSSIONS_REDDIT_CLIENT_ID  
OPEN_DISCUSSIONS_REDDIT_SECRET
AKISMET_API_KEY
AKISMET_BLOG_URL
# Any other discussion-specific variables
```

## Checklist

Before proceeding to database migrations:

- [ ] Search app updated (no channels imports)
- [ ] Notifications app updated
- [ ] Profiles app updated
- [ ] Mail app updated
- [ ] URL patterns updated
- [ ] Middleware removed
- [ ] Settings updated
- [ ] `channels/` app removed
- [ ] `channels_fields/` app removed
- [ ] `discussions/` app handled
- [ ] `embedly/` handled (if applicable)
- [ ] Fixtures updated
- [ ] Python dependencies removed
- [ ] Tests pass (preserved functionality)
- [ ] Server starts without errors
- [ ] API endpoints verified
- [ ] Admin interface works
- [ ] Management commands updated
- [ ] Documentation updated
- [ ] Changes committed to git

## Rollback Plan

If issues arise:

```bash
# Return to previous state
git checkout main
git branch -D remove-discussions-backend

# Or revert specific commits
git revert <commit-hash>

# Restore Python environment
poetry install
```

## Next Steps

Proceed to [04-database-migration.md](./04-database-migration.md) for database cleanup instructions.
