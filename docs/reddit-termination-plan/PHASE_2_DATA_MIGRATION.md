# Phase 2: One-Time Data Migration
**Duration:** 2-3 weeks  
**Dependencies:** Phase 1 (Schema) must be complete  
**Objective:** Export all data from Reddit to new database schema

## Overview

This phase performs a one-time export of all content from Reddit to the new database schema. Since this is a read-only archive, we don't need dual-write complexity - just a straightforward data export with frozen scores.

## Prerequisites

- [ ] Phase 1 migrations applied to database
- [ ] django-treebeard installed and configured
- [ ] Reddit API access still available
- [ ] Sufficient database storage for all content
- [ ] Backup of current database

## Data Migration Strategy

### 1. Migration Order

Execute migrations in this specific order to maintain referential integrity:

1. **Users** - Ensure all authors exist
2. **Channels** - Channel metadata
3. **Posts** - All posts with frozen scores
4. **Comments** - All comments with frozen scores
5. **Comment Trees** - Build MaterializedPath trees
6. **Relationships** - Moderators, contributors
7. **Metadata** - Widget lists, channel subscriptions

### 2. Migration Commands

Create Django management commands for each migration step.

## Implementation

### 1. Create Base Migration Command

**File:** `channels/management/commands/_base_reddit_export.py`

```python
"""Base class for Reddit export commands"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from channels.api import get_admin_api

logger = logging.getLogger(__name__)

class BaseRedditExportCommand(BaseCommand):
    """Base class with common export functionality"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.api = None
        self.export_timestamp = None
        self.stats = {
            'processed': 0,
            'created': 0,
            'updated': 0,
            'errors': 0,
            'skipped': 0
        }
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Batch size for bulk operations'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of items to process (for testing)'
        )
    
    def setup(self, options):
        """Initialize API and timestamp"""
        self.api = get_admin_api()
        self.export_timestamp = timezone.now()
        self.dry_run = options['dry_run']
        self.batch_size = options['batch_size']
        self.limit = options['limit']
        
        if self.dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
    
    def log_progress(self, message, level='info'):
        """Log progress with stats"""
        stats_str = f"Processed: {self.stats['processed']}, Created: {self.stats['created']}, Errors: {self.stats['errors']}"
        full_message = f"{message} | {stats_str}"
        
        if level == 'success':
            self.stdout.write(self.style.SUCCESS(full_message))
        elif level == 'error':
            self.stdout.write(self.style.ERROR(full_message))
        elif level == 'warning':
            self.stdout.write(self.style.WARNING(full_message))
        else:
            self.stdout.write(full_message)
    
    def log_final_stats(self):
        """Log final statistics"""
        self.stdout.write(self.style.SUCCESS('\n=== Final Statistics ==='))
        for key, value in self.stats.items():
            self.stdout.write(f"{key.capitalize()}: {value}")
```

### 2. Export Channels

**File:** `channels/management/commands/export_reddit_channels.py`

```python
"""Export channels from Reddit to database"""
from django.db import transaction
from channels.models import Channel
from ._base_reddit_export import BaseRedditExportCommand

class Command(BaseRedditExportCommand):
    help = 'Export all channels from Reddit to database'
    
    def handle(self, *args, **options):
        self.setup(options)
        
        self.stdout.write('Exporting channels from Reddit...')
        
        try:
            channels = self.api.list_channels()
            
            for reddit_channel in channels:
                if self.limit and self.stats['processed'] >= self.limit:
                    break
                
                try:
                    self.process_channel(reddit_channel)
                    self.stats['processed'] += 1
                    
                    if self.stats['processed'] % 10 == 0:
                        self.log_progress(f'Processed {self.stats["processed"]} channels')
                        
                except Exception as e:
                    self.stats['errors'] += 1
                    self.stdout.write(
                        self.style.ERROR(f'Error processing channel {reddit_channel.display_name}: {e}')
                    )
            
            self.log_final_stats()
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Fatal error: {e}'))
            raise
    
    def process_channel(self, reddit_channel):
        """Process a single channel"""
        # Extract channel data
        channel_data = {
            'name': reddit_channel.display_name,
            'title': reddit_channel.title,
            'public_description': getattr(reddit_channel, 'public_description', ''),
            'channel_type': reddit_channel.subreddit_type,
            'reddit_id': reddit_channel.id,
            'archived_on': self.export_timestamp,
        }
        
        # Handle images if they exist
        if hasattr(reddit_channel, 'icon_img') and reddit_channel.icon_img:
            # Download and store avatar
            # Note: Implement image download logic
            pass
        
        if hasattr(reddit_channel, 'banner_img') and reddit_channel.banner_img:
            # Download and store banner
            pass
        
        if self.dry_run:
            self.stdout.write(f'Would create/update channel: {channel_data["name"]}')
            self.stats['created'] += 1
            return
        
        # Create or update channel
        with transaction.atomic():
            channel, created = Channel.objects.update_or_create(
                name=channel_data['name'],
                defaults=channel_data
            )
            
            if created:
                self.stats['created'] += 1
            else:
                self.stats['updated'] += 1
```

### 3. Export Posts

**File:** `channels/management/commands/export_reddit_posts.py`

```python
"""Export posts from Reddit to database"""
from django.db import transaction
from django.contrib.auth.models import User
from channels.models import Channel, Post
from channels.utils import render_article_text, markdown_to_plain_text
from ._base_reddit_export import BaseRedditExportCommand

class Command(BaseRedditExportCommand):
    help = 'Export all posts from Reddit to database'
    
    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--channel',
            type=str,
            help='Export posts from specific channel only'
        )
    
    def handle(self, *args, **options):
        self.setup(options)
        
        channel_name = options.get('channel')
        
        if channel_name:
            self.stdout.write(f'Exporting posts from channel: {channel_name}')
            channels = [Channel.objects.get(name=channel_name)]
        else:
            self.stdout.write('Exporting posts from all channels...')
            channels = Channel.objects.all()
        
        for channel in channels:
            self.export_channel_posts(channel)
        
        self.log_final_stats()
    
    def export_channel_posts(self, channel):
        """Export all posts from a channel"""
        self.stdout.write(f'\nProcessing channel: {channel.name}')
        
        try:
            # Get posts from Reddit API
            reddit_channel = self.api.get_channel(channel.name)
            
            # Iterate through all posts (may need pagination)
            for submission in reddit_channel.new(limit=None):
                if self.limit and self.stats['processed'] >= self.limit:
                    break
                
                try:
                    self.process_post(submission, channel)
                    self.stats['processed'] += 1
                    
                    if self.stats['processed'] % 100 == 0:
                        self.log_progress(f'Processed {self.stats["processed"]} posts')
                        
                except Exception as e:
                    self.stats['errors'] += 1
                    self.stdout.write(
                        self.style.ERROR(f'Error processing post {submission.id}: {e}')
                    )
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error fetching posts for {channel.name}: {e}'))
    
    def process_post(self, submission, channel):
        """Process a single post"""
        # Get or create author
        author = None
        if hasattr(submission, 'author') and submission.author:
            try:
                author = User.objects.get(username=submission.author.name)
            except User.DoesNotExist:
                # Create user if doesn't exist
                author = User.objects.create_user(
                    username=submission.author.name,
                    email=f'{submission.author.name}@archived.local'
                )
        
        # Determine post type and extract content
        post_type = 'link' if submission.is_self else 'self'
        text = submission.selftext if submission.is_self else None
        url = None if submission.is_self else submission.url
        
        # Generate plain text version
        plain_text = None
        if text:
            plain_text = markdown_to_plain_text(text)
        
        # Extract post data
        post_data = {
            'reddit_id': submission.id,
            'channel': channel,
            'author': author,
            'title': submission.title,
            'url': url,
            'text': text,
            'plain_text': plain_text,
            'post_type': post_type,
            'score': submission.score,  # Frozen score
            'num_comments': submission.num_comments,
            'created': timezone.datetime.fromtimestamp(submission.created_utc, tz=timezone.utc),
            'removed': submission.banned_by is not None,
            'deleted': submission.author is None,
            'stickied': submission.stickied,
            'archived_on': self.export_timestamp,
        }
        
        if self.dry_run:
            self.stdout.write(f'Would create/update post: {post_data["reddit_id"]}')
            self.stats['created'] += 1
            return
        
        # Create or update post
        with transaction.atomic():
            post, created = Post.objects.update_or_create(
                reddit_id=post_data['reddit_id'],
                defaults=post_data
            )
            
            if created:
                self.stats['created'] += 1
            else:
                self.stats['updated'] += 1
```

### 4. Export Comments

**File:** `channels/management/commands/export_reddit_comments.py`

```python
"""Export comments from Reddit to database"""
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from channels.models import Post, Comment
from ._base_reddit_export import BaseRedditExportCommand

class Command(BaseRedditExportCommand):
    help = 'Export all comments from Reddit to database'
    
    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--post-id',
            type=str,
            help='Export comments from specific post only (reddit_id)'
        )
    
    def handle(self, *args, **options):
        self.setup(options)
        
        post_id = options.get('post_id')
        
        if post_id:
            self.stdout.write(f'Exporting comments from post: {post_id}')
            posts = [Post.objects.get(reddit_id=post_id)]
        else:
            self.stdout.write('Exporting comments from all posts...')
            posts = Post.objects.all()
        
        total_posts = posts.count() if hasattr(posts, 'count') else len(posts)
        self.stdout.write(f'Processing {total_posts} posts')
        
        for idx, post in enumerate(posts, 1):
            if idx % 100 == 0:
                self.stdout.write(f'Processing post {idx}/{total_posts}')
            
            self.export_post_comments(post)
        
        self.log_final_stats()
    
    def export_post_comments(self, post):
        """Export all comments from a post"""
        try:
            # Get submission from Reddit
            submission = self.api.get_submission(post.reddit_id)
            
            # Replace MoreComments to get all comments
            submission.comments.replace_more(limit=None)
            
            # Flatten comment tree and process all comments
            for comment in submission.comments.list():
                if self.limit and self.stats['processed'] >= self.limit:
                    break
                
                try:
                    self.process_comment(comment, post)
                    self.stats['processed'] += 1
                    
                    if self.stats['processed'] % 1000 == 0:
                        self.log_progress(f'Processed {self.stats["processed"]} comments')
                        
                except Exception as e:
                    self.stats['errors'] += 1
                    logger.error(f'Error processing comment {comment.id}: {e}')
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error fetching comments for post {post.reddit_id}: {e}'))
    
    def process_comment(self, reddit_comment, post):
        """Process a single comment"""
        # Get or create author
        author = None
        if hasattr(reddit_comment, 'author') and reddit_comment.author:
            try:
                author = User.objects.get(username=reddit_comment.author.name)
            except User.DoesNotExist:
                author = User.objects.create_user(
                    username=reddit_comment.author.name,
                    email=f'{reddit_comment.author.name}@archived.local'
                )
        
        # Extract parent ID (comment or post)
        parent_id = None
        if reddit_comment.parent_id.startswith('t1_'):  # Comment parent
            parent_id = reddit_comment.parent_id[3:]  # Remove 't1_' prefix
        
        comment_data = {
            'reddit_id': reddit_comment.id,
            'post': post,
            'author': author,
            'parent_id': parent_id,
            'text': reddit_comment.body,
            'score': reddit_comment.score,  # Frozen score
            'created': timezone.datetime.fromtimestamp(reddit_comment.created_utc, tz=timezone.utc),
            'removed': reddit_comment.banned_by is not None,
            'deleted': reddit_comment.body == '[deleted]',
            'edited': reddit_comment.edited is not False,
            'archived_on': self.export_timestamp,
        }
        
        if self.dry_run:
            self.stats['created'] += 1
            return
        
        # Create or update comment
        with transaction.atomic():
            comment, created = Comment.objects.update_or_create(
                reddit_id=comment_data['reddit_id'],
                defaults=comment_data
            )
            
            if created:
                self.stats['created'] += 1
            else:
                self.stats['updated'] += 1
```

### 5. Build Comment Trees

**File:** `channels/management/commands/build_comment_trees.py`

```python
"""Build MaterializedPath trees for comments"""
from django.db import transaction
from collections import defaultdict
from channels.models import Post, Comment, CommentTreeNode
from ._base_reddit_export import BaseRedditExportCommand

class Command(BaseRedditExportCommand):
    help = 'Build comment trees using MaterializedPath structure'
    
    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            '--rebuild',
            action='store_true',
            help='Rebuild trees even if they exist'
        )
        parser.add_argument(
            '--post-id',
            type=str,
            help='Build tree for specific post only'
        )
    
    def handle(self, *args, **options):
        self.setup(options)
        
        rebuild = options['rebuild']
        post_id = options.get('post_id')
        
        if post_id:
            posts = [Post.objects.get(reddit_id=post_id)]
        else:
            posts = Post.objects.all()
        
        total_posts = posts.count() if hasattr(posts, 'count') else len(posts)
        self.stdout.write(f'Building trees for {total_posts} posts')
        
        for idx, post in enumerate(posts, 1):
            if idx % 100 == 0:
                self.stdout.write(f'Processing post {idx}/{total_posts}')
            
            try:
                self.build_post_tree(post, rebuild)
                self.stats['processed'] += 1
            except Exception as e:
                self.stats['errors'] += 1
                self.stdout.write(self.style.ERROR(f'Error building tree for post {post.reddit_id}: {e}'))
        
        self.log_final_stats()
    
    def build_post_tree(self, post, rebuild):
        """Build comment tree for a single post"""
        # Check if tree already exists
        if not rebuild and CommentTreeNode.objects.filter(post=post).exists():
            self.stats['skipped'] += 1
            return
        
        if rebuild:
            # Delete existing tree
            CommentTreeNode.objects.filter(post=post).delete()
        
        # Get all comments for this post
        comments = Comment.objects.filter(post=post).select_related('author')
        
        if not comments.exists():
            # Create just root node for posts with no comments
            if not self.dry_run:
                with transaction.atomic():
                    CommentTreeNode.add_root(
                        post=post,
                        comment=None,
                        score=0,
                        created=post.created
                    )
            self.stats['created'] += 1
            return
        
        if self.dry_run:
            self.stdout.write(f'Would build tree for post {post.reddit_id} with {comments.count()} comments')
            self.stats['created'] += 1
            return
        
        # Build tree structure
        with transaction.atomic():
            # Create root node
            root = CommentTreeNode.add_root(
                post=post,
                comment=None,
                score=0,
                created=post.created
            )
            
            # Group comments by parent
            comment_dict = {c.reddit_id: c for c in comments}
            children_dict = defaultdict(list)
            
            for comment in comments:
                parent_id = comment.parent_id or 'root'
                children_dict[parent_id].append(comment)
            
            # Build tree recursively
            self._build_tree_recursive(root, children_dict, comment_dict, 'root')
            
            self.stats['created'] += 1
    
    def _build_tree_recursive(self, parent_node, children_dict, comment_dict, parent_id):
        """Recursively build tree structure"""
        if parent_id not in children_dict:
            return
        
        # Get children sorted by score (descending)
        children = sorted(
            children_dict[parent_id],
            key=lambda c: (c.score, c.created),
            reverse=True
        )
        
        for comment in children:
            # Add child node
            child_node = parent_node.add_child(
                post=comment.post,
                comment=comment,
                score=comment.score,
                created=comment.created
            )
            
            # Recursively add grandchildren
            self._build_tree_recursive(
                child_node,
                children_dict,
                comment_dict,
                comment.reddit_id
            )
```

### 6. Verification Command

**File:** `channels/management/commands/verify_reddit_export.py`

```python
"""Verify Reddit export data integrity"""
from django.core.management.base import BaseCommand
from channels.models import Channel, Post, Comment, CommentTreeNode

class Command(BaseCommand):
    help = 'Verify data integrity after Reddit export'
    
    def handle(self, *args, **options):
        self.stdout.write('Verifying Reddit export...\n')
        
        errors = []
        
        # Verify channels
        channel_count = Channel.objects.count()
        self.stdout.write(f'✓ Channels: {channel_count}')
        
        # Verify posts
        post_count = Post.objects.count()
        posts_with_reddit_id = Post.objects.filter(reddit_id__isnull=False).count()
        posts_with_score = Post.objects.filter(score__gt=0).count()
        
        self.stdout.write(f'✓ Posts: {post_count}')
        self.stdout.write(f'  - With reddit_id: {posts_with_reddit_id}')
        self.stdout.write(f'  - With score > 0: {posts_with_score}')
        
        if post_count != posts_with_reddit_id:
            errors.append(f'Posts without reddit_id: {post_count - posts_with_reddit_id}')
        
        # Verify comments
        comment_count = Comment.objects.count()
        comments_with_reddit_id = Comment.objects.filter(reddit_id__isnull=False).count()
        
        self.stdout.write(f'✓ Comments: {comment_count}')
        self.stdout.write(f'  - With reddit_id: {comments_with_reddit_id}')
        
        if comment_count != comments_with_reddit_id:
            errors.append(f'Comments without reddit_id: {comment_count - comments_with_reddit_id}')
        
        # Verify comment trees
        posts_with_trees = CommentTreeNode.objects.values('post').distinct().count()
        total_tree_nodes = CommentTreeNode.objects.count()
        
        self.stdout.write(f'✓ Comment Trees: {posts_with_trees} posts')
        self.stdout.write(f'  - Total tree nodes: {total_tree_nodes}')
        
        # Verify tree integrity
        orphaned_comments = Comment.objects.filter(tree_node__isnull=True).count()
        if orphaned_comments > 0:
            errors.append(f'Orphaned comments (no tree node): {orphaned_comments}')
        
        # Report results
        self.stdout.write('\n' + '='*50)
        if errors:
            self.stdout.write(self.style.ERROR('\nERRORS FOUND:'))
            for error in errors:
                self.stdout.write(self.style.ERROR(f'  - {error}'))
        else:
            self.stdout.write(self.style.SUCCESS('\n✓ All verifications passed!'))
```

## Execution Plan

### Step-by-Step Execution

```bash
# 1. Apply Phase 1 migrations first
python manage.py migrate

# 2. Export channels
python manage.py export_reddit_channels

# 3. Export posts (can run per-channel for parallelization)
python manage.py export_reddit_posts

# 4. Export comments (can run per-post for parallelization)
python manage.py export_reddit_comments

# 5. Build comment trees
python manage.py build_comment_trees

# 6. Verify data integrity
python manage.py verify_reddit_export
```

### Testing

```bash
# Test with dry-run and limits
python manage.py export_reddit_channels --dry-run --limit 5
python manage.py export_reddit_posts --dry-run --limit 10
python manage.py export_reddit_comments --dry-run --limit 100
python manage.py build_comment_trees --dry-run --limit 5
```

## Deliverables

- [ ] Base export command class
- [ ] Channel export command
- [ ] Post export command
- [ ] Comment export command
- [ ] Comment tree build command
- [ ] Verification command
- [ ] Export execution scripts
- [ ] Progress monitoring dashboard (optional)

## Success Criteria

- [ ] All channels exported with metadata
- [ ] All posts exported with frozen scores
- [ ] All comments exported with frozen scores
- [ ] Comment trees built for all posts
- [ ] Verification passes with no errors
- [ ] Data counts match Reddit totals
- [ ] All reddit_id fields populated
- [ ] No orphaned records

## Notes

1. **Incremental approach:** Can run commands incrementally (by channel, by post)
2. **Idempotent:** Commands use `update_or_create` to allow re-runs
3. **Error handling:** Commands track errors but continue processing
4. **Performance:** Use bulk operations where possible
5. **Checkpointing:** Consider adding checkpoint/resume capability for large datasets
