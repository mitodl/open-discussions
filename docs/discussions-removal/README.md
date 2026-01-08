# Reddit-Backed Discussion Functionality Removal Plan

## Overview

This document provides a comprehensive plan for removing Reddit-backed discussion, post, and comment functionality from the Open Discussions application while preserving search and podcast features.

## Purpose

The Open Discussions application currently uses Reddit as a backing store for channels, posts, and comments. This plan outlines the complete removal of this functionality, including:

- Reddit integration and API connections
- Channels (discussion forums)
- Posts and comments
- User subscriptions and roles related to discussions
- Discussion-related UI components
- Discussion-related notifications and emails

**PRESERVE:**
- Search functionality (OpenSearch/Elasticsearch)
- Podcast and podcast episode features
- Course catalog
- User profiles (non-discussion aspects)
- Authentication system

## High-Level Strategy

The removal will be executed in phases to minimize disruption:

1. **Phase 1: Frontend Cleanup** - Remove UI components and routes
2. **Phase 2: Backend API Removal** - Remove Django views and URLs
3. **Phase 3: Django App Removal** - Remove `channels` and `discussions` apps
4. **Phase 4: Database Cleanup** - Remove models and run migrations
5. **Phase 5: Dependency Cleanup** - Update dependent apps
6. **Phase 6: Configuration Cleanup** - Remove settings and environment variables
7. **Phase 7: Testing & Verification** - Ensure search and podcasts still work

## Documentation Structure

- [01-scope-analysis.md](./01-scope-analysis.md) - Detailed analysis of code to be removed
- [02-frontend-removal.md](./02-frontend-removal.md) - Frontend removal instructions
- [03-backend-removal.md](./03-backend-removal.md) - Backend removal instructions
- [04-database-migration.md](./04-database-migration.md) - Database migration plan
- [05-dependency-updates.md](./05-dependency-updates.md) - Updates to dependent code
- [06-verification-plan.md](./06-verification-plan.md) - Testing and verification steps
- [07-rollback-plan.md](./07-rollback-plan.md) - Rollback procedures if needed

## Pre-Requisites

Before starting the removal:

1. **Backup Production Data** - Full database backup
2. **Document Current State** - Screenshots, API endpoints, feature list
3. **Communication** - Notify stakeholders of upcoming changes
4. **Testing Environment** - Ensure dev/staging environment is ready
5. **Version Control** - Create a feature branch for this work

## Estimated Effort

- **Frontend Removal**: 8-12 hours
- **Backend Removal**: 12-16 hours  
- **Database Migration**: 4-6 hours
- **Dependency Updates**: 6-8 hours
- **Testing**: 8-12 hours
- **Total**: 38-54 hours (approximately 5-7 working days)

## Risk Assessment

**High Risk Areas:**
- Search functionality depends on POST_TYPE and COMMENT_TYPE constants
- Notifications system has dependencies on channels
- Profile views display user posts/comments
- Email templates reference channels

**Mitigation:**
- Thorough testing of search with preserved types
- Careful refactoring of profile views
- Update notification system to remove discussion-related notifiers
- Test all email flows

## Success Criteria

The removal is complete when:

1. ✅ Application starts without errors
2. ✅ Search functionality works for courses, podcasts, profiles
3. ✅ Podcast browsing and viewing works
4. ✅ User authentication and profiles work
5. ✅ No Reddit API dependencies remain
6. ✅ All tests pass (excluding removed discussion tests)
7. ✅ No discussion-related UI elements visible
8. ✅ Database has no orphaned discussion data

## Next Steps

Start with [01-scope-analysis.md](./01-scope-analysis.md) to understand the full scope of changes required.
