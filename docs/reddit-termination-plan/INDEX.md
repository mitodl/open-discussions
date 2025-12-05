# Reddit Termination Plan - Documentation Index

## Overview

This directory contains comprehensive planning documentation for removing Reddit as a dependency from the Open Discussions application and converting it to a read-only archive.

**Status:** Planning Phase Complete, Ready for Implementation  
**Timeline:** 9-13 weeks (2-3 months)  
**Approach:** One-time data migration to read-only archive  
**Last Updated:** 2024-12-05 (v1.1 - Revised for current codebase)

## 🚀 Quick Start

### For AI Agents Implementing This Plan
**START HERE:** [AI_AGENT_START_HERE.md](AI_AGENT_START_HERE.md)

This file provides:
- Immediate next steps
- Quick status check
- Implementation checklist
- Critical safety rules
- Common problems & solutions

### For Project Managers
1. Review [REVISION_SUMMARY.md](REVISION_SUMMARY.md) - What changed in v1.1
2. Review this INDEX.md for complete overview
3. Review timeline and resource requirements below
4. Create GitHub issues from [GITHUB_ISSUES.md](GITHUB_ISSUES.md)
5. Assign team members to phases

### For Developers (Human)
1. Read [REVISION_SUMMARY.md](REVISION_SUMMARY.md) - Understand current state
2. Start with [PHASE_1_SCHEMA.md](PHASE_1_SCHEMA.md)
3. Follow implementation instructions in each phase doc
4. Use GitHub issues for task tracking
5. Run verification commands after each phase

### For Stakeholders
- **What:** Converting Open Discussions to read-only archive
- **Why:** No new content needed, reduce complexity/cost
- **When:** 2-3 months implementation
- **Impact:** Users can still read all content, but not post/comment/vote
- **Benefits:** Simpler system, lower cost, Reddit service can be decommissioned

## Why Read-Only Archive?

Since no new content will be written and voting functionality is not needed, we can significantly simplify the migration:

- ✅ **50% faster** than dual-write approach (9-13 weeks vs 16-22 weeks)
- ✅ **Lower complexity** - Single-pass migration instead of gradual transition
- ✅ **Lower risk** - Simpler means fewer failure points
- ✅ **No vote migration** - Capture final scores as static values
- ✅ **No write operations** - Eliminate 60%+ of API methods

## Documentation Structure

### Documentation Files

**Essential Reading (Start Here):**
- **[AI_AGENT_START_HERE.md](AI_AGENT_START_HERE.md)** - Quick start for AI agents
- **[REVISION_SUMMARY.md](REVISION_SUMMARY.md)** - What changed in v1.1 (2024-12-05)
- **[INDEX.md](INDEX.md)** - This file, complete overview

**Phase Implementation Guides:**

1. **[PHASE_1_SCHEMA.md](PHASE_1_SCHEMA.md)** (1 week)
   - Create Django models for read-only archive
   - Implement comment tree using django-treebeard
   - Create database migrations
   - Add indexes for performance

2. **[PHASE_2_DATA_MIGRATION.md](PHASE_2_DATA_MIGRATION.md)** (2-3 weeks)
   - Export all channels from Reddit
   - Export all posts with frozen scores
   - Export all comments with frozen scores
   - Build comment tree structures
   - Verify data integrity

3. **[PHASE_3_VERIFICATION.md](PHASE_3_VERIFICATION.md)** (1 week)
   - Comprehensive data verification
   - Performance testing
   - Sample content verification against Reddit
   - Sign-off on data quality

4. **[PHASE_4_READONLY_API.md](PHASE_4_READONLY_API.md)** (2-3 weeks)
   - Reimplement API methods to use database
   - Remove all write operations
   - Remove proxy classes
   - Update search indexing
   - Performance optimization

5. **[PHASES_5_6_7_SUMMARY.md](PHASES_5_6_7_SUMMARY.md)** (4-6 weeks)
   - **Phase 5:** UI updates for read-only archive (1-2 weeks)
   - **Phase 6:** Deploy to production (1 week)
   - **Phase 7:** Cleanup and remove all Reddit code (1-2 weeks)

### Project Management

- **[GITHUB_ISSUES.md](GITHUB_ISSUES.md)**
  - 25 detailed GitHub issues covering all work
  - Issue templates ready to copy into GitHub
  - Dependencies and estimates included
  - Labels and milestones defined

## Quick Start for Developers

### Phase 1: Get Started

```bash
# 1. Add django-treebeard dependency
poetry add django-treebeard

# 2. Add to INSTALLED_APPS
# Edit open_discussions/settings.py

# 3. Create migrations
python manage.py makemigrations

# 4. Test migrations
python manage.py migrate

# 5. Run tests
pytest channels/models_test.py
```

### Phase 2: Export Data

```bash
# Export in order:
python manage.py export_reddit_channels
python manage.py export_reddit_posts
python manage.py export_reddit_comments
python manage.py build_comment_trees

# Verify:
python manage.py verify_reddit_export
```

### Phase 3: Verify

```bash
# Comprehensive verification
python manage.py verify_export_comprehensive

# Performance testing
python manage.py test_query_performance
```

## Key Decisions

### 1. Read-Only Archive Approach

**Decision:** Convert to read-only archive instead of maintaining write capability

**Rationale:**
- No new content will be created
- Voting functionality not needed
- Significantly simpler migration
- Faster timeline (50% reduction)
- Lower operational cost

**Impact:**
- Remove ~40 write operation methods from API
- No dual-write complexity
- No vote data migration needed
- Clear user expectations (it's an archive)

### 2. Comment Tree Structure

**Decision:** Use django-treebeard Materialized Path

**Rationale:**
- Battle-tested library
- Efficient for read operations
- Supports sorting by score
- Single tree type sufficient (sorted by best)

**Impact:**
- New `CommentTreeNode` model
- Efficient tree queries
- No need for multiple tree types

### 3. Score Storage

**Decision:** Store scores as static integer fields, frozen at migration time

**Rationale:**
- No ongoing voting in archive
- Simpler than maintaining vote relationships
- Scores frozen = predictable sorting

**Impact:**
- Add `score` field to Post and Comment
- No `PostVote` or `CommentVote` models needed
- Clear archive date matters

### 4. ID Strategy

**Decision:** Use auto-increment `id` as primary key, keep `reddit_id` for reference

**Rationale:**
- Cleaner than Base36IntegerField
- Standard Django approach
- reddit_id preserved for debugging/reference

**Impact:**
- New primary key strategy
- Old `post_id`/`comment_id` fields can be removed after migration
- Simpler code

## Risk Management

### High Risks

1. **Incomplete Data Migration**
   - *Mitigation:* Comprehensive verification, multiple test runs
   - *Rollback:* Keep Reddit available for re-export

2. **Comment Tree Build Failures**
   - *Mitigation:* Robust error handling, checkpoint/resume
   - *Rollback:* Rebuild trees from source data

### Medium Risks

1. **Performance Issues**
   - *Mitigation:* Proper indexing, query optimization, load testing
   - *Impact:* May need additional indexes post-launch

2. **Search Index Rebuild**
   - *Mitigation:* Schedule during low-traffic period
   - *Impact:* May take several hours

### Low Risks

1. **User Confusion**
   - *Mitigation:* Clear UI indicators, documentation
   - *Impact:* Support load, but manageable

## Timeline

```
Week 1: Phase 1 - Schema Design
  ├── Create models
  ├── Write migrations
  └── Test schema

Weeks 2-4: Phase 2 - Data Migration
  ├── Export channels
  ├── Export posts
  ├── Export comments
  └── Build trees

Week 5: Phase 3 - Verification
  ├── Run comprehensive checks
  ├── Performance testing
  └── Sign-off

Weeks 6-8: Phase 4 - Read-Only API
  ├── Reimplement channel methods
  ├── Reimplement post methods
  ├── Reimplement comment methods
  └── Remove write operations

Weeks 9-10: Phase 5 - UI Updates
  ├── Add archive banners
  ├── Remove write UI
  └── Update help docs

Week 11: Phase 6 - Deploy
  ├── Deploy to staging
  ├── Deploy to production
  └── Monitor

Weeks 12-13: Phase 7 - Cleanup
  ├── Remove PRAW dependency
  ├── Remove auth code
  ├── Update documentation
  └── Final verification

Total: 9-13 weeks
```

## Success Metrics

### Data Integrity
- [ ] 100% of channels migrated
- [ ] 100% of posts migrated
- [ ] 100% of comments migrated
- [ ] Comment trees complete and navigable
- [ ] All reddit_ids preserved

### Performance
- [ ] Channel listing < 500ms
- [ ] Post listing < 1s
- [ ] Comment trees < 1s
- [ ] No N+1 query problems
- [ ] Database indexes used

### Code Quality
- [ ] No Reddit API calls in production
- [ ] No PRAW imports in codebase
- [ ] All tests passing
- [ ] Code coverage maintained
- [ ] Documentation complete

### User Experience
- [ ] All read functionality preserved
- [ ] Archive status clearly communicated
- [ ] No broken links or errors
- [ ] Search working correctly
- [ ] Performance acceptable

## Resources

### External Documentation
- [django-treebeard Documentation](https://django-treebeard.readthedocs.io/)
- [PRAW Documentation](https://praw.readthedocs.io/) (for reference during migration)
- [Django Migrations Guide](https://docs.djangoproject.com/en/stable/topics/migrations/)

### Related Internal Docs
- `docs/reddit-migration/` - Original migration planning (dual-write approach)
- `docs/architecture/` - Current architecture documentation
- `README.md` - Current setup instructions (will be updated)

## Getting Help

### Questions During Implementation

If you encounter issues:

1. **Check phase documentation** - Detailed guidance in phase files
2. **Review GitHub issues** - May already be documented
3. **Check git history** - See what changed in reddit-migration docs
4. **Ask team** - Consult other developers

### Common Issues

**Issue:** Migration command fails with integrity error  
**Solution:** Check that previous phases completed successfully, verify foreign key relationships

**Issue:** Comment tree build is slow  
**Solution:** Process in batches, add progress logging, consider parallelization

**Issue:** Tests fail after removing proxies  
**Solution:** Update test expectations to use model instances instead of proxy objects

**Issue:** Performance degraded after migration  
**Solution:** Check EXPLAIN ANALYZE on slow queries, add indexes, use select_related/prefetch_related

## Contributing

When making changes to this plan:

1. Update the appropriate phase document
2. Update GITHUB_ISSUES.md if new issues needed
3. Update this INDEX.md if structure changes
4. Keep documentation in sync with code changes

## Sign-Off Process

### Phase Completion Checklist

Each phase requires sign-off before proceeding:

- [ ] All deliverables completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Success criteria met
- [ ] Next phase ready to start

### Final Sign-Off (After Phase 7)

Project complete when:

- [ ] Reddit service decommissioned
- [ ] All Reddit code removed
- [ ] Documentation complete
- [ ] Users notified
- [ ] Lessons learned documented
- [ ] Archive status confirmed

## Change Log

- 2024-11-20: Initial documentation created
  - All phase documents written
  - GitHub issues defined
  - Index created

---

## 🎯 Pre-Implementation Checklist

Before starting Phase 1, ensure:

- [ ] **Backup current Reddit data** - Full export or snapshot
- [ ] **Document current Reddit configuration** - Credentials, settings, URLs
- [ ] **Create staging environment** - Never test migrations on production
- [ ] **Verify database storage capacity** - Estimate content size
- [ ] **Schedule kickoff meeting** - Align team on timeline
- [ ] **Set up monitoring** - Track errors, performance during migration
- [ ] **Create git branch** - `reddit-termination` for all work
- [ ] **Review original Reddit migration docs** - Understand historical context

## 🚦 Implementation Quick Start

### For AI Agents

When implementing this plan:

1. **Start with Phase 1, Issue #1** - Don't skip ahead
2. **Each task is atomic** - Complete fully before moving to next
3. **Test after each change** - Run `pytest` frequently
4. **Verify migrations work** - Test on clean DB and staging data
5. **Follow existing code style** - Match patterns in `channels/models.py`
6. **Document decisions** - Add comments explaining non-obvious choices
7. **Check dependencies** - Issues have "Depends on" relationships

### Critical Success Factors

- ✅ **Never modify production** - All work in staging first
- ✅ **Keep Reddit running** - Until Phase 6 deployment complete
- ✅ **Maintain data integrity** - 100% data migration accuracy required
- ✅ **No shortcuts on verification** - Phase 3 is mandatory
- ✅ **Incremental commits** - Small, tested commits > large changes

---

**Last Updated:** 2024-12-05  
**Version:** 1.1  
**Status:** Ready for implementation (revised for current codebase)
