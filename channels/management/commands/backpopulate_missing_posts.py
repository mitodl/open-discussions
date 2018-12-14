"""Management command for creating missing Post objects"""
import traceback

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management import BaseCommand
from django.db import transaction

from channels.api import Api
from channels.constants import LINK_TYPE_SELF, LINK_TYPE_LINK
from channels.models import Channel, Post, Comment
from channels.utils import get_or_create_link_meta
from search.tasks import index_post_with_comments


class Command(BaseCommand):
    """Find and create missing Post objects (and associated comments) for reddit submissions"""

    help = "Find and create missing Post objects for reddit submissions"

    def handle(self, *args, **options):  # pylint:disable=too-many-locals
        """Find and create missing Post objects for reddit submissions"""
        total_recovered = 0
        api_client = Api(user=User.objects.get(username=settings.INDEXING_API_USERNAME))
        for channel in Channel.objects.all():
            subreddit = api_client.reddit.subreddit(channel.name)
            reddit_posts = {reddit_post.id for reddit_post in subreddit.hot(limit=1000)}
            django_posts = {
                django_post.post_id for django_post in channel.post_set.all()
            }
            missing_posts = reddit_posts.difference(django_posts)
            for post_id in missing_posts:
                try:
                    submission = api_client.get_post(post_id)
                    submission_type = (
                        LINK_TYPE_SELF if submission.is_self else LINK_TYPE_LINK
                    )
                    with transaction.atomic():
                        post, _ = Post.objects.get_or_create(
                            post_id=post_id, channel=channel, post_type=submission_type
                        )
                        if (
                            submission_type == LINK_TYPE_LINK
                            and post.link_meta is None
                            and settings.EMBEDLY_KEY
                        ):
                            post.link_meta = get_or_create_link_meta(submission.url)
                            post.save()
                        for reddit_comment in submission.comments.list():
                            Comment.objects.get_or_create(
                                post=post,
                                comment_id=reddit_comment.id,
                                parent_id=reddit_comment.parent_id,
                            )
                        index_post_with_comments.delay(post_id)
                    self.stdout.write(
                        self.style.SUCCESS(
                            "Created missing {} post {} in channel {}".format(
                                submission_type, post_id, channel.name
                            )
                        )
                    )
                    total_recovered += 1
                except:  # pylint:disable=bare-except
                    self.stderr.write(
                        "Error creating missing {} post {} in channel {}: {}".format(
                            submission_type,
                            post_id,
                            channel.name,
                            traceback.format_exc(),
                        )
                    )
        self.stdout.write(
            self.style.SUCCESS("Created {} missing posts".format(total_recovered))
        )
