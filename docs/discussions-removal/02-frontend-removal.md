# Frontend Removal Plan

## Overview

This document provides step-by-step instructions for removing discussion-related frontend code from the React application.

## Prerequisites

1. Create a git branch: `git checkout -b remove-discussions-frontend`
2. Ensure you have a backup of the current frontend state
3. Have the application running locally for testing

## Phase 1: Remove Pages

### 1.1 Remove Channel Pages

```bash
# Remove channel-specific pages
rm frontends/open-discussions/src/pages/ChannelAboutPage.js
rm frontends/open-discussions/src/pages/ChannelAboutPage_test.js
rm frontends/open-discussions/src/pages/ChannelRouter.js
rm frontends/open-discussions/src/pages/PostDetailSidebar.js

# Remove admin pages
rm frontends/open-discussions/src/pages/admin/CreateChannelPage.js
rm frontends/open-discussions/src/pages/admin/EditChannelBasicPage.js
rm frontends/open-discussions/src/pages/admin/EditChannelBasicPage_test.js
rm frontends/open-discussions/src/pages/admin/EditChannelAppearancePage.js
rm frontends/open-discussions/src/pages/admin/EditChannelAppearancePage_test.js
rm frontends/open-discussions/src/pages/admin/EditChannelContributorsPage.js
rm frontends/open-discussions/src/pages/admin/EditChannelContributorsPage_test.js
rm frontends/open-discussions/src/pages/admin/EditChannelModeratorsPage.js
rm frontends/open-discussions/src/pages/admin/EditChannelModeratorsPage_test.js
rm frontends/open-discussions/src/pages/admin/EditChannelMembershipPage.js
rm frontends/open-discussions/src/pages/admin/ChannelModerationPage.js
rm frontends/open-discussions/src/pages/admin/ChannelModerationPage_test.js
```

### 1.2 Modify HomePage

The HomePage may need modification rather than removal if it shows a mix of content.

**Action**: Open `frontends/open-discussions/src/pages/HomePage.js`

**Changes**:
1. Remove imports related to channels/posts
2. Remove channel/post display components
3. Keep search, podcast, and course sections
4. Update to show learning resources instead of discussion posts

## Phase 2: Remove Components

### 2.1 Remove Channel Components

```bash
rm frontends/open-discussions/src/components/ChannelHeader.js
rm frontends/open-discussions/src/components/ChannelBanner.js
rm frontends/open-discussions/src/components/ChannelAvatar.js
rm frontends/open-discussions/src/components/ChannelNavbar.js
rm frontends/open-discussions/src/components/widgets/ChannelWidgetList.js
```

### 2.2 Remove Post Components

```bash
rm frontends/open-discussions/src/components/CreatePostForm.js
rm frontends/open-discussions/src/components/EditPostForm.js
rm frontends/open-discussions/src/components/CompactPostDisplay.js
rm frontends/open-discussions/src/components/ExpandedPostDisplay.js
rm frontends/open-discussions/src/components/PostList.js
rm frontends/open-discussions/src/components/PostUpvoteButton.js
```

### 2.3 Remove Comment Components

```bash
rm frontends/open-discussions/src/components/Comment.js
rm frontends/open-discussions/src/components/CommentForm.js
rm frontends/open-discussions/src/components/CommentTree.js
rm frontends/open-discussions/src/components/CommentVoteForm.js
rm frontends/open-discussions/src/components/CommentReportDialog.js
rm frontends/open-discussions/src/components/CommentRemovalForm.js
```

### 2.4 Remove Admin Components

```bash
rm frontends/open-discussions/src/components/admin/CreateChannelForm.js
rm frontends/open-discussions/src/components/admin/EditChannelBasicForm.js
rm frontends/open-discussions/src/components/admin/EditChannelAppearanceForm.js
rm frontends/open-discussions/src/components/admin/EditChannelMembersForm.js
rm frontends/open-discussions/src/components/admin/EditChannelNavbar.js
```

### 2.5 Remove Test Files

```bash
# Remove all corresponding test files
find frontends/open-discussions/src/components -name "*Channel*_test.js" -delete
find frontends/open-discussions/src/components -name "*Post*_test.js" -delete
find frontends/open-discussions/src/components -name "*Comment*_test.js" -delete
```

## Phase 3: Remove State Management

### 3.1 Remove Action Files

```bash
rm frontends/open-discussions/src/actions/channel.js
rm frontends/open-discussions/src/actions/post.js
rm frontends/open-discussions/src/actions/comment.js
rm frontends/open-discussions/src/actions/posts_for_channel.js
```

### 3.2 Remove Reducer Files

```bash
rm frontends/open-discussions/src/reducers/channels.js
rm frontends/open-discussions/src/reducers/posts.js
rm frontends/open-discussions/src/reducers/comments.js
rm frontends/open-discussions/src/reducers/posts_for_channel.js
rm frontends/open-discussions/src/reducers/posts_for_channel_test.js
rm frontends/open-discussions/src/reducers/channel_avatar.js
rm frontends/open-discussions/src/reducers/channel_contributors.js
rm frontends/open-discussions/src/reducers/channel_contributors_test.js
rm frontends/open-discussions/src/reducers/channel_invitations.js
rm frontends/open-discussions/src/reducers/channel_invitations_test.js
rm frontends/open-discussions/src/reducers/channel_subscribers.js
rm frontends/open-discussions/src/reducers/post_removed.js
rm frontends/open-discussions/src/reducers/post_removed_test.js
rm frontends/open-discussions/src/reducers/related_posts.js
rm frontends/open-discussions/src/reducers/user_contributions.js
rm frontends/open-discussions/src/reducers/user_contributions_test.js
```

### 3.3 Update Root Reducer

**File**: `frontends/open-discussions/src/reducers/index.js` (or wherever reducers are combined)

**Action**: 
1. Remove imports for deleted reducers
2. Remove them from `combineReducers()` call

```javascript
// REMOVE these imports
import channels from './channels'
import posts from './posts'
import comments from './comments'
// ... etc

// REMOVE from combineReducers
const rootReducer = combineReducers({
  // Remove:
  // channels,
  // posts,
  // comments,
  // ... etc
  
  // Keep:
  auth,
  search,
  profiles,
  // ... etc
})
```

### 3.4 Update Action Index

**File**: `frontends/open-discussions/src/actions/index.js`

**Action**: Remove exports for deleted action files

## Phase 4: Remove API Layer

### 4.1 Remove API Files

```bash
rm frontends/open-discussions/src/lib/api/channels.js
rm frontends/open-discussions/src/lib/api/channels_test.js
rm frontends/open-discussions/src/lib/api/posts.js
rm frontends/open-discussions/src/lib/api/posts_test.js
rm frontends/open-discussions/src/lib/api/comments.js
rm frontends/open-discussions/src/lib/api/comments_test.js
rm frontends/open-discussions/src/lib/api/frontpage.js
rm frontends/open-discussions/src/lib/api/frontpage_test.js
rm frontends/open-discussions/src/lib/api/moderation.js
rm frontends/open-discussions/src/lib/api/moderation_test.js
rm frontends/open-discussions/src/lib/api/embedly.js
rm frontends/open-discussions/src/lib/api/embedly_test.js
```

## Phase 5: Remove Factories

```bash
rm frontends/open-discussions/src/factories/channels.js
rm frontends/open-discussions/src/factories/channels_test.js
rm frontends/open-discussions/src/factories/posts.js
rm frontends/open-discussions/src/factories/posts_test.js
rm frontends/open-discussions/src/factories/comments.js
rm frontends/open-discussions/src/factories/comments_test.js
rm frontends/open-discussions/src/factories/embedly.js
rm frontends/open-discussions/src/factories/reports.js
rm frontends/open-discussions/src/factories/reports_test.js
```

## Phase 6: Remove Type Definitions

```bash
rm frontends/open-discussions/src/flow/discussionTypes.js
```

## Phase 7: Remove Utility Files

### 7.1 Remove Reddit-Specific Utilities

```bash
rm frontends/open-discussions/src/lib/reddit_objects.js
# Remove any markdown utilities specific to discussions
```

### 7.2 Update Markdown.js

**File**: `frontends/open-discussions/src/components/Markdown.js`

**Action**: 
1. Remove import: `import { addEditedMarker } from "../lib/reddit_objects"`
2. Remove usage of `addEditedMarker`

## Phase 8: Remove Hooks

```bash
rm frontends/open-discussions/src/hooks/comments.js
# Remove any other discussion-specific hooks
```

## Phase 9: Update Routing

### 9.1 Update App.js

**File**: `frontends/open-discussions/src/pages/App.js`

**Action**: Remove routes for:
- Channel pages (`/c/:channel_name`)
- Post pages (`/c/:channel_name/:post_id/:slug`)
- Post creation (`/create_post`)
- Channel management (`/manage/c/...`)
- Channel redirect (`/channel/...`)

```javascript
// REMOVE these routes
<Route path="/c/:channel_name/:post_id/:slug" component={...} />
<Route path="/c/:channel_name" component={...} />
<Route path="/create_post" component={...} />
<Route path="/manage/c/edit/:channel_name/:tab" component={...} />
```

### 9.2 Update Navigation

**Files**: Any navigation components (header, sidebar, menu)

**Action**: Remove links to:
- Create channel
- Browse channels
- Create post
- Channel management

## Phase 10: Update Profile Pages

**File**: `frontends/open-discussions/src/pages/ProfilePage.js` (or similar)

**Action**: 
1. Remove tabs/sections showing user posts and comments
2. Keep user information, settings, and non-discussion content
3. Update to show only learning resources, lists, etc.

## Phase 11: Clean Up Search Integration

**File**: `frontends/open-discussions/src/pages/SearchPage.js`

**Action**:
1. Remove post/comment result types from search filters
2. Keep podcast, course, program, video result types
3. Update result display components to handle only preserved types

## Phase 12: Build and Test

### 12.1 Fix Import Errors

After deletions, run the build to find broken imports:

```bash
cd frontends/open-discussions
npm run build
```

Fix any import errors by:
1. Removing imports of deleted files
2. Removing code that depends on deleted modules
3. Updating component props that referenced discussion data

### 12.2 Fix Tests

Run tests to find failures:

```bash
npm test
```

Fix by:
1. Removing tests for deleted components
2. Updating tests that import deleted modules
3. Mocking or removing discussion-related test data

### 12.3 Manual Testing

Start the development server:

```bash
npm run dev
```

Test:
- ✅ Application loads without errors
- ✅ Search works (podcasts, courses, etc.)
- ✅ Podcast pages load and work
- ✅ Profile pages work
- ✅ No broken links or 404s for discussion pages
- ✅ Navigation doesn't show discussion-related items

## Phase 13: Cleanup Package Dependencies

### 13.1 Check for Unused Dependencies

Look for npm packages that were only used for discussions:

```bash
npm ls praw  # If there's a JS Reddit library
npm ls marked  # If only used for discussion markdown
npm ls draftjs  # If only used for post editor
```

### 13.2 Remove Unused Dependencies

If any packages were only used for discussions:

```bash
npm uninstall <package-name>
```

## Rollback Plan

If issues arise:

```bash
# Abort and return to main branch
git checkout main
git branch -D remove-discussions-frontend

# Or revert specific commits
git revert <commit-hash>
```

## Checklist

Before moving to backend removal:

- [ ] All discussion pages removed
- [ ] All discussion components removed
- [ ] All discussion actions/reducers removed
- [ ] All discussion API calls removed
- [ ] Routes updated
- [ ] Navigation updated
- [ ] Profile pages updated
- [ ] Search pages updated
- [ ] Build succeeds without errors
- [ ] Tests pass (excluding removed tests)
- [ ] Manual testing completed
- [ ] No console errors in browser
- [ ] Unused npm packages removed
- [ ] Changes committed to git

## Next Steps

Proceed to [03-backend-removal.md](./03-backend-removal.md) for backend removal instructions.
