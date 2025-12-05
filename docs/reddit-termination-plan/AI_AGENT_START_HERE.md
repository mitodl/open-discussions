# AI Agent Action Plan - Reddit Termination

**Start Here:** Quick guide for AI agents implementing the Reddit termination plan.

## Quick Status Check

✅ **Documentation Complete** - All phases documented  
✅ **Codebase Analyzed** - Current state understood  
✅ **Plan Revised** - Adjusted for current codebase (v1.1)  
❌ **Implementation** - NOT STARTED

## Immediate Next Steps

### Step 1: Verify Environment (5 minutes)
```bash
cd /home/tmacey/code/mit/apps/open-discussions

# Check current state
git status
git branch

# Verify models exist
python manage.py shell
>>> from channels.models import Post, Comment, Channel
>>> Post._meta.get_field('post_id')  # Should exist (Base36IntegerField)
>>> exit()

# Check tests run
pytest channels/models_test.py -x
```

### Step 2: Read Phase 1 Documentation (15 minutes)
1. **Read:** `docs/reddit-termination-plan/PHASE_1_SCHEMA.md`
2. **Understand:** Current vs. needed state for each model
3. **Note:** We're UPDATING models, not creating from scratch

### Step 3: Create Working Branch (2 minutes)
```bash
git checkout -b reddit-termination-phase-1
git push -u origin reddit-termination-phase-1
```

### Step 4: Install Dependencies (5 minutes)
```bash
# Install django-treebeard
poetry add django-treebeard

# Update settings.py
# Add 'treebeard' to INSTALLED_APPS
```

### Step 5: Start Implementation (Phase 1)

**Follow PHASE_1_SCHEMA.md exactly. Here's the order:**

1. **Update models.py** (~30 min)
   - Add fields to Channel, Post, Comment
   - Create CommentTreeNode model
   - See PHASE_1_SCHEMA.md sections 1.1-1.4

2. **Create Migration 1** (~15 min)
   - Add reddit_id, archived_on, created fields
   - See PHASE_1_SCHEMA.md section 4.2

3. **Test Migration 1** (~10 min)
   ```bash
   python manage.py makemigrations channels
   python manage.py migrate channels
   pytest channels/models_test.py
   ```

4. **Create Migration 2** (~10 min)
   - Add plain_text field
   - Test it

5. **Create Migration 3** (~10 min)
   - Modify score defaults
   - Test it

6. **Create Migration 4** (~15 min)
   - Create CommentTreeNode table
   - Test it

7. **Create Migration 5** (~15 min)
   - Add indexes
   - Test it

8. **Write Tests** (~45 min)
   - See PHASE_1_SCHEMA.md "Testing Requirements" section
   - All test cases provided

9. **Verify Success Criteria** (~15 min)
   - Run all verification commands
   - Check all boxes in Phase 1 success criteria

**Total Time:** ~3-4 hours for Phase 1

## Critical Safety Rules

### 🚨 NEVER DO THESE

1. **Never test on production** - Always use staging
2. **Never remove old fields yet** - Keep post_id, comment_id until Phase 7
3. **Never skip tests** - Every migration must have tests
4. **Never skip verification** - Phase 3 verification is mandatory
5. **Never proceed with errors** - Fix all failing tests before continuing

### ✅ ALWAYS DO THESE

1. **Always backup before changes** - git commit frequently
2. **Always test migrations on clean DB** - Create fresh test DB
3. **Always test migrations on staging** - Copy production data
4. **Always run full test suite** - `pytest` before committing
5. **Always document deviations** - If you change something, explain why

## When You're Stuck

### Problem: Current code doesn't match docs
**Solution:** Docs were written based on analysis. Code may have changed. Document actual state and adjust.

### Problem: Migration fails
**Solution:** Check dependencies. Run `python manage.py makemigrations --dry-run` to see what would happen.

### Problem: Tests fail
**Solution:** Update factories if needed. Factories may need to handle nullable fields.

### Problem: Don't understand something
**Solution:** 
1. Check `docs/reddit-migration/` for historical context
2. Review related code in `channels/api.py`
3. Ask for clarification before proceeding

## Implementation Checklist

### Phase 1: Schema Design (THIS WEEK)
- [ ] Dependencies installed (django-treebeard)
- [ ] Models updated with new fields
- [ ] CommentTreeNode model created
- [ ] 5 migrations created and tested
- [ ] All model tests written and passing
- [ ] Migration tests written and passing
- [ ] Success criteria verified
- [ ] Code reviewed
- [ ] Branch pushed to origin

### Phase 2: Data Migration (NEXT 2-3 WEEKS)
- [ ] Review PHASE_2_DATA_MIGRATION.md
- [ ] Create export commands
- [ ] Test exports on sample data
- [ ] Export all channels
- [ ] Export all posts  
- [ ] Export all comments
- [ ] Build comment trees
- [ ] Verify data integrity

### Phase 3: Verification (WEEK 4)
- [ ] Review PHASE_3_VERIFICATION.md
- [ ] Run comprehensive verification
- [ ] Run performance tests
- [ ] Sign off on data quality

### Phase 4-7: See PHASE_4_READONLY_API.md and PHASES_5_6_7_SUMMARY.md

## Progress Tracking

### How to Track Your Progress

**Option 1: Use this file**
Update checkboxes above as you complete tasks.

**Option 2: Create GitHub issues**
Use templates in `GITHUB_ISSUES.md`

**Option 3: Update README.md**
Change status table in README.md

## Quick Reference

### Key Files
- **Phase docs:** `docs/reddit-termination-plan/PHASE_*.md`
- **Models:** `channels/models.py`
- **API:** `channels/api.py`
- **Tests:** `channels/models_test.py`, `channels/test_models.py`
- **Factories:** `channels/factories.py`

### Key Commands
```bash
# Run tests
pytest channels/ -v

# Make migrations
python manage.py makemigrations channels

# Apply migrations
python manage.py migrate channels

# Check for issues
python manage.py check

# Shell access
python manage.py shell

# Database shell
python manage.py dbshell
```

### Key Documentation
- **This plan:** `docs/reddit-termination-plan/`
- **Original plan:** `docs/reddit-migration/`
- **Current status:** `docs/reddit-termination-plan/REVISION_SUMMARY.md`

## Questions Before Starting?

1. **What's the goal?** Remove Reddit dependency, create read-only archive
2. **How long?** 9-13 weeks total, Phase 1 is 1 week
3. **Can I skip phases?** No, must follow order
4. **What if I find bugs?** Fix only if related to your task, file issue otherwise
5. **What about old migration docs?** Those were dual-write approach, ignore them

## Ready to Start?

1. ✅ Read this file
2. ✅ Read PHASE_1_SCHEMA.md
3. ✅ Understand current codebase state
4. ✅ Have staging environment ready
5. ✅ Created working branch

**If all checked, proceed to Step 4: Install Dependencies above**

---

**Last Updated:** 2024-12-05  
**Next Review:** After Phase 1 completion  
**Questions?** See INDEX.md or REVISION_SUMMARY.md
