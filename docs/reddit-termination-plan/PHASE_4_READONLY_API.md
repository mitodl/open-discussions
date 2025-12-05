# Phase 4: Implement Read-Only API
**Duration:** 2-3 weeks  
**Dependencies:** Phase 3 (Verification) complete  
**Objective:** Replace Reddit API calls with database queries

## Overview

Reimplement the `channels.api.Api` class to read from the database instead of Reddit. Remove all write operations since this is a read-only archive.

## Implementation Strategy

### 1. API Methods to Reimplement (Read-Only)

**Keep and reimplement these methods:**

#### Channel Operations
- `list_channels()` - Query `Channel.objects.all()`
- `get_channel(name)` - Query `Channel.objects.get(name=name)`

#### Post Operations  
- `list_posts(channel_name, listing_params)` - Query posts with pagination/sort
- `front_page(listing_params)` - Query posts across all channels
- `list_user_posts(username, listing_params)` - Filter by author
- `get_post(post_id)` - Query by reddit_id
- `get_submission(submission_id)` - Alias for get_post

#### Comment Operations
- `list_comments(post_id, sort)` - Query CommentTreeNode
- `get_comment(comment_id)` - Query by reddit_id  
- `more_comments(...)` - Paginate through tree children
- `list_user_comments(username, listing_params)` - Filter by author

#### Relationship Queries
- `list_moderators(channel_name)` - Query ChannelGroupRole
- `list_contributors(channel_name)` - Query ChannelGroupRole
- `is_moderator(channel_name, username)` - Check group membership
- `is_subscriber(username, channel_name)` - Check ChannelSubscription

### 2. API Methods to Remove (Write Operations)

**Delete these entirely:**
- ~~`create_channel()`~~
- ~~`update_channel()`~~
- ~~`create_post()`~~
- ~~`update_post()`~~
- ~~`delete_post()`~~
- ~~`pin_post()`~~
- ~~`remove_post()`~~
- ~~`approve_post()`~~
- ~~`create_comment()`~~
- ~~`update_comment()`~~
- ~~`delete_comment()`~~
- ~~`remove_comment()`~~
- ~~`approve_comment()`~~
- ~~All voting methods~~
- ~~All reporting methods~~
- ~~All subscription methods~~
- ~~All moderator/contributor add/remove methods~~

## Key Implementation Examples

### Example 1: list_posts()

**Before (Reddit):**
```python
def list_posts(self, channel_name, listing_params):
    channel = self.get_channel(channel_name)
    return self._get_listing(channel, listing_params)
```

**After (Database):**
```python
def list_posts(self, channel_name, listing_params):
    """List posts from database"""
    before, after, count, sort = listing_params
    
    # Get channel
    channel = Channel.objects.get(name=channel_name)
    
    # Base queryset
    posts = Post.objects.filter(channel=channel).select_related('author', 'channel')
    
    # Apply sorting
    if sort == POSTS_SORT_HOT or sort == POSTS_SORT_TOP:
        posts = posts.order_by('-score', '-created')
    elif sort == POSTS_SORT_NEW:
        posts = posts.order_by('-created')
    
    # Apply pagination
    limit = settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT
    if after:
        # Cursor-based pagination
        cursor_post = Post.objects.get(reddit_id=after)
        posts = posts.filter(created__lt=cursor_post.created)
    if before:
        cursor_post = Post.objects.get(reddit_id=before)
        posts = posts.filter(created__gt=cursor_post.created)
    
    # Return as list (match old API)
    return list(posts[:limit])
```

### Example 2: list_comments()

**Before (Reddit):**
```python
def list_comments(self, post_id, sort):
    submission = self.get_submission(post_id)
    submission.comment_sort = sort
    return submission.comments
```

**After (Database):**
```python
def list_comments(self, post_id, sort):
    """Get comment tree from database"""
    post = Post.objects.get(reddit_id=post_id)
    
    # Get root of comment tree
    root = CommentTreeNode.objects.get(post=post, depth=1)
    
    # Get all descendants with comments
    nodes = root.get_descendants().select_related('comment', 'comment__author')
    
    # Convert to comment objects
    comments = [node.comment for node in nodes if node.comment]
    
    return comments
```

### Example 3: more_comments()

**Implementation:**
```python
def more_comments(self, parent_id, post_id, children, sort):
    """Get more comments (pagination within tree)"""
    post = Post.objects.get(reddit_id=post_id)
    
    if parent_id:
        # Get children of specific comment
        parent_comment = Comment.objects.get(reddit_id=parent_id)
        parent_node = parent_comment.tree_node
    else:
        # Get children of root
        parent_node = CommentTreeNode.objects.get(post=post, depth=1)
    
    # Get child nodes
    child_nodes = parent_node.get_children().select_related('comment', 'comment__author')
    
    # Filter to requested children if specified
    if children:
        child_nodes = child_nodes.filter(comment__reddit_id__in=children)
    
    # Limit results
    limit = settings.OPEN_DISCUSSIONS_REDDIT_COMMENTS_LIMIT
    return list(child_nodes[:limit])
```

## Testing Requirements

### Unit Tests

**File:** `channels/api_readonly_test.py`

```python
def test_list_channels_from_db():
    """Test listing channels from database"""
    ChannelFactory.create_batch(5)
    api = Api(user=None)
    channels = api.list_channels()
    assert len(channels) == 5

def test_list_posts_sorted_by_score():
    """Test posts sorted by score"""
    channel = ChannelFactory()
    PostFactory(channel=channel, score=10)
    PostFactory(channel=channel, score=5)
    PostFactory(channel=channel, score=15)
    
    api = Api(user=None)
    posts = api.list_posts(channel.name, (None, None, None, POSTS_SORT_TOP))
    
    # Should be sorted: 15, 10, 5
    assert posts[0].score == 15
    assert posts[1].score == 10
    assert posts[2].score == 5

def test_list_comments_with_tree():
    """Test comment listing uses tree structure"""
    post = PostFactory()
    root = CommentTreeNode.add_root(post=post)
    
    c1 = CommentFactory(post=post, score=10)
    c2 = CommentFactory(post=post, score=5)
    
    root.add_child(comment=c1, score=10)
    root.add_child(comment=c2, score=5)
    
    api = Api(user=None)
    comments = api.list_comments(post.reddit_id, 'best')
    
    # Should be sorted by score
    assert len(comments) == 2
    assert comments[0].score == 10
```

### Integration Tests

Test full workflows:
- Browse channel → view posts → view comments
- Search by author → view their posts
- Pagination through large result sets

## Deliverables

- [ ] Reimplement `list_channels()` from database
- [ ] Reimplement `get_channel()` from database
- [ ] Reimplement all post listing methods
- [ ] Reimplement all comment listing methods
- [ ] Reimplement pagination (cursor-based)
- [ ] Reimplement relationship queries
- [ ] Remove all write operation methods
- [ ] Remove proxy classes (PostProxy, ChannelProxy)
- [ ] Update all tests to use database
- [ ] Performance optimization (add indexes as needed)

## Success Criteria

- [ ] All read operations work without Reddit
- [ ] Pagination works correctly
- [ ] Comment trees render properly
- [ ] Performance meets targets (<1s for listings)
- [ ] All tests pass
- [ ] No Reddit API calls in logs

## Notes

1. **API Compatibility:** Maintain same method signatures where possible
2. **Return Types:** May need to change from proxy objects to model instances
3. **Pagination:** Implement cursor-based pagination matching Reddit's approach
4. **Caching:** Consider adding caching layer for frequently accessed data
5. **N+1 Queries:** Use select_related() and prefetch_related() extensively

## Related Issues

- Depends on Phase 3 verification
- Blocks Phase 5 (UI updates)
- Related to removal of proxy classes
