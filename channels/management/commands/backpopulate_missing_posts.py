from django.conf import settings
from django.contrib.auth.models import User
from django.core.management import BaseCommand
from django.db import transaction

from channels.api import Api
from channels.constants import LINK_TYPE_SELF, LINK_TYPE_LINK, COMMENTS_SORT_NEW
from channels.models import Channel, Post, Comment
from channels.utils import get_or_create_link_meta
from search.tasks import index_post_with_comments


class Command(BaseCommand):
    """Find and create missing Post objects (and associated comments) for reddit submissions"""

    help = "Find and create missing Post, Comment objects for reddit submissions"

    def handle(self, *args, **options):
        """Find and create missing Post and Comment objects for reddit submissions"""
        total_missing = 0
        api_client = Api(user=User.objects.get(username=settings.INDEXING_API_USERNAME))
        for channel in Channel.objects.all():
            subreddit = api_client.reddit.subreddit(channel.name)
            reddit_posts = set([a.id for a in subreddit.hot(limit=1000)])
            django_posts = set([a.post_id for a in channel.post_set.all()])
            missing_posts = reddit_posts.difference(django_posts)
            for post_id in missing_posts:
                submission = api_client.get_post(post_id)
                submission.comment_limit = 1000
                submission_type = (
                    LINK_TYPE_LINK if hasattr(submission, "url") else LINK_TYPE_SELF
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        "Creating missing {} post {} in channel {}".format(
                            submission_type, post_id, channel.name
                        )
                    )
                )
                with transaction.atomic():
                    post, created = Post.objects.get_or_create(
                        post_id=post_id, channel=channel, post_type=submission_type
                    )
                    if (
                        created
                        and submission_type == LINK_TYPE_LINK
                        and post.link_meta is None
                        and settings.EMBEDLY_KEY
                    ):
                        post.link_meta = get_or_create_link_meta(submission.url)
                        post.save()
                    for reddit_comment in api_client.list_comments(
                        post_id, COMMENTS_SORT_NEW
                    ):
                        self.stdout.write("{}".format(reddit_comment.__dict__))
                        Comment.objects.get_or_create(
                            post=post,
                            comment_id=reddit_comment.id,
                            parent_id=reddit_comment.parent_id,
                        )
                    index_post_with_comments.delay(post_id)
            total_missing += len(missing_posts)
        self.stdout.write(
            self.style.SUCCESS("Created {} missing posts".format(total_missing))
        )
