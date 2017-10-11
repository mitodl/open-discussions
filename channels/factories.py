"""Factories for making test data"""
import json
import os
import time
from datetime import datetime

import pytz
from django.contrib.auth import get_user_model
import faker
import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice

from open_discussions.factories import UserFactory
from open_discussions.utils import now_in_utc
from channels.api import Api, CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_PRIVATE
from channels.models import RedditAccessToken, RedditRefreshToken

FAKE = faker.Factory.create()


class Channel:
    """Simple factory representation for a channel"""
    def __init__(self, **kwargs):
        self.name = kwargs.get('name', None)
        self.title = kwargs.get('title', None)
        self.channel_type = kwargs.get('channel_type', None)
        self.public_description = kwargs.get('public_description', None)
        self.api = kwargs.get('api', None)


class Post:
    """Simple factory representation for a post"""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', None)
        self.title = kwargs.get('title', None)
        self.text = kwargs.get('text', None)
        self.url = kwargs.get('url', None)
        self.channel = kwargs.get('channel', None)
        self.created = kwargs.get('created', None)
        self.api = kwargs.get('api', None)


class Comment:
    """Simple factory representation for a comment"""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', None)
        self.text = kwargs.get('text', None)
        self.comment_id = kwargs.get('comment_id', None)
        self.post_id = kwargs.get('post_id', None)
        self.children = kwargs.get('children', [])
        self.api = kwargs.get('api', None)

User = get_user_model()

SERIALIZABLE_KEYS = ('comments', 'posts', 'channels', 'users')


def serialize_factory_result(obj):
    """
    Serializes a factory object for JSON storage

    Args:
        obj: the object to serialize

    Returns:
        dict: serialized form of the object
    """
    if isinstance(obj, User):
        return {
            "username": obj.username,
        }
    elif isinstance(obj, Comment):
        return {
            "id": obj.id,
            "text": obj.text,
            "comment_id": obj.comment_id,
            "post_id": obj.post_id,
            "children": [serialize_factory_result(child) for child in obj.children],
        }
    elif isinstance(obj, Post):
        if obj.url is not None:
            return {
                "id": obj.id,
                "title": obj.title,
                "url": obj.url,
                "channel": serialize_factory_result(obj.channel),
            }
        elif obj.text is not None:
            return {
                "id": obj.id,
                "title": obj.title,
                "text": obj.text,
                "channel": serialize_factory_result(obj.channel),
            }
    elif isinstance(obj, Channel):
        return {
            "name": obj.name,
            "title": obj.title,
            "channel_type": obj.channel_type,
            "public_description": obj.public_description,
        }

    raise Exception("Unable to serialize: {}".format(obj))


class FactoryStore:
    """
    Handles storage of factory data to/from disk
    """
    def __init__(self, name):
        self.filename = "factory_data/{}.json".format(name)
        self.data = {}
        self._dirty = False

    def load(self):
        """Loads the factory data from disk"""
        if not self.exists():
            return

        with open(self.filename, "r") as f:
            self.data = json.loads(f.read())

    def exists(self):
        """
        Returns True if the factory file exists

        Returns:
            bool: True if the file exists
        """
        return os.path.exists(self.filename)

    def write(self):
        """Saves the accumulated factory data to disk"""
        if not self._dirty:
            return

        with open(self.filename, "w") as f:
            json.dump(self.data, f, indent=2, sort_keys=True)

        self._dirty = False

    def get_instances(self, factory_type):
        """
        Gets the dict of instances for the factory type

        Args:
            factory_type (str): class of the factory to generate the post

        Returns:
            dict: dictionary to store instances in
        """
        if factory_type not in self.data:
            self.data[factory_type] = {}

        return self.data[factory_type]

    def get_or_create(self, factory_cls, factory_type, ident, **kwargs):
        """
        Creates a new named post from the provided factory

        Args:
            factory_cls (cls): class of the factory to generate the post
            factory_type (str): class of the factory to generate the post
            ident (str): the logical name of the post within the test

        Returns:
            Post: the created post
        """
        instances = self.get_instances(factory_type)
        if ident not in instances:
            result = factory_cls.create(**kwargs)
            instances[ident] = serialize_factory_result(result)
            self._dirty = True
            time.sleep(3)  # arbitrary sleep to let reddit async computations catch up
            return result
        else:
            kwargs.update(instances[ident])
            return factory_cls.create(**kwargs)


class RedditFactories:
    """
    Factory for users, channels, posts, and comments
    """
    def __init__(self, store):
        self.store = store

    def user(self, ident, **kwargs):
        """
        Creates a new named user

        Args:
            ident (str): the logical name of the user within the test

        Returns:
            User: the created user
        """
        return self.store.get_or_create(
            UserFactory,
            "users",
            ident,
            **kwargs
        )

    def channel(self, ident, user, **kwargs):
        """
        Creates a new named channel

        Args:
            ident (str): the logical name of the channel within the test

        Returns:
            Channel: the created channel
        """
        return self.store.get_or_create(
            ChannelFactory,
            "channels",
            ident,
            api=Api(user),
            **kwargs
        )

    def text_post(self, ident, user, **kwargs):
        """
        Creates a new named text post

        Args:
            ident (str): the logical name of the post within the test

        Returns:
            Post: the created post
        """
        return self.store.get_or_create(
            TextPostFactory,
            "posts",
            ident,
            api=Api(user),
            **kwargs
        )

    def link_post(self, ident, user, **kwargs):
        """
        Creates a new named url post

        Args:
            ident (str): the logical name of the post within the test

        Returns:
            Post: the created post
        """
        return self.store.get_or_create(
            LinkPostFactory,
            "posts",
            ident,
            api=Api(user),
            **kwargs
        )

    def comment(self, ident, user, **kwargs):
        """
        Creates a new named comment

        Args:
            ident (str): the logical name of the comment within the test

        Returns:
            Comment: the created comment
        """
        return self.store.get_or_create(
            CommentFactory,
            "comments",
            ident,
            api=Api(user),
            **kwargs
        )


class RedditRefreshTokenFactory(DjangoModelFactory):
    """Factory for refresh tokens"""
    user = factory.SubFactory(UserFactory)

    token_value = factory.Faker('word')

    class Meta:
        model = RedditRefreshToken


class RedditAccessTokenFactory(DjangoModelFactory):
    """Factory for access tokens"""
    user = factory.SubFactory(UserFactory)

    token_value = factory.Faker('word')
    token_expires_at = factory.LazyFunction(
        lambda: FAKE.date_time_this_year(before_now=False, after_now=True, tzinfo=pytz.utc)
    )

    class Meta:
        model = RedditAccessToken

    class Params:
        expired = factory.Trait(
            token_expires_at=factory.LazyFunction(
                lambda: FAKE.date_time_this_year(before_now=True, after_now=False, tzinfo=pytz.utc)
            )
        )


class ChannelFactory(factory.Factory):
    """Factory for channels"""
    api = None
    title = factory.Faker('text', max_nb_chars=50)
    public_description = factory.Faker('text', max_nb_chars=100)
    channel_type = FuzzyChoice([CHANNEL_TYPE_PUBLIC, CHANNEL_TYPE_PRIVATE])

    @factory.lazy_attribute
    def name(self):
        """Lazily determine a unique channel name"""
        now = now_in_utc().timestamp()
        return "{}_{}".format(int(now), FAKE.word())[:21]  # maximum of 21-char channel names

    @factory.post_generation
    def _create_in_reddit(self, *args, **kwargs):  # pylint: disable=unused-argument
        """Lazily create the channel"""
        if not self.api:
            raise ValueError("ChannelFactory requires an api instance")

        self.api.create_channel(
            self.name,
            self.title,
            channel_type=self.channel_type,
            public_description=self.public_description
        )

    class Meta:
        model = Channel


class PostFactory(factory.Factory):
    """Abstract factory for posts"""
    api = None
    id = None
    created = None
    title = factory.Faker('text', max_nb_chars=50)

    @factory.lazy_attribute
    def channel(self):
        """Lazily create a channel"""
        if not self.api:
            raise ValueError("PostFactory requires an api instance")

        return ChannelFactory.create(api=self.api)

    class Meta:
        abstract = True


class TextPostFactory(PostFactory):
    """Factory for text posts"""
    text = factory.Faker('text', max_nb_chars=100)

    @factory.post_generation
    def _create_in_reddit(self, *args, **kwargs):  # pylint: disable=unused-argument
        """Create the post"""
        if not self.api:
            raise ValueError("TextPostFactory requires an api instance")

        reddit_post = self.api.create_post(self.channel.name, self.title, text=self.text)

        self.id = reddit_post.id
        self.created = datetime.fromtimestamp(reddit_post.created).replace(tzinfo=pytz.utc).isoformat()

    class Meta:
        model = Post


class LinkPostFactory(PostFactory):
    """Factory for link posts"""
    url = factory.Faker('uri')

    @factory.post_generation
    def _create_in_reddit(self, *args, **kwargs):  # pylint: disable=unused-argument
        """Create the post"""
        if not self.api:
            raise ValueError("TextPostFactory requires an api instance")

        reddit_post = self.api.create_post(self.channel.name, self.title, url=self.url)

        self.id = reddit_post.id
        self.created = datetime.fromtimestamp(reddit_post.created).replace(tzinfo=pytz.utc).isoformat()

    class Meta:
        model = Post


class CommentFactory(factory.Factory):
    """Factory for comments"""
    api = None
    comment_id = None
    text = factory.Faker('text', max_nb_chars=100)
    children = factory.LazyFunction(lambda: [])

    @factory.lazy_attribute
    def post_id(self):
        """Lazily create the post"""
        if not self.api:
            raise ValueError("CommentFactory requires an api instance")

        return TextPostFactory.create(api=self.api).id

    @factory.lazy_attribute
    def id(self):
        """Lazily create the comment"""
        if not self.api:
            raise ValueError("CommentFactory requires an api instance")

        return self.api.create_comment(
            self.text,
            post_id=self.post_id if not self.comment_id else None,  # only use post_id if top-level comment
            comment_id=self.comment_id
        ).id

    @factory.post_generation
    def comment_tree(self, *args, **kwargs):  # pylint: disable=unused-argument
        """Create nested comments"""
        # NOTE: we need to do this in post_generation because we need to parent comment to be created first
        max_children = kwargs.get('max', 3)

        if max_children == 0:
            return

        if 'count' in kwargs:
            count = kwargs['count']
        else:
            count = factory.fuzzy.random.randrange(1, max_children + 1, 1)

        for _ in range(count):
            self.children.append(
                CommentFactory.create(
                    api=self.api,
                    post_id=self.post_id,
                    comment_id=self.id,
                    comment_tree__max=count - 1,
                )
            )

    class Meta:
        model = Comment
