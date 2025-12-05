# Phase 1: Database Schema Design
**Duration:** 1 week  
**Dependencies:** None  
**Objective:** Update existing Django models to support read-only archive

## ⚠️ Important: Current Codebase State

**This phase updates EXISTING models, not creating new ones.**

### Current State (as of 2024-12-05)
- ✅ Models exist: `Channel`, `Post`, `Comment` in `channels/models.py`
- ✅ Using `Base36IntegerField` for `post_id` and `comment_id` (unique=True)
- ✅ `score` field exists as `BigIntegerField(null=True)` on Post and Comment
- ✅ `plain_text` exists as `@property` on Post (lines 267-275)
- ❌ No `reddit_id` CharField fields
- ❌ No `archived_on` fields
- ❌ No `CommentTreeNode` model
- ❌ No django-treebeard dependency

## Overview

This phase updates existing Django models to support a read-only archive. The key changes are:

1. **Add `reddit_id` fields** - New CharField to store base36 Reddit IDs for reference
2. **Modify `score` fields** - Make non-nullable with default=0
3. **Add `archived_on` fields** - Track when content was archived
4. **Convert `plain_text` to stored field** - Stop computing on every read
5. **Create `CommentTreeNode` model** - New model for efficient tree traversal
6. **Add database indexes** - Optimize read performance

**Critical:** We keep existing `post_id` and `comment_id` fields during migration, removing them only after data migration completes (Phase 2).

## Technical Requirements

### 1. Update Existing Models

#### 1.1 Update Channel Model
**File:** `channels/models.py` (starts at line 134)

**Current state:**
```python
class Channel(TimestampedModel):
    name = models.CharField(unique=True, max_length=100)
    title = models.CharField(max_length=100, null=True)
    # ... other fields exist ...
    allowed_post_types = BitField(flags=VALID_EXTENDED_POST_CHOICES, null=True)
    channel_type = models.CharField(max_length=20, choices=VALID_CHANNEL_CHOICES, null=True)
```

**Changes needed:**
```python
class Channel(TimestampedModel):
    # ... existing fields stay ...
    
    # ADD these new fields:
    reddit_id = models.CharField(
        max_length=20, 
        null=True, 
        blank=True, 
        unique=True,
        db_index=True,
        help_text="Original Reddit subreddit ID (base36)"
    )
    archived_on = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Timestamp when this channel was archived from Reddit"
    )
    
    # KEEP allowed_post_types for now (remove in Phase 7)
    # KEEP all existing fields
```

#### 1.2 Update Post Model
**File:** `channels/models.py` (starts at line 243)

**Current state:**
```python
class Post(TimestampedModel):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    author = models.ForeignKey(User, null=True, on_delete=models.CASCADE)
    link_meta = models.ForeignKey(LinkMeta, null=True, on_delete=models.CASCADE)
    
    post_id = Base36IntegerField(unique=True)  # Current primary identifier
    post_type = models.CharField(max_length=10, choices=VALID_EXTENDED_POST_CHOICES, null=True)
    
    title = models.CharField(max_length=300, null=True)
    text = models.TextField(null=True)
    preview_text = models.TextField(null=True)
    url = models.URLField(max_length=2048, null=True)
    score = models.BigIntegerField(null=True)  # ALREADY EXISTS
    num_comments = models.BigIntegerField(null=True)
    edited = models.BooleanField(null=True)
    removed = models.BooleanField(null=True)
    deleted = models.BooleanField(null=True)
    
    @property
    def plain_text(self):  # Currently computed on every access
        # ... computation logic ...
```

**Changes needed:**
```python
class Post(TimestampedModel):
    # ... existing fields stay ...
    
    # KEEP post_id for now (will remove in Phase 7 after migration)
    post_id = Base36IntegerField(unique=True)
    
    # ADD reddit_id (will eventually replace post_id)
    reddit_id = models.CharField(
        max_length=20,
        null=True,  # Null during migration, make non-null after
        blank=True,
        unique=True,
        db_index=True,
        help_text="Original Reddit post ID (base36)"
    )
    
    # MODIFY score: make non-nullable with default
    # Change from: score = models.BigIntegerField(null=True)
    # To:
    score = models.IntegerField(default=0, help_text="Score frozen at archive time")
    
    # ADD plain_text as stored field (remove @property)
    plain_text = models.TextField(
        null=True,
        blank=True,
        help_text="Cached plain text version for search/display"
    )
    
    # ADD archived_on
    archived_on = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when this post was archived from Reddit"
    )
    
    # ADD created field if not exists (check current model first)
    created = models.DateTimeField(
        null=True,  # Nullable for migration, populate from Reddit
        db_index=True
    )
    
    # REMOVE @property plain_text method (move logic to migration)
```

#### 1.3 Update Comment Model
**File:** `channels/models.py` (starts at line 305)

**Current state:**
```python
class Comment(TimestampedModel):
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    author = models.ForeignKey(User, null=True, on_delete=models.CASCADE)
    
    comment_id = Base36IntegerField(unique=True)  # Current primary identifier
    parent_id = Base36IntegerField(null=True)
    
    text = models.TextField(null=True)
    score = models.BigIntegerField(null=True)  # ALREADY EXISTS
    edited = models.BooleanField(null=True)
    removed = models.BooleanField(null=True)
    deleted = models.BooleanField(null=True)
```

**Changes needed:**
```python
class Comment(TimestampedModel):
    # ... existing fields stay ...
    
    # KEEP comment_id for now (will remove in Phase 7)
    comment_id = Base36IntegerField(unique=True)
    
    # ADD reddit_id (will eventually replace comment_id)
    reddit_id = models.CharField(
        max_length=20,
        null=True,  # Null during migration
        blank=True,
        unique=True,
        db_index=True,
        help_text="Original Reddit comment ID (base36)"
    )
    
    # MODIFY parent_id to store reddit_id of parent (CharField not Base36)
    # Keep old parent_id temporarily, add new one:
    parent_reddit_id = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        db_index=True,
        help_text="Parent comment reddit_id (CharField)"
    )
    
    # MODIFY score: make non-nullable with default
    score = models.IntegerField(default=0, help_text="Score frozen at archive time")
    
    # ADD created field if not exists
    created = models.DateTimeField(
        null=True,  # Nullable for migration
        db_index=True
    )
    
    # ADD archived_on
    archived_on = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when this comment was archived from Reddit"
    )
```

#### 1.4 Create CommentTreeNode Model
**File:** `channels/models.py`

**Changes:**
- Remove dependency on Reddit IDs
- Simplify to read-only fields
- Keep existing fields that contain valuable metadata

**Current Channel Model Issues:**
- Primary key should be auto-incrementing, not Reddit-based
- `allowed_post_types` not needed for read-only archive

**Required Changes:**
```python
class Channel(TimestampedModel):
    """Channel model - read-only archive"""
    # Change from implicit to explicit auto ID
    id = models.AutoField(primary_key=True)
    
    # Keep existing fields
    name = models.CharField(unique=True, max_length=100)
    title = models.CharField(max_length=100, null=True)
    membership_is_managed = models.BooleanField(default=False)
    
    # Images
    avatar = models.ImageField(null=True, max_length=2083, upload_to=avatar_uri)
    avatar_small = models.ImageField(null=True, max_length=2083, upload_to=avatar_uri_small, blank=True)
    avatar_medium = models.ImageField(null=True, max_length=2083, upload_to=avatar_uri_medium, blank=True)
    banner = models.ImageField(null=True, max_length=2083, upload_to=banner_uri)
    
    # Metadata
    public_description = models.TextField(blank=True)
    channel_type = models.CharField(max_length=50, choices=VALID_CHANNEL_CHOICES)
    
    # Archive metadata
    reddit_id = models.CharField(max_length=20, null=True, blank=True, help_text="Original Reddit ID for reference")
    archived_on = models.DateTimeField(null=True, blank=True, help_text="Date this channel was archived from Reddit")
    
    # REMOVE: allowed_post_types (BitField) - not needed for read-only
    
    # Keep widget_list if needed for display
    widget_list = models.OneToOneField(...)
```

#### 1.2 Update Post Model
**File:** `channels/models.py`

**Changes:**
- Make `id` the primary key (auto-increment)
- Add `reddit_id` field to preserve original Reddit post ID
- Add `score` as static field (frozen at migration)
- Simplify text fields
- Remove voting-related fields

**Current Post Model Issues:**
- `post_id` uses Base36IntegerField tied to Reddit
- No static score field
- Multiple text representations need consolidation

**Required Changes:**
```python
class Post(TimestampedModel):
    """Post model - read-only archive"""
    # New auto-incrementing primary key
    id = models.AutoField(primary_key=True)
    
    # Original Reddit ID for reference
    reddit_id = models.CharField(max_length=20, unique=True, db_index=True, 
                                  help_text="Original Reddit post ID (base36)")
    
    # Relationships
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='posts')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='posts')
    
    # Content
    title = models.CharField(max_length=300)
    url = models.URLField(null=True, max_length=2083)
    text = models.TextField(null=True, blank=True)  # For text/article posts
    plain_text = models.TextField(null=True, blank=True, help_text="Plain text version for search/display")
    post_type = models.CharField(max_length=50)
    
    # Article support
    article = models.OneToOneField(Article, null=True, on_delete=models.SET_NULL, related_name='post')
    link_meta = models.OneToOneField(LinkMeta, null=True, on_delete=models.SET_NULL)
    
    # Static metadata (frozen at migration)
    score = models.IntegerField(default=0, help_text="Score frozen at archive time")
    num_comments = models.IntegerField(default=0)
    created = models.DateTimeField(db_index=True)
    
    # Moderation flags (frozen state)
    removed = models.BooleanField(default=False)
    deleted = models.BooleanField(default=False)
    stickied = models.BooleanField(default=False)
    
    # Archive metadata
    archived_on = models.DateTimeField(null=True, blank=True)
    
    # REMOVE: upvoted (was user-specific, not needed)
    # REMOVE: thumbnail (can derive from link_meta)
    
    class Meta:
        indexes = [
            models.Index(fields=['channel', '-score', '-created']),
            models.Index(fields=['author', '-created']),
            models.Index(fields=['-created']),
            models.Index(fields=['-score']),
        ]
```

#### 1.3 Update Comment Model
**File:** `channels/models.py`

**Changes:**
- Make `id` the primary key (auto-increment)
- Add `reddit_id` field to preserve original Reddit comment ID
- Add `score` as static field
- Simplify metadata

**Required Changes:**
```python
class Comment(TimestampedModel):
    """Comment model - read-only archive"""
    # New auto-incrementing primary key
    id = models.AutoField(primary_key=True)
    
    # Original Reddit ID for reference
    reddit_id = models.CharField(max_length=20, unique=True, db_index=True,
                                  help_text="Original Reddit comment ID (base36)")
    
    # Relationships
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='comments')
    parent_id = models.CharField(max_length=20, null=True, blank=True, 
                                  help_text="Parent comment reddit_id")
    
    # Content
    text = models.TextField()
    
    # Static metadata (frozen at migration)
    score = models.IntegerField(default=0, help_text="Score frozen at archive time")
    created = models.DateTimeField(db_index=True)
    
    # Flags (frozen state)
    removed = models.BooleanField(default=False)
    deleted = models.BooleanField(default=False)
    edited = models.BooleanField(default=False)
    
    # Archive metadata
    archived_on = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['post', '-score', '-created']),
            models.Index(fields=['author', '-created']),
        ]
```

#### 1.4 Create CommentTreeNode Model
**File:** `channels/models.py` or new `channels/comment_tree.py`

**This is a NEW model** (doesn't exist yet)

**Location:** Add after Comment model definition in `channels/models.py`

```python
from treebeard.mp_tree import MP_Node

class CommentTreeNode(MP_Node):
    """
    Materialized path tree for comments sorted by score.
    One tree per post for efficient traversal.
    
    Uses django-treebeard for tree operations.
    Each post has one root node (comment=None) with all comments as descendants.
    """
    # Customize alphabet for PostgreSQL efficiency (62 chars)
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    
    # Post relationship
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='tree_nodes',
        db_index=True,
        help_text="Post this tree belongs to"
    )
    
    # Comment relationship (null for root node)
    comment = models.OneToOneField(
        Comment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tree_node',
        help_text="Comment this node represents (null for root)"
    )
    
    # Denormalized sort fields (frozen at archive time)
    score = models.IntegerField(
        default=0,
        help_text="Denormalized score for sorting"
    )
    created = models.DateTimeField(
        help_text="Denormalized created timestamp for sorting"
    )
    
    # Tree sorting: score DESC, then created DESC (newest first if tied)
    node_order_by = ['-score', '-created']
    
    class Meta:
        indexes = [
            models.Index(fields=['post', 'path'], name='tree_post_path_idx'),
            models.Index(fields=['post', 'depth'], name='tree_post_depth_idx'),
        ]
        verbose_name = 'Comment Tree Node'
        verbose_name_plural = 'Comment Tree Nodes'
    
    def __str__(self):
        if self.comment:
            return f"TreeNode for Comment {self.comment.reddit_id or self.comment.comment_id}"
        return f"Root TreeNode for Post {self.post.reddit_id or self.post.post_id}"
```

**Note:** Treebeard's `MP_Node` provides these fields automatically:
- `path` - CharField for materialized path
- `depth` - PositiveIntegerField for tree depth
- `numchild` - PositiveIntegerField for number of children
- `id` - AutoField primary key

### 2. What NOT to Remove (Keep for Migration)

**CRITICAL:** Do not remove these during Phase 1. They will be removed in Phase 7 after migration completes.

#### Keep These Models
- ✅ `RedditRefreshToken` - Remove in Phase 7
- ✅ `RedditAccessToken` - Remove in Phase 7  
- ✅ `Subscription` - Remove in Phase 7
- ✅ `Base36IntegerField` class - Remove in Phase 7

#### Keep These Fields
- ✅ `Post.post_id` (Base36IntegerField) - Remove in Phase 7 after data migration
- ✅ `Comment.comment_id` (Base36IntegerField) - Remove in Phase 7 after data migration
- ✅ `Comment.parent_id` (Base36IntegerField) - Remove in Phase 7 after switching to parent_reddit_id
- ✅ `Channel.allowed_post_types` (BitField) - Remove in Phase 7 if not needed

#### Keep These Imports
- ✅ `import base36` - Remove in Phase 7
- ✅ `from bitfield import BitField` - Remove in Phase 7 if allowed_post_types removed

**Rationale:** These are needed for the data migration in Phase 2. We populate both old and new fields during migration, then verify everything works with new fields before removing old ones.

---

### 3. Dependencies

#### 3.1 Add django-treebeard
**File:** `channels/models.py`

Remove these models entirely:
```python
# REMOVE: Reddit authentication
class RedditRefreshToken(models.Model):
    # Delete entire model

class RedditAccessToken(models.Model):
    # Delete entire model

# REMOVE: Voting (not needed for read-only)
# Note: These may not exist yet, but document that they should NOT be created
# class PostVote - DO NOT CREATE
# class CommentVote - DO NOT CREATE

# REMOVE: Reporting (not needed for read-only)
# class ContentReport - DO NOT CREATE

# REMOVE: Base36IntegerField custom field
class Base36IntegerField(models.BigIntegerField):
    # Delete entire class - use CharField for reddit_id instead
```

#### 2.2 Subscription Models
**File:** `channels/models.py`

**Decision:** Keep `ChannelSubscription` but remove `Subscription`

```python
# KEEP: ChannelSubscription (users can track viewed channels)
class ChannelSubscription(TimestampedModel):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    # Keep as-is

# REMOVE: Content subscriptions (no notifications in archive)
class Subscription(TimestampedModel):
    # Delete entire model - no post/comment notifications needed
```

### 4. Create Django Migrations

#### 4.1 Migration Strategy

Create migrations in this specific order to avoid dependency issues:

**Migration 1: Add reddit_id and archived_on fields**
- Add `reddit_id` to Post (CharField, null=True, unique=True)
- Add `reddit_id` to Comment (CharField, null=True, unique=True)
- Add `reddit_id` to Channel (CharField, null=True, unique=True)
- Add `parent_reddit_id` to Comment (CharField, null=True)
- Add `archived_on` to Post, Comment, Channel (DateTimeField, null=True)
- Add `created` to Post and Comment if not exists (DateTimeField, null=True)

**Migration 2: Add plain_text stored field**
- Add `plain_text` to Post (TextField, null=True)
- Data migration to populate from existing @property logic (optional, can do in Phase 2)

**Migration 3: Modify score fields**
- Alter Post.score: set default=0 (keep null=True for now)
- Alter Comment.score: set default=0 (keep null=True for now)
- Note: Make non-nullable after data migration in Phase 2

**Migration 4: Create CommentTreeNode model**
- Create CommentTreeNode with treebeard MP_Node fields
- Add custom indexes

**Migration 5: Add performance indexes**
- Create indexes on Post (reddit_id, created, score, channel+score+created)
- Create indexes on Comment (reddit_id, created, score, post+score+created)
- Create indexes on CommentTreeNode (post+path, post+depth)

#### 4.2 Example Migration Files

**Migration 0001_add_reddit_id_fields.py:**
```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('channels', 'XXXX_previous_migration'),  # Find actual previous migration
    ]
    
    operations = [
        # Add reddit_id fields
        migrations.AddField(
            model_name='post',
            name='reddit_id',
            field=models.CharField(
                max_length=20, 
                null=True, 
                blank=True, 
                unique=True, 
                db_index=True,
                help_text="Original Reddit post ID (base36)"
            ),
        ),
        migrations.AddField(
            model_name='comment',
            name='reddit_id',
            field=models.CharField(
                max_length=20, 
                null=True, 
                blank=True, 
                unique=True, 
                db_index=True,
                help_text="Original Reddit comment ID (base36)"
            ),
        ),
        migrations.AddField(
            model_name='channel',
            name='reddit_id',
            field=models.CharField(
                max_length=20, 
                null=True, 
                blank=True, 
                unique=True, 
                db_index=True,
                help_text="Original Reddit subreddit ID (base36)"
            ),
        ),
        
        # Add parent_reddit_id to Comment
        migrations.AddField(
            model_name='comment',
            name='parent_reddit_id',
            field=models.CharField(
                max_length=20, 
                null=True, 
                blank=True, 
                db_index=True,
                help_text="Parent comment reddit_id (CharField)"
            ),
        ),
        
        # Add archived_on fields
        migrations.AddField(
            model_name='channel',
            name='archived_on',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='post',
            name='archived_on',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='comment',
            name='archived_on',
            field=models.DateTimeField(null=True, blank=True),
        ),
        
        # Add created fields if not exists
        # Check if these exist first, add only if needed
        migrations.AddField(
            model_name='post',
            name='created',
            field=models.DateTimeField(null=True, db_index=True),
        ),
        migrations.AddField(
            model_name='comment',
            name='created',
            field=models.DateTimeField(null=True, db_index=True),
        ),
    ]
```

**Migration 0002_add_plain_text_field.py:**
```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('channels', '0001_add_reddit_id_fields'),
    ]
    
    operations = [
        migrations.AddField(
            model_name='post',
            name='plain_text',
            field=models.TextField(
                null=True, 
                blank=True,
                help_text="Cached plain text version for search/display"
            ),
        ),
    ]
```

**Migration 0003_modify_score_defaults.py:**
```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('channels', '0002_add_plain_text_field'),
    ]
    
    operations = [
        # Add default to score fields (keep nullable for now)
        migrations.AlterField(
            model_name='post',
            name='score',
            field=models.IntegerField(default=0, null=True),
        ),
        migrations.AlterField(
            model_name='comment',
            name='score',
            field=models.IntegerField(default=0, null=True),
        ),
    ]
```

**Migration 0004_create_comment_tree.py:**
```python
from django.db import migrations, models
import treebeard.mp_tree

class Migration(migrations.Migration):
    dependencies = [
        ('channels', '0003_modify_score_defaults'),
    ]
    
    operations = [
        migrations.CreateModel(
            name='CommentTreeNode',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('path', models.CharField(max_length=255, unique=True)),
                ('depth', models.PositiveIntegerField()),
                ('numchild', models.PositiveIntegerField(default=0)),
                ('score', models.IntegerField(default=0, help_text='Denormalized score for sorting')),
                ('created', models.DateTimeField(help_text='Denormalized created timestamp for sorting')),
                ('comment', models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=models.CASCADE,
                    related_name='tree_node',
                    to='channels.comment',
                    help_text='Comment this node represents (null for root)'
                )),
                ('post', models.ForeignKey(
                    on_delete=models.CASCADE,
                    related_name='tree_nodes',
                    to='channels.post',
                    help_text='Post this tree belongs to'
                )),
            ],
            options={
                'verbose_name': 'Comment Tree Node',
                'verbose_name_plural': 'Comment Tree Nodes',
            },
            bases=(treebeard.mp_tree.MP_Node, models.Model),
        ),
    ]
```

**Migration 0005_add_performance_indexes.py:**
```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('channels', '0004_create_comment_tree'),
    ]
    
    operations = [
        # Post indexes
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['channel', '-score', '-created'], name='post_chan_score_idx'),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['author', '-created'], name='post_author_idx'),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['-created'], name='post_created_idx'),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['-score'], name='post_score_idx'),
        ),
        
        # Comment indexes
        migrations.AddIndex(
            model_name='comment',
            index=models.Index(fields=['post', '-score', '-created'], name='comment_post_score_idx'),
        ),
        migrations.AddIndex(
            model_name='comment',
            index=models.Index(fields=['author', '-created'], name='comment_author_idx'),
        ),
        
        # CommentTreeNode indexes (some already in model Meta, verify)
        migrations.AddIndex(
            model_name='commenttreenode',
            index=models.Index(fields=['post', 'path'], name='tree_post_path_idx'),
        ),
        migrations.AddIndex(
            model_name='commenttreenode',
            index=models.Index(fields=['post', 'depth'], name='tree_post_depth_idx'),
        ),
    ]
```

#### 4.3 Testing Migrations

**Test on clean database:**
```bash
# Create test database
python manage.py migrate --run-syncdb

# Apply migrations
python manage.py migrate channels

# Verify models created
python manage.py shell
>>> from channels.models import Post, Comment, CommentTreeNode
>>> Post._meta.get_field('reddit_id')
>>> CommentTreeNode._meta.get_field('path')
```

**Test on copy of production data:**
```bash
# Restore production snapshot to staging
pg_restore -d staging_db production_snapshot.dump

# Apply migrations
python manage.py migrate channels

# Verify data intact
python manage.py shell
>>> from channels.models import Post, Comment
>>> Post.objects.count()  # Should match pre-migration count
>>> Comment.objects.count()  # Should match pre-migration count
```

**File:** `pyproject.toml`

Add to dependencies:
```toml
[tool.poetry.dependencies]
django-treebeard = "^4.7.0"
```

Run:
```bash
poetry add django-treebeard
```

#### 5.2 Update Settings

**File:** `open_discussions/settings.py`

Add to `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    # ...
    'treebeard',
    # ...
]
```

## Testing Requirements

### 1. Model Tests

**File:** `channels/models_test.py`

Create tests for:
- New field validations
- reddit_id uniqueness constraints
- CommentTreeNode creation and traversal
- Index usage verification

```python
def test_post_reddit_id_unique():
    """Test that reddit_id must be unique"""
    post1 = PostFactory(reddit_id='abc123')
    with pytest.raises(IntegrityError):
        PostFactory(reddit_id='abc123')

def test_comment_tree_node_creation():
    """Test creating a comment tree"""
    post = PostFactory()
    root = CommentTreeNode.add_root(post=post, score=0)
    
    comment1 = CommentFactory(post=post, score=10)
    node1 = root.add_child(comment=comment1, score=10, created=comment1.created)
    
    assert node1.get_parent() == root
    assert node1.comment == comment1

def test_comment_tree_sorting():
    """Test that comments are sorted by score"""
    post = PostFactory()
    root = CommentTreeNode.add_root(post=post, score=0)
    
    # Add comments with different scores
    c1 = CommentFactory(post=post, score=5)
    c2 = CommentFactory(post=post, score=10)
    c3 = CommentFactory(post=post, score=3)
    
    root.add_child(comment=c1, score=5, created=c1.created)
    root.add_child(comment=c2, score=10, created=c2.created)
    root.add_child(comment=c3, score=3, created=c3.created)
    
    children = root.get_children()
    # Should be sorted: c2 (10), c1 (5), c3 (3)
    assert children[0].comment == c2
    assert children[1].comment == c1
    assert children[2].comment == c3
```

### 2. Migration Tests

**File:** `channels/migrations_test.py`

Create tests to verify:
- Migrations apply cleanly
- Indexes are created
- Old models are removed

```python
def test_migrations_apply():
    """Test that all migrations apply successfully"""
    call_command('migrate', 'channels', verbosity=0)

def test_comment_tree_model_exists():
    """Test CommentTreeNode model is created"""
    from channels.models import CommentTreeNode
    assert CommentTreeNode is not None
```

### 3. Performance Tests

Create benchmark tests:
- Tree traversal performance
- Comment listing queries
- Index usage verification

## Deliverables

### Code Changes
- [ ] Updated `channels/models.py` with new schema
- [ ] Created `channels/comment_tree.py` (if separating tree logic)
- [ ] Created all migration files
- [ ] Updated `pyproject.toml` with django-treebeard
- [ ] Updated `open_discussions/settings.py`

### Tests
- [ ] Model tests for new fields
- [ ] CommentTreeNode tests
- [ ] Migration tests
- [ ] Performance benchmarks

### Documentation
- [ ] Updated model docstrings
- [ ] Database schema diagram
- [ ] Migration guide
- [ ] Index optimization notes

## Success Criteria

- [ ] All migrations run successfully on clean database
- [ ] All tests pass
- [ ] CommentTreeNode can create and traverse trees
- [ ] Indexes are created and used by queries
- [ ] No Reddit-specific fields remain (except reference fields)
- [ ] Models support read-only archive requirements

## Notes for Implementation

1. **Keep existing fields initially:** Don't delete `post_id` and `comment_id` fields until after data migration (Phase 2)
2. **reddit_id as varchar:** Use CharField instead of Base36IntegerField for simplicity
3. **Tree performance:** django-treebeard is battle-tested; use their recommended approach
4. **Backward compatibility:** Keep migrations reversible where possible
5. **Testing:** Test migrations on copy of production data if possible

## Related Issues

- Blocks Phase 2 (Data Migration)
- Related to cleanup of Base36IntegerField
- Related to removal of PRAW dependencies (later phases)
