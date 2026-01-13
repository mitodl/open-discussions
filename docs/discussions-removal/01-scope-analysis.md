# Scope Analysis: Reddit-Backed Discussion Removal

## Django Apps to Remove

### 1. `channels/` - Primary Discussion App
**Purpose**: Manages channels (subreddits), posts, comments, subscriptions
**Location**: `./channels/`

**Key Components:**
- **Models** (`models.py`, 390 lines):
  - `RedditRefreshToken` - OAuth tokens for Reddit
  - `RedditAccessToken` - Access tokens
  - `Subscription` - User subscriptions to posts/comments
  - `Channel` - Discussion channels (subreddit mirror)
  - `ChannelInvitation` - Invites to private channels
  - `LinkMeta` - Embedly thumbnails for links
  - `Post` - Discussion posts
  - `Article` - Article-type posts
  - `Comment` - Comments on posts
  - `ChannelSubscription` - Channel subscriptions
  - `ChannelGroupRole` - Moderator/contributor roles
  - `ChannelMembershipConfig` - Channel membership settings
  - `SpamCheckResult` - Akismet spam check results

- **API** (`api.py`, 1795 lines):
  - Reddit API integration (praw library)
  - Channel CRUD operations
  - Post CRUD operations
  - Comment CRUD operations
  - Voting functionality
  - Moderation actions
  - Subscription management
  - Role management (moderators, contributors)

- **Tasks** (`tasks.py`, 627 lines):
  - `update_discussion_models` - Sync from Reddit
  - `update_discussion_channels` - Update channel data
  - `send_subscription_email` - Email notifications
  - `update_discussion_posts` - Update post data
  - `populate_post_subscription_memberships` - Subscription sync
  - `check_comments_for_spam` - Spam checking
  - `check_posts_for_spam` - Spam checking
  - Multiple indexing tasks for search

- **Views** (`views/`):
  - `channels.py` - Channel list/detail
  - `posts.py` - Post list/detail
  - `comments.py` - Comment list/detail/more
  - `contributors.py` - Contributor management
  - `moderators.py` - Moderator management
  - `subscribers.py` - Subscriber management
  - `invites.py` - Channel invitations
  - `frontpage.py` - Frontpage feed
  - `reports.py` - Content reporting

- **Serializers** (`serializers/`):
  - `channels.py` - Channel serialization
  - `posts.py` - Post serialization
  - `comments.py` - Comment serialization
  - `invites.py` - Invitation serialization

- **Utilities**:
  - `utils.py` - Reddit slugify, markdown rendering
  - `proxies.py` - Proxy objects for Reddit data
  - `spam.py` - Akismet integration
  - `backpopulate_api.py` - Data backpopulation
  - `membership_api.py` - Membership management

- **Factories** (`factories/`):
  - `reddit.py` - Reddit test factories
  - `models.py` - Model factories for testing

### 2. `discussions/` - Alternative Discussion Implementation
**Purpose**: Non-Reddit discussion implementation (newer)
**Location**: `./discussions/`

**Key Components:**
- **Models** (`models.py`):
  - `Channel` - Alternative channel model
  - Related models for non-Reddit discussions

- **API** (`api/`):
  - Alternative discussion API

**Note**: This appears to be a newer implementation. Verify if it's in use before removing.

### 3. `channels_fields/` - Discussion Field Management
**Purpose**: Custom field management for channels
**Location**: `./channels_fields/`

**Key Components:**
- Field group and role management
- Serializers for custom fields
- Permissions for field management

## Frontend Components to Remove

### Location: `./frontends/open-discussions/src/`

### 1. **Pages** (`pages/`):
- `ChannelAboutPage.js` - Channel about page
- `ChannelRouter.js` - Channel routing
- `PostDetailSidebar.js` - Post detail sidebar
- `HomePage.js` - Frontpage (may need modification, not full removal)
- `admin/CreateChannelPage.js` - Channel creation
- `admin/EditChannelBasicPage.js` - Basic channel settings
- `admin/EditChannelAppearancePage.js` - Channel appearance
- `admin/EditChannelContributorsPage.js` - Contributor management
- `admin/EditChannelModeratorsPage.js` - Moderator management
- `admin/EditChannelMembershipPage.js` - Membership settings
- `admin/ChannelModerationPage.js` - Moderation interface

### 2. **Components** (`components/`):
- `ChannelHeader.js` - Channel header
- `ChannelBanner.js` - Channel banner
- `ChannelAvatar.js` - Channel avatar
- `ChannelNavbar.js` - Channel navigation
- `Comment.js` - Comment display
- `CommentForm.js` - Comment form
- `CommentTree.js` - Comment tree
- `CommentVoteForm.js` - Comment voting
- `CommentReportDialog.js` - Report comments
- `CommentRemovalForm.js` - Remove comments
- `CreatePostForm.js` - Create post
- `EditPostForm.js` - Edit post
- `CompactPostDisplay.js` - Compact post view
- `ExpandedPostDisplay.js` - Full post view
- `PostList.js` - Post list
- `PostUpvoteButton.js` - Post voting
- `widgets/ChannelWidgetList.js` - Channel widgets
- `admin/CreateChannelForm.js` - Create channel form
- `admin/EditChannelBasicForm.js` - Edit channel form
- `admin/EditChannelAppearanceForm.js` - Appearance form
- `admin/EditChannelMembersForm.js` - Members form
- `admin/EditChannelNavbar.js` - Channel admin nav

### 3. **State Management** (`actions/`, `reducers/`):
- `actions/channel.js` - Channel actions
- `actions/post.js` - Post actions
- `actions/comment.js` - Comment actions
- `actions/posts_for_channel.js` - Channel posts
- `reducers/channels.js` - Channel state
- `reducers/posts.js` - Post state
- `reducers/comments.js` - Comment state
- `reducers/posts_for_channel.js` - Channel posts state
- `reducers/channel_avatar.js` - Channel avatar state
- `reducers/channel_contributors.js` - Contributors state
- `reducers/channel_invitations.js` - Invitations state
- `reducers/channel_subscribers.js` - Subscribers state
- `reducers/post_removed.js` - Removed post state
- `reducers/related_posts.js` - Related posts state
- `reducers/user_contributions.js` - User posts/comments

### 4. **API Layer** (`lib/api/`):
- `channels.js` - Channel API calls
- `posts.js` - Post API calls
- `comments.js` - Comment API calls
- `frontpage.js` - Frontpage API
- `moderation.js` - Moderation API
- `embedly.js` - Embedly integration (for link previews)

### 5. **Factories** (`factories/`):
- `channels.js` - Channel test data
- `posts.js` - Post test data
- `comments.js` - Comment test data
- `embedly.js` - Embedly test data

### 6. **Type Definitions** (`flow/`):
- `discussionTypes.js` - Flow types for discussions

### 7. **Utilities** (`lib/`, `util/`):
- `lib/reddit_objects.js` - Reddit object utilities
- Any markdown or comment rendering utilities specific to discussions

## Dependencies in Other Apps

### Search App (`search/`)
**Preserves**: Podcast and course search
**Removes**: Post and comment search

**Files to Modify**:
- `constants.py`:
  - Keep: `PODCAST_TYPE`, `PODCAST_EPISODE_TYPE`, `COURSE_TYPE`, `PROGRAM_TYPE`, etc.
  - Remove: `POST_TYPE`, `COMMENT_TYPE` imports from `channels.constants`
  - Remove: `CONTENT_OBJECT_TYPE` mapping
  - Keep: `PODCAST_OBJECT_TYPE`, `COURSE_OBJECT_TYPE`, etc.

- `serializers.py`:
  - Remove: `OSPostSerializer`, `OSCommentSerializer`
  - Remove: Imports from `channels.models`
  - Keep: `OSPodcastSerializer`, `OSPodcastEpisodeSerializer`, course serializers

- `search_index_helpers.py`:
  - Remove: `serialize_post_for_bulk`, `serialize_comment_for_bulk`
  - Remove: `gen_post_id`, `gen_comment_id`
  - Remove: Reddit object indexing
  - Keep: Podcast and course indexing

- `api.py`:
  - Remove: Channel-based search filtering
  - Keep: General search API

- `tasks.py`:
  - Remove: Post/comment indexing tasks
  - Keep: Podcast/course indexing tasks

### Notifications App (`notifications/`)

**Files to Modify**:
- `notifiers/comments.py`:
  - **REMOVE ENTIRE FILE** - Comment notifications
  - Remove imports from `channels`

### Mail App (`mail/`)

**Files to Modify**:
- Remove discussion-related email templates
- Remove subscription email logic
- Keep: General notification emails

### Profiles App (`profiles/`)

**Files to Modify**:
- `views.py`:
  - Remove: Post and comment display in profiles
  - Remove imports from `channels.models`
  - Keep: User profile display

- `api.py`:
  - Remove: Channel role queries
  - Keep: General profile API

## URL Patterns to Remove

### Django URLs (`open_discussions/urls.py`, `channels/urls.py`):

```python
# Remove these patterns:
- r"^c/(?P<channel_name>...)" - All channel routes
- r"^manage/c/..." - Channel management routes
- r"^create_post/" - Post creation
- r"^channel/" - Channel redirect
- All patterns in channels.urls
- All patterns in channels_fields.urls
```

### Frontend Routes (`Router.js`, `App.js`):

```javascript
// Remove routes for:
- /c/:channel_name - Channel pages
- /c/:channel_name/:post_id/:slug - Post detail
- /create_post - Post creation
- /manage/c/... - Channel management
```

## Database Tables to Remove

From `channels` app:
- `channels_redditrefreshtoken`
- `channels_redditaccesstoken`
- `channels_subscription`
- `channels_channel`
- `channels_channelinvitation`
- `channels_linkmeta`
- `channels_post`
- `channels_article`
- `channels_comment`
- `channels_channelsubscription`
- `channels_channelgrouprole`
- `channels_channelmembershipconfig`
- `channels_spamcheckresult`

From `discussions` app:
- Verify current usage before listing

From `channels_fields` app:
- All custom field tables

## Configuration to Remove

### Environment Variables (`.env`, settings):
- `OPEN_DISCUSSIONS_REDDIT_URL` - Reddit instance URL
- `OPEN_DISCUSSIONS_REDDIT_CLIENT_ID` - Reddit OAuth client
- `OPEN_DISCUSSIONS_REDDIT_SECRET` - Reddit OAuth secret
- `AKISMET_API_KEY` - Spam checking (if only used for discussions)
- `AKISMET_BLOG_URL` - Spam checking

### Django Settings (`open_discussions/settings.py`):
- Remove from `INSTALLED_APPS`:
  - `'channels'`
  - `'channels_fields'`
  - `'discussions'` (verify usage first)

- Remove middleware:
  - `'open_discussions.middleware.channel_api.ChannelApiMiddleware'`

- Remove Celery beat schedules:
  - Discussion update tasks
  - Spam check tasks
  - Subscription email tasks

### Python Dependencies (`pyproject.toml`, `poetry.lock`):
- `praw` - Reddit API wrapper
- `prawcore` - Reddit API core
- `akismet` - Spam detection (if only used for discussions)
- `base36` - Reddit ID encoding

## External Service Dependencies to Remove

1. **Reddit Instance** - No longer needed
2. **Akismet** - If only used for discussion spam
3. **Embedly** - If only used for post link previews (verify usage in other areas)

## Search Index Cleanup

### OpenSearch/Elasticsearch:
- Remove indices or documents for:
  - `POST_TYPE` documents
  - `COMMENT_TYPE` documents
- Keep indices for:
  - `PODCAST_TYPE`
  - `PODCAST_EPISODE_TYPE`
  - `COURSE_TYPE`
  - `PROGRAM_TYPE`
  - `VIDEO_TYPE`
  - `PROFILE_TYPE`
  - User lists

## Testing Artifacts to Remove

- All test files in `channels/` app
- All test files in `discussions/` app
- All test files in `channels_fields/` app
- Frontend test files for removed components
- Cassettes (betamax recordings) for Reddit API calls

## Files Count Summary

**Backend (Python)**:
- `channels/` app: ~50 files
- `discussions/` app: ~10 files
- `channels_fields/` app: ~15 files
- Modifications in other apps: ~20 files

**Frontend (JavaScript/TypeScript)**:
- Components: ~40 files
- Pages: ~15 files
- Actions/Reducers: ~20 files
- API layer: ~8 files
- Factories/Tests: ~30 files

**Total Estimated Files**: ~200+ files to remove or modify

## Next Steps

Proceed to [02-frontend-removal.md](./02-frontend-removal.md) for detailed frontend removal instructions.
