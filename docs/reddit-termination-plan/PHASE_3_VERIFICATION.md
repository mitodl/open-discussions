# Phase 3: Verification
**Duration:** 1 week  
**Dependencies:** Phase 2 (Data Migration) complete  
**Objective:** Ensure complete and accurate data migration

## Overview

This phase verifies that all data has been accurately migrated from Reddit to the new database schema. Comprehensive verification is critical before switching to the new read-only implementation.

## Verification Areas

### 1. Data Completeness
- All channels migrated
- All posts migrated
- All comments migrated
- All user relationships preserved
- All metadata captured

### 2. Data Accuracy
- Content matches Reddit source
- Scores frozen correctly
- Timestamps preserved
- Relationships intact
- Tree structures valid

### 3. Data Integrity
- No orphaned records
- All foreign keys valid
- Unique constraints satisfied
- Indexes created properly

## Implementation

### 1. Comprehensive Verification Command

**File:** `channels/management/commands/verify_export_comprehensive.py`

```python
"""Comprehensive verification of Reddit export"""
import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from channels.models import Channel, Post, Comment, CommentTreeNode
from channels.api import get_admin_api

class Command(BaseCommand):
    help = 'Comprehensive verification of Reddit export'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--sample-size',
            type=int,
            default=100,
            help='Number of random items to verify in detail'
        )
        parser.add_argument(
            '--verify-content',
            action='store_true',
            help='Verify content matches (slower, requires Reddit API)'
        )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.errors = []
        self.warnings = []
        self.api = None
    
    def handle(self, *args, **options):
        sample_size = options['sample_size']
        verify_content = options['verify_content']
        
        if verify_content:
            self.api = get_admin_api()
        
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(self.style.SUCCESS('Reddit Export Comprehensive Verification'))
        self.stdout.write(self.style.SUCCESS('='*60))
        
        # Run all verification checks
        self.verify_counts()
        self.verify_reddit_ids()
        self.verify_relationships()
        self.verify_scores()
        self.verify_timestamps()
        self.verify_tree_structure()
        self.verify_indexes()
        
        if verify_content:
            self.verify_content_sample(sample_size)
        
        # Report results
        self.report_results()
    
    def verify_counts(self):
        """Verify record counts"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('1. VERIFYING RECORD COUNTS')
        self.stdout.write('='*60)
        
        # Channels
        channel_count = Channel.objects.count()
        self.stdout.write(f'Channels: {channel_count}')
        if channel_count == 0:
            self.errors.append('No channels found in database')
        
        # Posts
        post_count = Post.objects.count()
        self.stdout.write(f'Posts: {post_count}')
        if post_count == 0:
            self.errors.append('No posts found in database')
        
        # Comments
        comment_count = Comment.objects.count()
        self.stdout.write(f'Comments: {comment_count}')
        
        # Users
        user_count = User.objects.count()
        self.stdout.write(f'Users: {user_count}')
        
        # Comment trees
        tree_count = CommentTreeNode.objects.values('post').distinct().count()
        node_count = CommentTreeNode.objects.count()
        self.stdout.write(f'Comment Trees: {tree_count} (total nodes: {node_count})')
        
        # Verify tree coverage
        posts_without_trees = Post.objects.exclude(
            id__in=CommentTreeNode.objects.values_list('post_id', flat=True).distinct()
        ).count()
        
        if posts_without_trees > 0:
            self.errors.append(f'{posts_without_trees} posts missing comment trees')
    
    def verify_reddit_ids(self):
        """Verify all reddit_id fields are populated"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('2. VERIFYING REDDIT IDs')
        self.stdout.write('='*60)
        
        # Posts
        posts_without_reddit_id = Post.objects.filter(reddit_id__isnull=True).count()
        posts_empty_reddit_id = Post.objects.filter(reddit_id='').count()
        total_post_issues = posts_without_reddit_id + posts_empty_reddit_id
        
        self.stdout.write(f'Posts with reddit_id: {Post.objects.count() - total_post_issues}/{Post.objects.count()}')
        
        if total_post_issues > 0:
            self.errors.append(f'{total_post_issues} posts missing reddit_id')
        
        # Comments
        comments_without_reddit_id = Comment.objects.filter(reddit_id__isnull=True).count()
        comments_empty_reddit_id = Comment.objects.filter(reddit_id='').count()
        total_comment_issues = comments_without_reddit_id + comments_empty_reddit_id
        
        self.stdout.write(f'Comments with reddit_id: {Comment.objects.count() - total_comment_issues}/{Comment.objects.count()}')
        
        if total_comment_issues > 0:
            self.errors.append(f'{total_comment_issues} comments missing reddit_id')
        
        # Check for duplicates
        duplicate_post_ids = Post.objects.values('reddit_id').annotate(
            count=models.Count('id')
        ).filter(count__gt=1)
        
        if duplicate_post_ids.exists():
            self.errors.append(f'{duplicate_post_ids.count()} duplicate post reddit_ids')
        
        duplicate_comment_ids = Comment.objects.values('reddit_id').annotate(
            count=models.Count('id')
        ).filter(count__gt=1)
        
        if duplicate_comment_ids.exists():
            self.errors.append(f'{duplicate_comment_ids.count()} duplicate comment reddit_ids')
    
    def verify_relationships(self):
        """Verify foreign key relationships"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('3. VERIFYING RELATIONSHIPS')
        self.stdout.write('='*60)
        
        # Posts without channels
        posts_without_channel = Post.objects.filter(channel__isnull=True).count()
        self.stdout.write(f'Posts with valid channel: {Post.objects.count() - posts_without_channel}/{Post.objects.count()}')
        
        if posts_without_channel > 0:
            self.errors.append(f'{posts_without_channel} posts without channel')
        
        # Comments without posts
        comments_without_post = Comment.objects.filter(post__isnull=True).count()
        self.stdout.write(f'Comments with valid post: {Comment.objects.count() - comments_without_post}/{Comment.objects.count()}')
        
        if comments_without_post > 0:
            self.errors.append(f'{comments_without_post} comments without post')
        
        # Comments with invalid parent_id
        comments_with_parent = Comment.objects.exclude(parent_id__isnull=True).exclude(parent_id='')
        invalid_parents = 0
        
        for comment in comments_with_parent[:1000]:  # Sample check
            if not Comment.objects.filter(reddit_id=comment.parent_id).exists():
                invalid_parents += 1
        
        if invalid_parents > 0:
            self.warnings.append(f'Found {invalid_parents} comments with invalid parent_id (in sample of 1000)')
        
        # Tree nodes without comments (except roots)
        tree_nodes_without_comment = CommentTreeNode.objects.filter(
            comment__isnull=True,
            depth__gt=1  # Roots can be null
        ).count()
        
        if tree_nodes_without_comment > 0:
            self.errors.append(f'{tree_nodes_without_comment} non-root tree nodes without comment')
        
        # Comments without tree nodes
        comments_without_tree = Comment.objects.filter(tree_node__isnull=True).count()
        self.stdout.write(f'Comments with tree node: {Comment.objects.count() - comments_without_tree}/{Comment.objects.count()}')
        
        if comments_without_tree > 0:
            self.errors.append(f'{comments_without_tree} comments without tree node')
    
    def verify_scores(self):
        """Verify scores are populated"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('4. VERIFYING SCORES')
        self.stdout.write('='*60)
        
        # Posts with score
        posts_with_score = Post.objects.exclude(score=0).count()
        total_posts = Post.objects.count()
        
        self.stdout.write(f'Posts with non-zero score: {posts_with_score}/{total_posts} ({posts_with_score/total_posts*100:.1f}%)')
        
        # Comments with score
        comments_with_score = Comment.objects.exclude(score=0).count()
        total_comments = Comment.objects.count()
        
        self.stdout.write(f'Comments with non-zero score: {comments_with_score}/{total_comments} ({comments_with_score/total_comments*100:.1f}%)')
        
        # Check score ranges are reasonable
        max_post_score = Post.objects.aggregate(models.Max('score'))['score__max'] or 0
        min_post_score = Post.objects.aggregate(models.Min('score'))['score__min'] or 0
        
        self.stdout.write(f'Post score range: {min_post_score} to {max_post_score}')
        
        max_comment_score = Comment.objects.aggregate(models.Max('score'))['score__max'] or 0
        min_comment_score = Comment.objects.aggregate(models.Min('score'))['score__min'] or 0
        
        self.stdout.write(f'Comment score range: {min_comment_score} to {max_comment_score}')
    
    def verify_timestamps(self):
        """Verify timestamps are populated and reasonable"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('5. VERIFYING TIMESTAMPS')
        self.stdout.write('='*60)
        
        # Posts with created timestamp
        posts_with_created = Post.objects.filter(created__isnull=False).count()
        self.stdout.write(f'Posts with created timestamp: {posts_with_created}/{Post.objects.count()}')
        
        if posts_with_created != Post.objects.count():
            self.errors.append(f'{Post.objects.count() - posts_with_created} posts missing created timestamp')
        
        # Comments with created timestamp
        comments_with_created = Comment.objects.filter(created__isnull=False).count()
        self.stdout.write(f'Comments with created timestamp: {comments_with_created}/{Comment.objects.count()}')
        
        if comments_with_created != Comment.objects.count():
            self.errors.append(f'{Comment.objects.count() - comments_with_created} comments missing created timestamp')
        
        # Check archived_on is set
        posts_with_archived = Post.objects.filter(archived_on__isnull=False).count()
        comments_with_archived = Comment.objects.filter(archived_on__isnull=False).count()
        
        self.stdout.write(f'Posts with archived_on: {posts_with_archived}/{Post.objects.count()}')
        self.stdout.write(f'Comments with archived_on: {comments_with_archived}/{Comment.objects.count()}')
        
        if posts_with_archived == 0:
            self.warnings.append('No posts have archived_on timestamp')
        if comments_with_archived == 0:
            self.warnings.append('No comments have archived_on timestamp')
    
    def verify_tree_structure(self):
        """Verify comment tree structure integrity"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('6. VERIFYING TREE STRUCTURE')
        self.stdout.write('='*60)
        
        # Check each tree has a root
        posts_with_trees = Post.objects.filter(
            id__in=CommentTreeNode.objects.values_list('post_id', flat=True).distinct()
        )
        
        for post in posts_with_trees[:100]:  # Sample check
            roots = CommentTreeNode.objects.filter(post=post, depth=1)
            if roots.count() != 1:
                self.errors.append(f'Post {post.reddit_id} has {roots.count()} roots (should be 1)')
        
        # Check tree node counts match comment counts
        for post in posts_with_trees[:100]:  # Sample check
            comment_count = Comment.objects.filter(post=post).count()
            # Tree nodes = comments + 1 root
            tree_node_count = CommentTreeNode.objects.filter(post=post, comment__isnull=False).count()
            
            if comment_count != tree_node_count:
                self.errors.append(
                    f'Post {post.reddit_id}: {comment_count} comments but {tree_node_count} tree nodes'
                )
        
        self.stdout.write('✓ Tree structure verification complete (sampled 100 posts)')
    
    def verify_indexes(self):
        """Verify database indexes exist"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('7. VERIFYING DATABASE INDEXES')
        self.stdout.write('='*60)
        
        from django.db import connection
        
        with connection.cursor() as cursor:
            # Check Post indexes
            cursor.execute("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'channels_post'
            """)
            post_indexes = [row[0] for row in cursor.fetchall()]
            self.stdout.write(f'Post indexes: {len(post_indexes)}')
            
            # Check Comment indexes
            cursor.execute("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'channels_comment'
            """)
            comment_indexes = [row[0] for row in cursor.fetchall()]
            self.stdout.write(f'Comment indexes: {len(comment_indexes)}')
            
            # Check CommentTreeNode indexes
            cursor.execute("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'channels_commenttreenode'
            """)
            tree_indexes = [row[0] for row in cursor.fetchall()]
            self.stdout.write(f'CommentTreeNode indexes: {len(tree_indexes)}')
        
        # Check specific important indexes exist
        expected_indexes = [
            'post_reddit_idx',
            'comment_reddit_idx',
            'tree_post_path_idx',
        ]
        
        all_indexes = post_indexes + comment_indexes + tree_indexes
        
        for expected in expected_indexes:
            if not any(expected in idx for idx in all_indexes):
                self.warnings.append(f'Expected index not found: {expected}')
    
    def verify_content_sample(self, sample_size):
        """Verify content matches Reddit (sample check)"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(f'8. VERIFYING CONTENT SAMPLE (n={sample_size})')
        self.stdout.write('='*60)
        self.stdout.write('⚠️  This check requires Reddit API access and may be slow')
        
        # Sample posts
        post_sample = list(Post.objects.order_by('?')[:sample_size])
        
        mismatches = 0
        for post in post_sample:
            try:
                reddit_post = self.api.get_submission(post.reddit_id)
                
                # Check title matches
                if post.title != reddit_post.title:
                    mismatches += 1
                    self.errors.append(f'Post {post.reddit_id}: title mismatch')
                
                # Check score matches
                if post.score != reddit_post.score:
                    self.warnings.append(
                        f'Post {post.reddit_id}: score {post.score} vs Reddit {reddit_post.score} (may have changed)'
                    )
            
            except Exception as e:
                self.warnings.append(f'Could not verify post {post.reddit_id}: {e}')
        
        self.stdout.write(f'Content mismatches: {mismatches}/{sample_size}')
    
    def report_results(self):
        """Report final verification results"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write('VERIFICATION SUMMARY')
        self.stdout.write('='*60)
        
        if not self.errors and not self.warnings:
            self.stdout.write(self.style.SUCCESS('\n✓ ALL VERIFICATIONS PASSED!'))
            self.stdout.write(self.style.SUCCESS('Export is complete and accurate.'))
        else:
            if self.errors:
                self.stdout.write(self.style.ERROR(f'\n❌ ERRORS FOUND: {len(self.errors)}'))
                for error in self.errors:
                    self.stdout.write(self.style.ERROR(f'  - {error}'))
            
            if self.warnings:
                self.stdout.write(self.style.WARNING(f'\n⚠️  WARNINGS: {len(self.warnings)}'))
                for warning in self.warnings:
                    self.stdout.write(self.style.WARNING(f'  - {warning}'))
            
            if self.errors:
                self.stdout.write(self.style.ERROR('\n❌ Export verification FAILED'))
                self.stdout.write(self.style.ERROR('Please fix errors before proceeding to Phase 4'))
            else:
                self.stdout.write(self.style.WARNING('\n⚠️  Export verification passed with warnings'))
                self.stdout.write(self.style.WARNING('Review warnings before proceeding to Phase 4'))
```

### 2. Query Performance Tests

**File:** `channels/management/commands/test_query_performance.py`

```python
"""Test query performance on migrated data"""
import time
from django.core.management.base import BaseCommand
from django.db import connection, reset_queries
from django.conf import settings
from channels.models import Channel, Post, Comment, CommentTreeNode

class Command(BaseCommand):
    help = 'Test query performance on migrated data'
    
    def handle(self, *args, **options):
        # Enable query logging
        settings.DEBUG = True
        
        self.stdout.write('Testing query performance...\n')
        
        # Test 1: List channels
        self.test_query('List all channels', lambda: list(Channel.objects.all()))
        
        # Test 2: List posts by channel
        channel = Channel.objects.first()
        if channel:
            self.test_query(
                f'List posts in channel {channel.name}',
                lambda: list(Post.objects.filter(channel=channel).order_by('-score')[:50])
            )
        
        # Test 3: Get post with comments
        post = Post.objects.first()
        if post:
            self.test_query(
                f'Get post {post.reddit_id} with comments',
                lambda: (
                    Post.objects.get(id=post.id),
                    list(Comment.objects.filter(post=post)[:100])
                )
            )
        
        # Test 4: Get comment tree
        if post:
            self.test_query(
                f'Get comment tree for post {post.reddit_id}',
                lambda: list(CommentTreeNode.objects.filter(post=post).select_related('comment')[:100])
            )
        
        # Test 5: Search by author
        author_post = Post.objects.exclude(author__isnull=True).first()
        if author_post:
            self.test_query(
                f'Get posts by author {author_post.author.username}',
                lambda: list(Post.objects.filter(author=author_post.author)[:50])
            )
        
        self.stdout.write(self.style.SUCCESS('\n✓ Performance tests complete'))
    
    def test_query(self, description, query_func):
        """Test a single query and report performance"""
        reset_queries()
        
        start_time = time.time()
        result = query_func()
        end_time = time.time()
        
        duration = (end_time - start_time) * 1000  # ms
        num_queries = len(connection.queries)
        
        self.stdout.write(f'\n{description}:')
        self.stdout.write(f'  Time: {duration:.2f}ms')
        self.stdout.write(f'  Queries: {num_queries}')
        
        if duration > 1000:  # > 1 second
            self.stdout.write(self.style.WARNING(f'  ⚠️  Slow query (>{duration:.0f}ms)'))
        
        if num_queries > 10:
            self.stdout.write(self.style.WARNING(f'  ⚠️  Many queries ({num_queries})'))
```

## Execution Plan

### Step 1: Run Comprehensive Verification

```bash
# Basic verification
python manage.py verify_export_comprehensive

# With content sampling (requires Reddit API)
python manage.py verify_export_comprehensive --verify-content --sample-size 200
```

### Step 2: Run Performance Tests

```bash
python manage.py test_query_performance
```

### Step 3: Manual Spot Checks

Perform manual verification:
1. Browse random channels in admin
2. View random posts
3. Check comment trees render correctly
4. Verify scores are frozen
5. Check timestamps are reasonable

### Step 4: Document Results

Create verification report with:
- Total counts (channels, posts, comments)
- Error count and types
- Warning count and types
- Performance test results
- Sign-off for proceeding to Phase 4

## Deliverables

- [ ] Comprehensive verification command
- [ ] Performance test command
- [ ] Verification report documenting results
- [ ] Sign-off on data quality
- [ ] List of any known issues/limitations

## Success Criteria

- [ ] Zero critical errors in verification
- [ ] All reddit_ids populated
- [ ] All relationships valid
- [ ] Comment trees complete
- [ ] Performance acceptable (<1s for common queries)
- [ ] Sample content matches Reddit
- [ ] Database indexes present and used

## If Verification Fails

1. **Document all errors** - Create detailed list
2. **Identify root causes** - Categorize error types
3. **Fix and re-run migration** - Address issues in Phase 2 commands
4. **Re-verify** - Run verification again
5. **Iterate until clean** - Don't proceed with errors

## Notes

- Minor warnings acceptable (e.g., deleted users)
- Content score differences acceptable (Reddit scores change over time)
- Performance issues should be addressed with indexes
- Keep verification results for documentation
