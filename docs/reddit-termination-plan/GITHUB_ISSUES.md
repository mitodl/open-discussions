# GitHub Issues for Reddit Termination Plan

This file contains GitHub issue templates for tracking the Reddit termination project. Copy each section into a new GitHub issue.

---

## Epic: Reddit Service Termination

**Labels:** `epic`, `reddit-migration`, `infrastructure`

### Description

Remove dependency on Reddit service and convert Open Discussions to a read-only archive.

### Context

The application currently uses Reddit as its primary data store via PRAW (Python Reddit API Wrapper). This creates operational complexity and cost. Since no new content will be created, we can migrate to a simpler read-only archive backed by PostgreSQL.

### Goals

- Export all content from Reddit to PostgreSQL
- Implement read-only API using database
- Remove all Reddit dependencies from codebase
- Reduce operational complexity
- Maintain all existing content and functionality (read-only)

### Timeline

Estimated 9-13 weeks total (2-3 months)

### Phases

- Phase 1: Database Schema Design (1 week)
- Phase 2: One-Time Data Migration (2-3 weeks)
- Phase 3: Verification (1 week)
- Phase 4: Implement Read-Only API (2-3 weeks)
- Phase 5: UI Updates (1-2 weeks)
- Phase 6: Deploy (1 week)
- Phase 7: Cleanup (1-2 weeks)

### Success Criteria

- [ ] All content migrated with 100% accuracy
- [ ] Application runs without Reddit service
- [ ] No Reddit API calls in production
- [ ] All read functionality preserved
- [ ] Performance meets or exceeds current benchmarks

### Documentation

See `docs/reddit-termination-plan/` for detailed phase documentation.

---

## Phase 1 Issues

### Issue #1: Create Database Schema for Read-Only Archive

**Labels:** `phase-1`, `database`, `schema`  
**Epic:** Reddit Service Termination  
**Estimate:** 3 days

#### Description

Create new Django models to replace Reddit as data store, optimized for read-only archive.

#### Tasks

Model Updates:
- [ ] Add `reddit_id`, `score`, `archived_on` fields to Post model
- [ ] Add `reddit_id`, `score`, `archived_on` fields to Comment model
- [ ] Add `reddit_id`, `archived_on` fields to Channel model
- [ ] Add `plain_text` field to Post model

New Models:
- [ ] Create `CommentTreeNode` model using django-treebeard
- [ ] Add materialized path fields for tree traversal

Dependencies:
- [ ] Add `django-treebeard` to `pyproject.toml`
- [ ] Add `treebeard` to `INSTALLED_APPS`

#### Acceptance Criteria

- [ ] All new fields added to models
- [ ] CommentTreeNode model created and working
- [ ] django-treebeard dependency installed
- [ ] Models documented with docstrings

#### Files to Modify

- `channels/models.py`
- `pyproject.toml`
- `open_discussions/settings.py`

#### Documentation

See `docs/reddit-termination-plan/PHASE_1_SCHEMA.md`

---

### Issue #2: Create Django Migrations for New Schema

**Labels:** `phase-1`, `database`, `migrations`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days  
**Depends on:** Issue #1

#### Description

Create Django migrations for the new archive schema.

#### Tasks

- [ ] Create migration to add `reddit_id`, `score`, `archived_on` fields
- [ ] Create migration to add `plain_text` field to Post
- [ ] Create migration for `CommentTreeNode` model
- [ ] Create migration for database indexes
- [ ] Test migrations on clean database
- [ ] Test migrations on copy of production data

#### Acceptance Criteria

- [ ] All migrations apply successfully
- [ ] Migrations are reversible
- [ ] Indexes created correctly
- [ ] No data loss during migration

#### Files to Create

- `channels/migrations/0XXX_add_archive_fields.py`
- `channels/migrations/0XXX_create_comment_tree.py`
- `channels/migrations/0XXX_add_indexes.py`

#### Documentation

See `docs/reddit-termination-plan/PHASE_1_SCHEMA.md` section 3

---

### Issue #3: Add Tests for New Models

**Labels:** `phase-1`, `testing`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days  
**Depends on:** Issues #1, #2

#### Description

Create comprehensive tests for new archive models.

#### Tasks

- [ ] Test `reddit_id` field uniqueness
- [ ] Test `score` field defaults and constraints
- [ ] Test `CommentTreeNode` creation
- [ ] Test comment tree sorting by score
- [ ] Test tree traversal (parent/child relationships)
- [ ] Test database index usage
- [ ] Test migration reversibility

#### Acceptance Criteria

- [ ] All model tests pass
- [ ] Tree tests verify sorting works correctly
- [ ] Tests cover edge cases (null values, deleted users, etc.)
- [ ] Code coverage >80% for new code

#### Files to Create/Modify

- `channels/models_test.py`
- `channels/migrations_test.py`

#### Documentation

See `docs/reddit-termination-plan/PHASE_1_SCHEMA.md` Testing section

---

## Phase 2 Issues

### Issue #4: Create Base Export Command Class

**Labels:** `phase-2`, `data-migration`, `management-command`  
**Epic:** Reddit Service Termination  
**Estimate:** 1 day

#### Description

Create base class with common functionality for Reddit export commands.

#### Tasks

- [ ] Create `_base_reddit_export.py` with BaseRedditExportCommand
- [ ] Implement common CLI arguments (dry-run, batch-size, limit)
- [ ] Implement progress tracking and logging
- [ ] Implement error handling and statistics
- [ ] Add timestamp tracking

#### Acceptance Criteria

- [ ] Base command class supports all common features
- [ ] Progress logging works correctly
- [ ] Statistics tracking accurate
- [ ] Dry-run mode implemented

#### Files to Create

- `channels/management/commands/_base_reddit_export.py`

#### Documentation

See `docs/reddit-termination-plan/PHASE_2_DATA_MIGRATION.md`

---

### Issue #5: Implement Channel Export Command

**Labels:** `phase-2`, `data-migration`, `management-command`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days  
**Depends on:** Issue #4

#### Description

Export all channels from Reddit to database.

#### Tasks

- [ ] Create `export_reddit_channels.py` command
- [ ] Extract channel metadata from Reddit API
- [ ] Handle channel images (avatar, banner)
- [ ] Set `archived_on` timestamp
- [ ] Implement batch processing
- [ ] Add dry-run support
- [ ] Add progress reporting

#### Acceptance Criteria

- [ ] All channels exported successfully
- [ ] Channel metadata accurate
- [ ] Images downloaded and stored
- [ ] Command supports dry-run and limits
- [ ] Error handling robust

#### Files to Create

- `channels/management/commands/export_reddit_channels.py`

#### Testing

```bash
python manage.py export_reddit_channels --dry-run --limit 5
python manage.py export_reddit_channels
```

---

### Issue #6: Implement Post Export Command

**Labels:** `phase-2`, `data-migration`, `management-command`  
**Epic:** Reddit Service Termination  
**Estimate:** 3 days  
**Depends on:** Issues #4, #5

#### Description

Export all posts from Reddit to database with frozen scores.

#### Tasks

- [ ] Create `export_reddit_posts.py` command
- [ ] Iterate through all channels
- [ ] Extract post data (title, text, url, score, etc.)
- [ ] Handle article posts
- [ ] Handle link metadata
- [ ] Create/get author users
- [ ] Set `archived_on` timestamp
- [ ] Support per-channel export
- [ ] Implement batch processing

#### Acceptance Criteria

- [ ] All posts exported successfully
- [ ] Scores frozen at export time
- [ ] Plain text generated for all text posts
- [ ] Authors created/linked correctly
- [ ] Command supports filtering by channel

#### Files to Create

- `channels/management/commands/export_reddit_posts.py`

#### Testing

```bash
python manage.py export_reddit_posts --dry-run --limit 10
python manage.py export_reddit_posts --channel test_channel
python manage.py export_reddit_posts
```

---

### Issue #7: Implement Comment Export Command

**Labels:** `phase-2`, `data-migration`, `management-command`  
**Epic:** Reddit Service Termination  
**Estimate:** 3 days  
**Depends on:** Issues #4, #6

#### Description

Export all comments from Reddit to database with frozen scores.

#### Tasks

- [ ] Create `export_reddit_comments.py` command
- [ ] Iterate through all posts
- [ ] Extract comment data (text, score, parent_id, etc.)
- [ ] Handle comment.replace_more() for full trees
- [ ] Create/get author users
- [ ] Handle deleted comments
- [ ] Set `archived_on` timestamp
- [ ] Support per-post export
- [ ] Implement batch processing

#### Acceptance Criteria

- [ ] All comments exported successfully
- [ ] Scores frozen at export time
- [ ] Parent relationships preserved
- [ ] Deleted/removed comments handled
- [ ] Command supports filtering by post

#### Files to Create

- `channels/management/commands/export_reddit_comments.py`

#### Testing

```bash
python manage.py export_reddit_comments --dry-run --limit 100
python manage.py export_reddit_comments --post-id abc123
python manage.py export_reddit_comments
```

---

### Issue #8: Implement Comment Tree Builder

**Labels:** `phase-2`, `data-migration`, `management-command`, `complex`  
**Epic:** Reddit Service Termination  
**Estimate:** 4 days  
**Depends on:** Issue #7

#### Description

Build MaterializedPath tree structures for all comment threads.

#### Tasks

- [ ] Create `build_comment_trees.py` command
- [ ] Create root node for each post
- [ ] Build tree recursively using parent_id
- [ ] Sort by score (best first)
- [ ] Handle orphaned comments
- [ ] Support rebuild flag
- [ ] Support per-post building
- [ ] Optimize for large comment threads

#### Acceptance Criteria

- [ ] Trees built for all posts
- [ ] Comments sorted correctly by score
- [ ] Tree traversal works (parent/child relationships)
- [ ] No orphaned comments
- [ ] Rebuild flag works correctly

#### Files to Create

- `channels/management/commands/build_comment_trees.py`

#### Testing

```bash
python manage.py build_comment_trees --dry-run --limit 5
python manage.py build_comment_trees --post-id abc123 --rebuild
python manage.py build_comment_trees
```

---

### Issue #9: Create Export Verification Command

**Labels:** `phase-2`, `data-migration`, `verification`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days  
**Depends on:** Issues #5, #6, #7, #8

#### Description

Verify data integrity after export.

#### Tasks

- [ ] Create `verify_reddit_export.py` command
- [ ] Verify record counts (channels, posts, comments)
- [ ] Verify reddit_id fields populated
- [ ] Verify foreign key relationships
- [ ] Verify comment tree integrity
- [ ] Verify no orphaned records
- [ ] Generate summary report

#### Acceptance Criteria

- [ ] Command detects all major issues
- [ ] Clear error/warning reporting
- [ ] Summary statistics accurate
- [ ] Exit code indicates success/failure

#### Files to Create

- `channels/management/commands/verify_reddit_export.py`

---

## Phase 3 Issues

### Issue #10: Create Comprehensive Verification System

**Labels:** `phase-3`, `verification`, `quality`  
**Epic:** Reddit Service Termination  
**Estimate:** 3 days  
**Depends on:** Phase 2 complete

#### Description

Comprehensive verification of all migrated data.

#### Tasks

- [ ] Create `verify_export_comprehensive.py` command
- [ ] Verify data completeness (counts, coverage)
- [ ] Verify data accuracy (sample content checks)
- [ ] Verify data integrity (relationships, constraints)
- [ ] Verify scores are frozen
- [ ] Verify timestamps preserved
- [ ] Verify tree structure valid
- [ ] Verify database indexes exist
- [ ] Sample verification against Reddit API (optional)
- [ ] Generate detailed report

#### Acceptance Criteria

- [ ] All verification checks pass
- [ ] Sample content matches Reddit
- [ ] Tree structures valid
- [ ] Clear pass/fail criteria
- [ ] Detailed error reporting

#### Files to Create

- `channels/management/commands/verify_export_comprehensive.py`

#### Documentation

See `docs/reddit-termination-plan/PHASE_3_VERIFICATION.md`

---

### Issue #11: Create Performance Test Suite

**Labels:** `phase-3`, `performance`, `testing`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days  
**Depends on:** Issue #10

#### Description

Test query performance on migrated data.

#### Tasks

- [ ] Create `test_query_performance.py` command
- [ ] Test channel listing query
- [ ] Test post listing queries (various sorts)
- [ ] Test comment tree queries
- [ ] Test author-based queries
- [ ] Test pagination queries
- [ ] Measure query counts (check for N+1)
- [ ] Measure response times
- [ ] Generate performance report

#### Acceptance Criteria

- [ ] Common queries under 1 second
- [ ] No N+1 query problems
- [ ] Indexes being used correctly
- [ ] Performance acceptable for production

#### Files to Create

- `channels/management/commands/test_query_performance.py`

---

## Phase 4 Issues

### Issue #12: Reimplement Channel API Methods

**Labels:** `phase-4`, `api`, `database`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days

#### Description

Reimplement channel-related API methods to use database instead of Reddit.

#### Tasks

- [ ] Reimplement `list_channels()` with database query
- [ ] Reimplement `get_channel()` with database query
- [ ] Add query optimization (select_related, prefetch_related)
- [ ] Add caching if needed
- [ ] Update tests to use database
- [ ] Remove Reddit API calls

#### Acceptance Criteria

- [ ] Methods work without Reddit
- [ ] Tests pass
- [ ] Performance acceptable
- [ ] No PRAW dependencies in code

#### Files to Modify

- `channels/api.py`
- `channels/api_test.py`

---

### Issue #13: Reimplement Post API Methods

**Labels:** `phase-4`, `api`, `database`, `complex`  
**Epic:** Reddit Service Termination  
**Estimate:** 4 days  
**Depends on:** Issue #12

#### Description

Reimplement post-related API methods to use database.

#### Tasks

- [ ] Reimplement `list_posts()` with pagination and sorting
- [ ] Reimplement `front_page()` across all channels
- [ ] Reimplement `list_user_posts()` by author
- [ ] Reimplement `get_post()` by reddit_id
- [ ] Implement cursor-based pagination
- [ ] Support all sort orders (hot, new, top)
- [ ] Add query optimization
- [ ] Update tests

#### Acceptance Criteria

- [ ] All sort orders work correctly
- [ ] Pagination works (before/after cursors)
- [ ] Performance under 1 second
- [ ] Tests pass without Reddit

#### Files to Modify

- `channels/api.py`
- `channels/api_test.py`

---

### Issue #14: Reimplement Comment API Methods

**Labels:** `phase-4`, `api`, `database`, `complex`  
**Epic:** Reddit Service Termination  
**Estimate:** 5 days  
**Depends on:** Issue #13

#### Description

Reimplement comment-related API methods using CommentTreeNode.

#### Tasks

- [ ] Reimplement `list_comments()` using tree queries
- [ ] Reimplement `get_comment()` by reddit_id
- [ ] Reimplement `more_comments()` for tree pagination
- [ ] Reimplement `list_user_comments()` by author
- [ ] Support comment sorting
- [ ] Handle tree traversal efficiently
- [ ] Add query optimization
- [ ] Update tests

#### Acceptance Criteria

- [ ] Comment trees render correctly
- [ ] Tree traversal efficient (no N+1 queries)
- [ ] Pagination works within trees
- [ ] Performance under 1 second for typical threads
- [ ] Tests pass without Reddit

#### Files to Modify

- `channels/api.py`
- `channels/api_test.py`

---

### Issue #15: Remove Write Operation Methods

**Labels:** `phase-4`, `api`, `cleanup`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days  
**Depends on:** Issues #12, #13, #14

#### Description

Remove all write operation methods from API class.

#### Tasks

Methods to remove:
- [ ] Remove `create_channel()`
- [ ] Remove `update_channel()`
- [ ] Remove `create_post()`
- [ ] Remove `update_post()`
- [ ] Remove `delete_post()`
- [ ] Remove `pin_post()`
- [ ] Remove `remove_post()`, `approve_post()`
- [ ] Remove `create_comment()`
- [ ] Remove `update_comment()`
- [ ] Remove `delete_comment()`
- [ ] Remove `remove_comment()`, `approve_comment()`
- [ ] Remove all voting methods (`_apply_vote`, etc.)
- [ ] Remove all reporting methods
- [ ] Remove subscription add/remove methods
- [ ] Remove moderator/contributor add/remove methods
- [ ] Update tests to remove write operation tests

#### Acceptance Criteria

- [ ] All write methods removed
- [ ] No broken references to removed methods
- [ ] Tests still pass (read-only tests)
- [ ] Documentation updated

#### Files to Modify

- `channels/api.py`
- `channels/api_test.py`

---

### Issue #16: Remove Proxy Classes

**Labels:** `phase-4`, `refactoring`, `cleanup`  
**Epic:** Reddit Service Termination  
**Estimate:** 3 days  
**Depends on:** Issue #15

#### Description

Remove PostProxy and ChannelProxy, return Django models directly.

#### Tasks

- [ ] Update all API methods to return models instead of proxies
- [ ] Delete `channels/proxies.py`
- [ ] Update all code referencing proxy objects
- [ ] Update serializers if needed
- [ ] Update tests
- [ ] Update views that expect proxies

#### Acceptance Criteria

- [ ] No proxy classes in codebase
- [ ] All references updated
- [ ] Tests pass
- [ ] Serializers work with models

#### Files to Delete

- `channels/proxies.py`

#### Files to Modify

- `channels/api.py`
- `channels/views/*.py`
- `channels/serializers/*.py`
- All test files

---

## Phase 5-7 Issues

*(Create issues based on PHASES_5_6_7_SUMMARY.md - abbreviated here for brevity)*

### Issue #17: Add Read-Only Archive UI Banners

**Labels:** `phase-5`, `frontend`, `ui`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days

Add site-wide and context-specific banners indicating read-only archive status.

---

### Issue #18: Remove Write UI Elements

**Labels:** `phase-5`, `frontend`, `ui`  
**Epic:** Reddit Service Termination  
**Estimate:** 3 days

Remove all create/edit/delete buttons and forms from frontend.

---

### Issue #19: Update Score Display to Read-Only

**Labels:** `phase-5`, `frontend`, `ui`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days

Change voting UI to static score display with "(archived)" label.

---

### Issue #20: Deploy Read-Only Version to Production

**Labels:** `phase-6`, `deployment`, `infrastructure`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days

Deploy database-backed read-only version to production.

---

### Issue #21: Remove PRAW Dependency

**Labels:** `phase-7`, `cleanup`, `dependencies`  
**Epic:** Reddit Service Termination  
**Estimate:** 1 day

Remove praw and prawcore from dependencies.

---

### Issue #22: Remove Reddit Authentication Code

**Labels:** `phase-7`, `cleanup`, `refactoring`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days

Remove all Reddit OAuth and token management code.

---

### Issue #23: Remove Test Infrastructure (Betamax, Cassettes)

**Labels:** `phase-7`, `cleanup`, `testing`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days

Remove betamax dependency and all cassette files.

---

### Issue #24: Update Documentation

**Labels:** `phase-7`, `documentation`  
**Epic:** Reddit Service Termination  
**Estimate:** 2 days

Update all documentation to reflect read-only archive status.

---

### Issue #25: Final Verification and Sign-Off

**Labels:** `phase-7`, `verification`, `sign-off`  
**Epic:** Reddit Service Termination  
**Estimate:** 1 day

Final verification that Reddit has been completely removed.

Tasks:
- [ ] Verify no `import praw` in codebase
- [ ] Verify no Reddit env vars
- [ ] Verify all tests pass
- [ ] Verify application works without Reddit
- [ ] Document what was removed
- [ ] Sign-off for Reddit service decommission

---

## Labels to Create

Create these labels in GitHub:

- `epic` - For the main epic issue
- `reddit-migration` - All related issues
- `phase-1` through `phase-7` - Track phases
- `database` - Database/schema work
- `api` - API implementation
- `frontend` - UI changes
- `testing` - Test creation/updates
- `verification` - Data verification
- `cleanup` - Cleanup tasks
- `documentation` - Docs updates
- `complex` - More complex/risky tasks
- `infrastructure` - Infrastructure changes

## Issue Numbering

Issues are numbered sequentially, but you may want to adjust based on your existing issue numbers.

## Milestones

Create these milestones to track progress:

- **Phase 1: Schema** - Issues #1-3
- **Phase 2: Data Migration** - Issues #4-9
- **Phase 3: Verification** - Issues #10-11
- **Phase 4: Read-Only API** - Issues #12-16
- **Phase 5: UI Updates** - Issues #17-19
- **Phase 6: Deploy** - Issue #20
- **Phase 7: Cleanup** - Issues #21-25
