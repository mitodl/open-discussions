"""Management command for creating missing Post objects"""
import traceback

from django.core.management import BaseCommand
from django.db import transaction

from channels import backpopulate_api
from channels.api import get_admin_api
from channels.models import Channel, Post
from search.tasks import index_post_with_comments


class Command(BaseCommand):
    """Find and create missing Post objects (and associated comments) for reddit submissions"""

    help = "Find and create missing Post objects for reddit submissions"

    def handle(self, *args, **options):  # pylint:disable=too-many-locals
        """Find and create missing Post objects for reddit submissions"""
        total_recovered = 0
        api_client = get_admin_api()
        for channel in Channel.objects.all():
            subreddit = api_client.reddit.subreddit(channel.name)
            reddit_posts = {reddit_post.id for reddit_post in subreddit.hot(limit=1000)}
            django_posts = set(channel.post_set.values_list("post_id", flat=True))
            missing_posts = reddit_posts.difference(django_posts)
            for post_id in missing_posts:
                try:
                    submission = api_client.get_post(post_id)
                    with transaction.atomic():
                        post, _ = Post.objects.get_or_create(
                            post_id=post_id, channel=channel
                        )
                        backpopulate_api.backpopulate_post(
                            post=post, submission=submission
                        )
                        backpopulate_api.backpopulate_comments(
                            post=post, submission=submission
                        )
                        index_post_with_comments.delay(post_id)
                    self.stdout.write(
                        self.style.SUCCESS(
                            "Created missing post {} in channel {}".format(
                                post_id, channel.name
                            )
                        )
                    )
                    total_recovered += 1
                except:  # pylint:disable=bare-except
                    self.stderr.write(
                        "Error creating missing post {} in channel {}: {}".format(
                            post_id, channel.name, traceback.format_exc()
                        )
                    )
        self.stdout.write(
            self.style.SUCCESS("Created {} missing posts".format(total_recovered))
        )
