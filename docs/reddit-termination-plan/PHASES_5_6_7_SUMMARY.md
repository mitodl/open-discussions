# Phases 5-7: Summary Documentation
**Combined Duration:** 4-6 weeks

## Phase 5: UI Updates for Read-Only Archive (1-2 weeks)

### Objective
Update frontend to clearly indicate read-only archive status and remove all write functionality.

### Key Tasks

#### 1. Add Archive Banners
- Site-wide banner: "This is a read-only archive of content from [DATE]"
- Channel-specific notices
- Post/comment page notices

#### 2. Remove Write UI Elements
- Remove "Create Post" buttons
- Remove "Reply" buttons on comments
- Remove "Edit" and "Delete" buttons
- Remove upvote/downvote buttons
- Remove "Report" buttons
- Remove "Subscribe" buttons
- Remove moderation action buttons

#### 3. Update Score Display
- Change from interactive voting to static display
- Show score with "(archived)" label
- Remove vote arrows
- Display as read-only metric

#### 4. Update Help/Documentation
- Update FAQ to explain archive status
- Add "About this Archive" page
- Update user guides
- Remove references to posting/commenting

#### 5. Update Forms
- Disable all write forms
- Add tooltips explaining read-only status
- Remove form submission handlers

### Deliverables
- [ ] Archive banner component
- [ ] Updated post/comment display components  
- [ ] Disabled form components
- [ ] Updated help documentation
- [ ] UI/UX testing results

---

## Phase 6: Deploy Read-Only Version (1 week)

### Objective
Deploy the database-backed read-only application to production.

### Key Tasks

#### 1. Pre-Deployment
- Final verification of data integrity
- Performance testing on staging
- Create deployment checklist
- Prepare rollback plan
- Communicate to users

#### 2. Deployment Steps
```bash
# 1. Deploy database changes
python manage.py migrate

# 2. Deploy code changes
git pull origin main
pip install -r requirements.txt

# 3. Restart application
systemctl restart open-discussions

# 4. Verify deployment
curl -I https://discussions.example.com/
python manage.py verify_export_comprehensive
```

#### 3. Post-Deployment Monitoring
- Monitor error logs for 48 hours
- Track response times
- Verify no Reddit API calls
- Check user feedback
- Monitor database performance

#### 4. Validation
- Smoke test all major features
- Verify comment trees render
- Check search functionality
- Test pagination
- Verify images load

### Deliverables
- [ ] Deployment runbook
- [ ] Staging environment tested
- [ ] Production deployed
- [ ] Monitoring dashboard
- [ ] Rollback plan documented
- [ ] User communication sent

### Success Criteria
- [ ] Application runs without Reddit
- [ ] No errors in logs
- [ ] Response times acceptable
- [ ] All features functional
- [ ] Search index updated

---

## Phase 7: Cleanup (1-2 weeks)

### Objective
Remove all Reddit-related code and dependencies from the codebase.

### Key Tasks

#### 1. Remove PRAW Dependency

**File:** `pyproject.toml`
```bash
poetry remove praw
```

Remove from imports:
```python
# DELETE these imports from all files
import praw
from praw.exceptions import *
from praw.models import *
from prawcore.exceptions import *
```

#### 2. Remove Authentication Code

**Files to modify:**
- `channels/api.py` - Remove auth functions
- `channels/models.py` - Drop RedditRefreshToken, RedditAccessToken

Delete functions:
- `_get_refresh_token()`
- `get_or_create_auth_tokens()`
- `_configure_access_token()`
- `_get_client()`
- `_get_client_base_kwargs()`
- `_get_session()`
- `_get_requester_kwargs()`
- `_get_user_agent()`
- `evict_expired_access_tokens()`

#### 3. Remove Proxy Classes

**Delete:** `channels/proxies.py`

Update all references:
```python
# OLD
from channels.proxies import PostProxy, ChannelProxy
post = proxy_post(submission)

# NEW  
post = Post.objects.get(reddit_id=submission_id)
```

#### 4. Remove Base36IntegerField

**File:** `channels/models.py`

Delete:
```python
class Base36IntegerField(models.BigIntegerField):
    # DELETE entire class
```

Create migration to convert remaining Base36 fields.

#### 5. Remove Environment Variables

**Files:** 
- `open_discussions/settings.py`
- `docker-compose.yml`
- `app.json`
- `.env.example` (if exists)

Remove:
```python
OPEN_DISCUSSIONS_REDDIT_CLIENT_ID
OPEN_DISCUSSIONS_REDDIT_SECRET
OPEN_DISCUSSIONS_REDDIT_URL
OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL
OPEN_DISCUSSIONS_REDDIT_ACCESS_TOKEN
OPEN_DISCUSSIONS_REDDIT_COMMENTS_LIMIT
```

#### 6. Remove Test Infrastructure

Delete files:
- `fixtures/betamax.py`
- `fixtures/reddit.py`
- `channels/factories/reddit.py`
- All files in `cassettes/` directory

Remove dependencies:
```bash
poetry remove betamax betamax_serializers
```

#### 7. Update Tests

Update all test files:
```python
# REMOVE betamax decorators
@pytest.mark.betamax(...)  # DELETE

# REMOVE Reddit fixtures  
@pytest.fixture
def reddit_api():  # DELETE
    
# UPDATE to use database
def test_list_posts():
    posts = PostFactory.create_batch(5)
    # Test against database
```

#### 8. Remove Management Commands

Delete Reddit-specific commands:
- `export_reddit_channels.py` (keep for reference in git history)
- `export_reddit_posts.py`
- `export_reddit_comments.py`
- `build_comment_trees.py`

Mark Phase 2 commands as "historical" in documentation.

#### 9. Remove Old Model Fields

Create migration to drop old Reddit fields:
```python
# Migration to clean up old fields
operations = [
    migrations.RemoveField('post', 'post_id'),
    migrations.RemoveField('comment', 'comment_id'),
    migrations.RemoveField('channel', 'allowed_post_types'),
]
```

#### 10. Update Documentation

**README.md:**
- Remove Reddit setup instructions
- Remove link to reddit-config repo
- Add "Read-Only Archive" section
- Update architecture documentation

**Add new docs:**
- `docs/archive-info.md` - About the archive
- `docs/migration-history.md` - What was done and when

**Update:**
- `docs/architecture/` - Remove Reddit from diagrams
- `docs/operations.md` - Remove Reddit maintenance
- `docs/configuration.md` - Remove Reddit config

#### 11. Remove View Files

Delete:
```
channels/views/moderators.py  # Write operations only
channels/views/contributors.py  # Write operations only
channels/views/subscribers.py  # All subscription functionality
channels/views/reports.py  # All reporting functionality
```

Update remaining views to remove write endpoints.

#### 12. Clean Search Integration

**File:** `search/search_index_helpers.py`

Remove:
```python
def reddit_object_persist(*persistence_funcs):
    # DELETE decorator

def is_reddit_object_removed(reddit_obj):
    # DELETE function
```

Update index functions to use Django models directly:
```python
# OLD
def index_new_post(post_obj):
    post = post_obj._self_post  # From proxy
    
# NEW
def index_new_post(post):
    # post is already a Post model instance
```

### Deliverables

#### Code Cleanup
- [ ] PRAW dependency removed
- [ ] Authentication code removed
- [ ] Proxy classes removed
- [ ] Base36IntegerField removed
- [ ] Environment variables removed
- [ ] Test infrastructure removed
- [ ] Old model fields removed
- [ ] Write-only views removed

#### Documentation
- [ ] README updated
- [ ] Architecture docs updated
- [ ] Archive documentation added
- [ ] Migration history documented

#### Testing
- [ ] All tests updated
- [ ] All tests passing
- [ ] No Reddit references in code
- [ ] Code review completed

### Success Criteria

- [ ] No `import praw` in codebase
- [ ] No Reddit environment variables
- [ ] No cassettes or betamax references
- [ ] All tests pass
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Clean git history (old files in history only)

### Final Verification

```bash
# Verify no Reddit references
grep -r "praw" --include="*.py" .
grep -r "reddit" --include="*.py" . | grep -v "reddit_id" | grep -v "# historical"

# Verify dependencies
poetry show | grep -i praw  # Should return nothing
poetry show | grep -i betamax  # Should return nothing

# Run all tests
pytest

# Check for environment variables
grep -r "REDDIT" .env.example docker-compose.yml app.json
```

---

## Post-Cleanup

### Archive for Reference
1. Tag current state: `git tag pre-reddit-removal`
2. Keep migration commands in git history
3. Document what was removed and why
4. Save final Reddit data snapshot

### Monitor
1. Watch logs for any Reddit-related errors
2. Monitor performance
3. Track user feedback
4. Verify search index stays synchronized

### Future Considerations
1. Consider adding full-text search
2. Consider bulk data export feature
3. Plan for eventual CDN deployment
4. Consider static site generation for popular pages

---

## Total Timeline Summary

- **Phase 1** (Schema): 1 week
- **Phase 2** (Data Migration): 2-3 weeks
- **Phase 3** (Verification): 1 week
- **Phase 4** (Read-Only API): 2-3 weeks
- **Phase 5** (UI Updates): 1-2 weeks
- **Phase 6** (Deploy): 1 week
- **Phase 7** (Cleanup): 1-2 weeks

**Total: 9-13 weeks (2-3 months)**

Significantly faster than original dual-write plan (16-22 weeks) due to read-only simplification.
