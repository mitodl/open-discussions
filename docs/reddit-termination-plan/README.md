# Reddit Termination Plan

**Complete documentation for removing Reddit dependency and creating a read-only archive.**

**UPDATED:** 2024-12-05 - Revised based on current codebase analysis

## 📋 Quick Links

- **[INDEX.md](INDEX.md)** - Start here! Complete overview and navigation guide
- **[GITHUB_ISSUES.md](GITHUB_ISSUES.md)** - 25 ready-to-use GitHub issues for project tracking

## 📚 Phase Documentation

| Phase | Document | Duration | Description | Status |
|-------|----------|----------|-------------|--------|
| **Phase 1** | [PHASE_1_SCHEMA.md](PHASE_1_SCHEMA.md) | 1 week | Create Django models for read-only archive | NOT STARTED |
| **Phase 2** | [PHASE_2_DATA_MIGRATION.md](PHASE_2_DATA_MIGRATION.md) | 2-3 weeks | One-time export from Reddit to database | NOT STARTED |
| **Phase 3** | [PHASE_3_VERIFICATION.md](PHASE_3_VERIFICATION.md) | 1 week | Comprehensive data verification | NOT STARTED |
| **Phase 4** | [PHASE_4_READONLY_API.md](PHASE_4_READONLY_API.md) | 2-3 weeks | Reimplement API using database | NOT STARTED |
| **Phase 5-7** | [PHASES_5_6_7_SUMMARY.md](PHASES_5_6_7_SUMMARY.md) | 4-6 weeks | UI updates, deploy, cleanup | NOT STARTED |

**Total Timeline:** 9-13 weeks (2-3 months)

## 🎯 Project Goals

1. ✅ Export all Reddit content to PostgreSQL
2. ✅ Convert to read-only archive (no new posts/comments)
3. ✅ Remove all Reddit API dependencies
4. ✅ Maintain all existing functionality (read-only)
5. ✅ Reduce operational complexity and cost

## 🚀 Quick Start

### For AI Agents (START HERE)
**[AI_AGENT_START_HERE.md](AI_AGENT_START_HERE.md)** - Your implementation guide with:
- Immediate next steps
- Phase 1 task breakdown (~3-4 hours)
- Critical safety rules
- Problem-solving guide

### For Project Managers

1. Read **[REVISION_SUMMARY.md](REVISION_SUMMARY.md)** - Understand v1.1 changes
2. Read **[INDEX.md](INDEX.md)** - Complete overview
3. Review timeline and resource requirements
4. Create GitHub issues from **[GITHUB_ISSUES.md](GITHUB_ISSUES.md)**
5. Assign team members to phases
6. Track progress using GitHub milestones

### For Developers

1. Read **[REVISION_SUMMARY.md](REVISION_SUMMARY.md)** - Current codebase state
2. Start with **[PHASE_1_SCHEMA.md](PHASE_1_SCHEMA.md)**
3. Follow implementation instructions in each phase doc
4. Use GitHub issues for task tracking
5. Run verification commands after each phase
6. Don't proceed to next phase until current phase verified

### For Stakeholders

- **What:** Converting Open Discussions to read-only archive
- **Why:** No new content needed, reduce complexity/cost
- **When:** 2-3 months implementation
- **Impact:** Users can still read all content, but not post/comment/vote
- **Benefits:** Simpler system, lower cost, Reddit service can be decommissioned

## 📊 Progress Tracking

### Phase Completion

- [ ] **Phase 1:** Schema Design
- [ ] **Phase 2:** Data Migration  
- [ ] **Phase 3:** Verification
- [ ] **Phase 4:** Read-Only API
- [ ] **Phase 5:** UI Updates
- [ ] **Phase 6:** Deploy
- [ ] **Phase 7:** Cleanup

### Key Milestones

- [ ] All content migrated from Reddit
- [ ] Application works without Reddit service
- [ ] UI updated to show archive status
- [ ] Production deployment complete
- [ ] Reddit service decommissioned

## 🎪 Key Features

### Read-Only Archive Approach

- **50% faster** than dual-write migration (9-13 weeks vs 16-22 weeks)
- **Simpler** - One-time migration instead of gradual transition
- **Lower risk** - Fewer moving parts and failure points
- **Frozen scores** - All scores captured at migration time
- **No voting** - Eliminates complex vote data migration

### Technical Highlights

- **Comment Trees:** django-treebeard Materialized Paths
- **Database:** PostgreSQL with optimized indexes
- **Performance:** <1s for common queries
- **Testing:** Comprehensive verification at each phase
- **Documentation:** Detailed guides for every step

## 📦 Deliverables

### Documentation

- ✅ 7 comprehensive phase documents (110+ KB total)
- ✅ 25 detailed GitHub issues
- ✅ Complete index and navigation guide
- ✅ Risk assessment and mitigation strategies
- ✅ Testing and verification procedures

### Code (To Be Created)

Each phase produces:
- Django models and migrations
- Management commands for data migration
- API reimplementations
- Test suites
- UI updates

## ⚠️ Important Notes

### Before Starting

1. **Backup everything** - Reddit data, database, code
2. **Test on staging** - Never run migrations directly on production
3. **Reddit access** - Ensure Reddit API access available during migration
4. **Storage** - Verify sufficient database storage for all content
5. **Timeline** - Allow buffer time, don't rush phases

### During Migration

1. **Verify each phase** - Don't skip verification steps
2. **Keep Reddit running** - Until Phase 6 complete
3. **Monitor performance** - Track query times and database size
4. **Document issues** - Record problems and solutions
5. **Communication** - Keep users informed of progress

### After Completion

1. **Monitor** - Watch for errors in first 2 weeks
2. **Optimize** - Add indexes if queries slow
3. **Document** - Record lessons learned
4. **Archive** - Save Reddit data backup for reference
5. **Decommission** - Shut down Reddit service

## 🆘 Getting Help

### During Implementation

- Review phase documentation thoroughly
- Check GitHub issues for guidance
- Consult with team members
- Test in staging environment first

### Common Issues

See [INDEX.md](INDEX.md) "Common Issues" section for:
- Migration failures
- Performance problems
- Test failures
- Deployment issues

## 📞 Support

For questions or issues:

1. Check phase documentation
2. Review GitHub issues
3. Consult INDEX.md
4. Ask development team

## 📝 Contributing

When updating this documentation:

1. Keep phase docs synchronized with code
2. Update GitHub issues as scope changes
3. Document all decisions and rationale
4. Update INDEX.md if structure changes

## 📜 License

This documentation is part of the Open Discussions project.

---

## 🔍 Current Codebase Status (as of 2024-12-05)

### Existing Infrastructure
- ✅ Django models exist: `Channel`, `Post`, `Comment` in `channels/models.py`
- ✅ Reddit API integration via `channels/api.py` (463 lines)
- ✅ Base36IntegerField for Reddit IDs currently in use
- ✅ RedditRefreshToken and RedditAccessToken models present
- ✅ Subscription model for content notifications

### What Needs to be Added
- ❌ `reddit_id` CharField fields (currently using Base36IntegerField as primary key)
- ❌ `score` integer fields (currently nullable BigIntegerField)
- ❌ `archived_on` timestamp fields
- ❌ `plain_text` stored field on Post (currently a @property)
- ❌ `CommentTreeNode` model with django-treebeard
- ❌ Data export management commands
- ❌ Read-only API implementation

### Key Differences from Original Plan
1. **Existing Models:** Models already exist but need fields added, not created from scratch
2. **Score Fields:** Already present as `BigIntegerField(null=True)` - need to make non-nullable with defaults
3. **ID Strategy:** Currently using Base36IntegerField as primary key; need to add CharField `reddit_id` and eventually migrate
4. **Plain Text:** Already computed as @property on Post; needs to become stored field

---

**Created:** 2024-11-20  
**Updated:** 2024-12-05  
**Version:** 1.1  
**Status:** Ready for implementation (revised for current codebase)  
**Total Pages:** 110+ KB of documentation  
**Issues:** 25 GitHub issues ready to track

**Start here:** [INDEX.md](INDEX.md)
