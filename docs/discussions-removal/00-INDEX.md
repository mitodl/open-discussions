# Discussion Removal Documentation - Navigation Guide

## 📋 Overview

This directory contains comprehensive documentation for removing Reddit-backed discussion functionality from the Open Discussions application while preserving search and podcast features.

**Total Documentation**: ~4,700 lines across 10 files
**Estimated Effort**: 32-46 hours (4-6 working days)

## 🎯 Start Here

### For Project Managers
👉 **Start with**: [README.md](./README.md)
- Overview of the project
- High-level strategy
- Risk assessment
- Success criteria

### For Developers (Manual Execution)
👉 **Start with**: [09-quick-reference.md](./09-quick-reference.md)
- Quick command reference
- Common issues and fixes
- Critical path items
- Then follow detailed plans in order (01-08)

### For AI Coding Agents
👉 **Start with**: [08-ai-agent-guide.md](./08-ai-agent-guide.md)
- Structured instructions for AI tools
- Cursor/Copilot/Aider specific commands
- Verification steps
- Common pitfalls for AI

### For QA/Testing Teams
👉 **Start with**: [06-verification-plan.md](./06-verification-plan.md)
- Comprehensive testing procedures
- Test cases for preserved features
- Performance testing
- Browser compatibility

### For DevOps/SREs
👉 **Start with**: [04-database-migration.md](./04-database-migration.md) and [07-rollback-plan.md](./07-rollback-plan.md)
- Database backup procedures
- Migration steps
- Rollback procedures
- Production deployment checklist

## 📚 Document Structure

### Phase-by-Phase Guides

| Phase | Document | Purpose | Audience |
|-------|----------|---------|----------|
| 0️⃣ | [README.md](./README.md) | Overview and strategy | Everyone |
| 1️⃣ | [01-scope-analysis.md](./01-scope-analysis.md) | What to remove | Tech Leads, Developers |
| 2️⃣ | [02-frontend-removal.md](./02-frontend-removal.md) | React/JS removal | Frontend Developers |
| 3️⃣ | [03-backend-removal.md](./03-backend-removal.md) | Django/Python removal | Backend Developers |
| 4️⃣ | [04-database-migration.md](./04-database-migration.md) | Database cleanup | DBAs, DevOps |
| 5️⃣ | [05-dependency-updates.md](./05-dependency-updates.md) | Final cleanup | All Developers |
| 6️⃣ | [06-verification-plan.md](./06-verification-plan.md) | Testing procedures | QA, Developers |
| 7️⃣ | [07-rollback-plan.md](./07-rollback-plan.md) | Emergency procedures | DevOps, SREs |

### Reference Guides

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [08-ai-agent-guide.md](./08-ai-agent-guide.md) | AI automation instructions | Using AI tools |
| [09-quick-reference.md](./09-quick-reference.md) | Quick lookup | During execution |

## 🚀 Execution Paths

### Path 1: Manual Execution (Recommended for first time)

```
1. Read README.md (15 min)
2. Review 01-scope-analysis.md (30 min)
3. Execute 02-frontend-removal.md (8-12 hours)
4. Execute 03-backend-removal.md (12-16 hours)
5. Execute 04-database-migration.md (4-6 hours)
6. Execute 05-dependency-updates.md (6-8 hours)
7. Execute 06-verification-plan.md (8-12 hours)
8. Keep 07-rollback-plan.md handy (just in case)
```

### Path 2: AI-Assisted Execution

```
1. Read README.md (15 min)
2. Review 08-ai-agent-guide.md (20 min)
3. Use AI tool with prompts from guide
4. Verify at each phase
5. Manual testing from 06-verification-plan.md
6. Keep 07-rollback-plan.md handy
```

### Path 3: Quick Reference (For experienced developers)

```
1. Skim README.md (5 min)
2. Use 09-quick-reference.md throughout
3. Refer to detailed plans as needed
4. Test with 06-verification-plan.md
```

## 🎓 Learning Resources

### Understanding the Codebase
- **01-scope-analysis.md**: Detailed breakdown of all code to be removed
  - Models, views, serializers
  - Frontend components, pages, state
  - Dependencies and integrations

### Understanding the Process
- **README.md**: High-level strategy and phases
- **09-quick-reference.md**: Quick lookup for commands and files

### Understanding the Risks
- **07-rollback-plan.md**: What can go wrong and how to recover
- **04-database-migration.md**: Critical backup procedures

## ✅ Pre-Execution Checklist

Before starting removal:

- [ ] Read README.md completely
- [ ] Review 01-scope-analysis.md
- [ ] Choose execution path (manual vs AI-assisted)
- [ ] Ensure development environment is ready
- [ ] Create git branch
- [ ] Have backup plan ready
- [ ] Notify stakeholders

## 📊 Document Metrics

| Document | Lines | Estimated Reading Time |
|----------|-------|----------------------|
| README.md | 95 | 10 min |
| 01-scope-analysis.md | 357 | 30 min |
| 02-frontend-removal.md | 384 | 30 min |
| 03-backend-removal.md | 503 | 40 min |
| 04-database-migration.md | 541 | 45 min |
| 05-dependency-updates.md | 537 | 40 min |
| 06-verification-plan.md | 679 | 50 min |
| 07-rollback-plan.md | 602 | 45 min |
| 08-ai-agent-guide.md | 605 | 45 min |
| 09-quick-reference.md | 399 | 20 min |
| **Total** | **4,702** | **~5.5 hours** |

## 🎯 Key Takeaways from Each Document

### README.md
- **Key Point**: 7-phase removal process
- **Critical**: Preserve search and podcasts

### 01-scope-analysis.md
- **Key Point**: ~200 files to remove/modify
- **Critical**: Dependencies in search, profiles, notifications

### 02-frontend-removal.md
- **Key Point**: Remove in specific order to avoid breakage
- **Critical**: Update reducers/index.js after deleting reducers

### 03-backend-removal.md
- **Key Point**: Update search/ BEFORE deleting channels/
- **Critical**: Settings and URL changes must be complete

### 04-database-migration.md
- **Key Point**: Backup FIRST, always
- **Critical**: Test migrations in dev, then staging

### 05-dependency-updates.md
- **Key Point**: Final cleanup of imports and references
- **Critical**: Search index cleanup required

### 06-verification-plan.md
- **Key Point**: Test preserved features thoroughly
- **Critical**: Search, podcasts, courses must work perfectly

### 07-rollback-plan.md
- **Key Point**: 24-48 hour optimal rollback window
- **Critical**: Database restore = data loss

### 08-ai-agent-guide.md
- **Key Point**: Specific prompts for each AI tool
- **Critical**: Verification at each phase

### 09-quick-reference.md
- **Key Point**: Fast lookup during execution
- **Critical**: Execution order matters

## 🤝 Team Coordination

### Suggested Team Structure

**Small Team (1-2 developers)**:
- One person handles frontend, another backend
- Share testing responsibilities
- Timeline: 1-2 weeks

**Medium Team (3-5 developers)**:
- 1-2 on frontend
- 1-2 on backend
- 1 on testing/QA
- Timeline: 1 week

**Large Team (6+ developers)**:
- Frontend team
- Backend team  
- QA team
- DevOps/DBA
- Timeline: 3-5 days

## 📞 Getting Help

### During Execution

1. **Check Quick Reference**: [09-quick-reference.md](./09-quick-reference.md)
2. **Check Detailed Plan**: Relevant phase document (01-08)
3. **Check Scope Analysis**: [01-scope-analysis.md](./01-scope-analysis.md)
4. **Check Rollback Plan**: [07-rollback-plan.md](./07-rollback-plan.md) if issues

### Common Questions

**Q: Where do I start?**
A: Read README.md, then choose your execution path above

**Q: How long will this take?**
A: 32-46 hours of actual work, spread over 4-6 days

**Q: What if something breaks?**
A: See [07-rollback-plan.md](./07-rollback-plan.md)

**Q: Can I use AI tools?**
A: Yes! See [08-ai-agent-guide.md](./08-ai-agent-guide.md)

**Q: What gets removed vs preserved?**
A: See [01-scope-analysis.md](./01-scope-analysis.md)

**Q: How do I test?**
A: See [06-verification-plan.md](./06-verification-plan.md)

## 🎉 Success Criteria

You've successfully completed the removal when:

✅ All tests pass
✅ Search works (podcasts, courses, videos)
✅ Podcasts browsable and playable
✅ Courses browsable
✅ User profiles work (no discussion history)
✅ No errors in logs
✅ Removed URLs return 404
✅ Documentation updated

## 🔄 Version History

- **v1.0** (2024-12-08): Initial comprehensive documentation
  - 10 documents
  - ~4,700 lines
  - Complete removal plan
  - AI agent instructions
  - Rollback procedures

## 📝 Document Maintenance

This documentation should be updated if:
- Removal process is attempted and new issues discovered
- Codebase structure changes significantly
- New tools or approaches are developed
- Rollback procedures are tested/refined

## 🏁 Ready to Start?

1. **For first-time readers**: Start with [README.md](./README.md)
2. **For developers**: Jump to [09-quick-reference.md](./09-quick-reference.md)
3. **For AI tools**: Use [08-ai-agent-guide.md](./08-ai-agent-guide.md)
4. **For QA**: Begin with [06-verification-plan.md](./06-verification-plan.md)

---

**Good luck! This is a significant undertaking, but with this documentation, you have everything you need to succeed.** 🚀
