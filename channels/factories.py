"""Factories for making test data"""
import copy
import json
import os
import operator
import string
import time
from datetime import datetime
from functools import reduce

import base36
import pytz
from django.contrib.auth import get_user_model
import faker
import factory
from factory import SubFactory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyText

from channels import api
from channels.constants import (
    VALID_CHANNEL_TYPES,
    LINK_TYPE_ANY,
    VALID_EXTENDED_POST_TYPES,
    EXTENDED_POST_TYPE_ARTICLE,
)
from channels.models import (
    RedditRefreshToken,
    RedditAccessToken,
    Subscription,
    LinkMeta,
    Channel,
    Post,
    Comment,
    Article,
)
from open_discussions.factories import UserFactory
from open_discussions.utils import now_in_utc

FAKE = faker.Factory.create()

STRATEGY_CREATE = "create"
STRATEGY_BUILD = "build"

DEFAULT_ALLOWED_POST_TYPES = reduce(operator.or_, Channel.allowed_post_types.values())


def _channel_name(channel, index):  # pylint: disable=unused-argument
    """Generate a channel name from the current time and a random word"""
    now = now_in_utc().timestamp()
    return "{}_{}_{}".format(int(now), index, FAKE.word())[
        :21
    ]  # maximum of 21-char channel names


class RedditChannel:  # pylint: disable=too-many-instance-attributes
    """Simple factory representation for a reddit channel (subreddit)"""

    def __init__(self, **kwargs):
        self.name = kwargs.get("name", None)
        self.title = kwargs.get("title", None)
        self.display_name = kwargs.get("display_name", None)
        self.subreddit_type = kwargs.get("subreddit_type", None)
        self.channel_type = kwargs.get("channel_type", None)
        self.link_type = kwargs.get("link_type", None)
        self.description = kwargs.get("description", None)
        self.public_description = kwargs.get("public_description", None)
        self.user_is_contributor = kwargs.get("user_is_contributor", True)
        self.user_is_moderator = kwargs.get("user_is_moderator", True)
        self.allowed_post_types = kwargs.get(
            "allowed_post_types", Channel.allowed_post_types.keys()
        )
        self.api = kwargs.get("api", None)


class RedditPost:  # pylint: disable=too-many-instance-attributes
    """Simple factory representation for a reddit post"""

    def __init__(self, **kwargs):
        self.id = kwargs.get("id", None)
        self.title = kwargs.get("title", None)
        self.text = kwargs.get("text", None)
        self.article_content = kwargs.get("article_content", None)
        self.url = kwargs.get("url", None)
        self.channel = kwargs.get("channel", None)
        self.created = kwargs.get("created", None)
        self.api = kwargs.get("api", None)


class RedditComment:
    """Simple factory representation for a reddit comment"""

    def __init__(self, **kwargs):
        self.id = kwargs.get("id", None)
        self.text = kwargs.get("text", None)
        self.comment_id = kwargs.get("comment_id", None)
        self.post_id = kwargs.get("post_id", None)
        self.children = kwargs.get("children", [])
        self.created = kwargs.get("created", None)
        self.api = kwargs.get("api", None)


class LinkMetaFactory(DjangoModelFactory):
    """Factory for a channels.models.LinkMeta object"""

    url = FuzzyText(prefix="https://")
    thumbnail = FuzzyText(prefix="https://", suffix=".jpg")

    class Meta:
        model = LinkMeta


class ChannelFactory(DjangoModelFactory):
    """Factory for a channels.models.Channel object"""

    name = factory.LazyAttributeSequence(_channel_name)
    allowed_post_types = DEFAULT_ALLOWED_POST_TYPES

    @factory.post_generation
    def create_roles(
        self, create, extracted, **kwargs
    ):  # pylint: disable=unused-argument
        """Create the channel groups and roles after the channel is created"""
        if not create:
            return

        api.create_channel_groups_and_roles(self)

    class Meta:
        model = Channel


class PostFactory(DjangoModelFactory):
    """Factory for a channels.models.Post object"""

    post_id = factory.Sequence(base36.dumps)
    channel = SubFactory(ChannelFactory)
    link_meta = SubFactory(LinkMetaFactory)
    post_type = FuzzyChoice(VALID_EXTENDED_POST_TYPES)

    class Meta:
        model = Post


class CommentFactory(DjangoModelFactory):
    """Factory for a channels.models.Comment object"""

    post = SubFactory(PostFactory)
    comment_id = FuzzyText(chars=string.ascii_lowercase)
    parent_id = FuzzyText(chars=string.ascii_lowercase)

    class Meta:
        model = Comment


User = get_user_model()

SERIALIZABLE_KEYS = ("comments", "posts", "channels", "users")


def serialize_factory_result(obj):
    """
    Serializes a factory object for JSON storage

    Args:
        obj: the object to serialize

    Returns:
        dict: serialized form of the object
    """
    if isinstance(obj, User):
        return {"username": obj.username}
    elif isinstance(obj, RedditComment):
        return {
            "id": obj.id,
            "text": obj.text,
            "comment_id": obj.comment_id,
            "post_id": obj.post_id,
            "children": [serialize_factory_result(child) for child in obj.children],
        }
    elif isinstance(obj, RedditPost):
        if obj.url is not None:
            return {"id": obj.id, "title": obj.title, "url": obj.url}
        elif Article.objects.filter(post__post_id=obj.id).exists():
            return {
                "id": obj.id,
                "title": obj.title,
                "article_content": Article.objects.get(post__post_id=obj.id).content,
            }
        elif obj.text is not None:
            return {"id": obj.id, "title": obj.title, "text": obj.text}
    elif isinstance(obj, RedditChannel):
        return {
            "name": obj.name,
            "title": obj.title,
            "channel_type": obj.channel_type,
            "description": obj.description,
            "public_description": obj.public_description,
        }

    raise Exception("Unable to serialize: {}".format(obj))


def transform_to_factory_kwargs(data, original_kwargs=None, prefix=""):
    """
    Transforms factory data into the correct kwargs to pass to the factory

    Args:
        data (dict): dictionary of data from the factory_data file
        original_kwargs (dict): kwargs passed into the factory function from code
        prefix (str): argument prefix string

    Returns:
        dict: the generate kwargs to call the factory with
    """
    if original_kwargs is None:
        original_kwargs = {}

    kwargs = {
        key: value for key, value in original_kwargs.items() if key not in data.keys()
    }

    for key, value in data.items():
        prefixed_key = "{}__{}".format(prefix, key) if prefix else key

        if original_kwargs is not None and prefixed_key in original_kwargs:
            kwargs[prefixed_key] = original_kwargs[prefixed_key]
        elif isinstance(value, dict):
            kwargs.update(transform_to_factory_kwargs(value, prefix=prefixed_key))
        elif isinstance(value, list):
            kwargs[prefixed_key] = [
                transform_to_factory_kwargs(item, prefix=prefixed_key) for item in value
            ]
        else:
            kwargs[prefixed_key] = value

    return kwargs


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

    def build_or_create(self, factory_cls, strategy, kwargs):
        """
        Creates a new named object from the provided factory

        Args:
            factory_cls (cls): class of the factory to generate the post
            strategy (str): either a create or build strategy for the factory
            kwargs (dict): the kwargs to pass to the factory

        Returns:
            object: the created object
        """
        if strategy == STRATEGY_CREATE:
            return factory_cls.create(**kwargs)
        elif strategy == STRATEGY_BUILD:
            return factory_cls.build(**kwargs)
        else:
            raise ValueError('Factory strategy "{}" is invalid'.format(strategy))

    def get_or_make(
        self, factory_cls, factory_type, ident, strategy=STRATEGY_CREATE, **kwargs
    ):
        """
        Creates a new named object from the provided factory

        Args:
            factory_cls (cls): class of the factory to generate the post
            factory_type (str): class of the factory to generate the post
            ident (str): the logical name of the post within the test
            strategy (str): either a create or build strategy for the factory

        Returns:
            object: the created object
        """
        ident = str(ident)
        instances = self.get_instances(factory_type)
        if ident not in instances:
            result = self.build_or_create(factory_cls, strategy, kwargs)
            instances[ident] = serialize_factory_result(result)
            self._dirty = True
            time.sleep(3)  # arbitrary sleep to let reddit async computations catch up
            return result
        else:
            factory_kwargs = transform_to_factory_kwargs(
                copy.deepcopy(instances[ident]), original_kwargs=kwargs
            )
            return self.build_or_create(factory_cls, strategy, factory_kwargs)


class RedditFactories:
    """
    Factory for users, channels, posts, and comments
    """

    def __init__(self, store):
        self.store = store

    def user(self, ident, strategy=STRATEGY_CREATE, **kwargs):
        """
        Creates a new named user

        Args:
            ident (str): the logical name of the user within the test
            strategy (str): either a create or build strategy for the factory

        Returns:
            User: the created user
        """
        user = self.store.get_or_make(
            UserFactory, "users", ident, strategy=strategy, **kwargs
        )
        api.get_or_create_auth_tokens(user)
        return user

    def channel(self, ident, user, strategy=STRATEGY_CREATE, **kwargs):
        """
        Creates a new named channel

        Args:
            ident (str): the logical name of the channel within the test
            strategy (str): either a create or build strategy for the factory

        Returns:
            Channel: the created channel
        """
        return self.store.get_or_make(
            RedditChannelFactory,
            "channels",
            ident,
            strategy=strategy,
            api=api.Api(user),
            **kwargs,
        )

    def text_post(self, ident, user, strategy=STRATEGY_CREATE, **kwargs):
        """
        Creates a new named text post

        Args:
            ident (str): the logical name of the post within the test
            strategy (str): either a create or build strategy for the factory

        Returns:
            Post: the created post
        """
        return self.store.get_or_make(
            RedditTextPostFactory,
            "posts",
            ident,
            strategy=strategy,
            api=api.Api(user),
            **kwargs,
        )

    def link_post(self, ident, user, strategy=STRATEGY_CREATE, **kwargs):
        """
        Creates a new named url post

        Args:
            ident (str): the logical name of the post within the test
            strategy (str): either a create or build strategy for the factory

        Returns:
            Post: the created post
        """
        return self.store.get_or_make(
            RedditLinkPostFactory,
            "posts",
            ident,
            strategy=strategy,
            api=api.Api(user),
            **kwargs,
        )

    def article_post(self, ident, user, strategy=STRATEGY_CREATE, **kwargs):
        """
        Creates a new named article post

        Args:
            ident (str): the logical name of the post within the test
            strategy (str): either a create or build strategy for the factory

        Returns:
            Post: the created post
        """
        return self.store.get_or_make(
            ArticlePostFactory,
            "posts",
            ident,
            strategy=strategy,
            api=api.Api(user),
            **kwargs,
        )

    def comment(self, ident, user, strategy=STRATEGY_CREATE, **kwargs):
        """
        Creates a new named comment

        Args:
            ident (str): the logical name of the comment within the test
            strategy (str): either a create or build strategy for the factory

        Returns:
            Comment: the created comment
        """
        return self.store.get_or_make(
            RedditCommentFactory,
            "comments",
            ident,
            strategy=strategy,
            api=api.Api(user),
            **kwargs,
        )


class RedditRefreshTokenFactory(DjangoModelFactory):
    """Factory for refresh tokens"""

    user = factory.SubFactory(UserFactory)

    token_value = factory.Faker("word")

    class Meta:
        model = RedditRefreshToken


class RedditAccessTokenFactory(DjangoModelFactory):
    """Factory for access tokens"""

    user = factory.SubFactory(UserFactory)

    token_value = factory.Faker("word")
    token_expires_at = factory.LazyFunction(
        lambda: FAKE.date_time_this_year(
            before_now=False, after_now=True, tzinfo=pytz.utc
        )
    )

    class Meta:
        model = RedditAccessToken

    class Params:
        expired = factory.Trait(
            token_expires_at=factory.LazyFunction(
                lambda: FAKE.date_time_this_year(
                    before_now=True, after_now=False, tzinfo=pytz.utc
                )
            )
        )


def _timestamp_to_iso_str(timestamp):
    """
    Converts the timestamp value into a iso str

    Args:
        timestamp(float): the timestamp to convert

    Returns:
        str: converted timestamp
    """
    return datetime.fromtimestamp(timestamp).replace(tzinfo=pytz.utc).isoformat()


class RedditChannelFactory(factory.Factory):
    """Factory for reddit-persisted channels"""

    api = None
    name = factory.LazyFunction(_channel_name)
    title = factory.Faker("text", max_nb_chars=50)
    description = factory.Faker("text", max_nb_chars=500)
    public_description = factory.Faker("text", max_nb_chars=80)
    channel_type = FuzzyChoice(VALID_CHANNEL_TYPES)
    link_type = LINK_TYPE_ANY
    ga_tracking_id = None
    allowed_post_types = Channel.allowed_post_types.keys()

    @factory.post_generation
    def _create_in_reddit(
        self, create, extracted, **kwargs
    ):  # pylint: disable=unused-argument
        """Lazily create the channel"""
        if not create:
            return
        if not self.api:
            raise ValueError("RedditChannelFactory requires an api instance")

        self.api.create_channel(
            self.name,
            self.title,
            channel_type=self.channel_type,
            link_type=self.link_type,
            description=self.description,
            public_description=self.public_description,
            allowed_post_types=self.allowed_post_types,
        )

    class Meta:
        model = RedditChannel


class ArticleFactory(DjangoModelFactory):
    """Factory for Articles"""

    author = factory.SubFactory(UserFactory)
    post = factory.SubFactory(PostFactory, post_type=EXTENDED_POST_TYPE_ARTICLE)
    content = factory.List(
        [
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
        ]
    )

    class Meta:
        model = Article


class RedditPostFactory(factory.Factory):
    """Abstract factory for posts"""

    api = None
    id = None
    created = None
    title = factory.Faker("text", max_nb_chars=50)
    channel = factory.SubFactory(
        RedditChannelFactory, api=factory.SelfAttribute("..api")
    )
    permalink = factory.Faker("word")

    class Meta:
        abstract = True
        model = RedditPost


class RedditTextPostFactory(RedditPostFactory):
    """Factory for text posts"""

    text = factory.Faker("text", max_nb_chars=100)
    article_content = None

    @factory.post_generation
    def _create_in_reddit(self, *args, **kwargs):  # pylint: disable=unused-argument
        """Create the post"""
        if not self.api:
            raise ValueError("RedditTextPostFactory requires an api instance")

        reddit_post = self.api.create_post(
            self.channel.name,
            self.title,
            text=self.text,
            article_content=self.article_content,
        )

        self.id = reddit_post.id
        self.created = _timestamp_to_iso_str(reddit_post.created)
        self.permalink = reddit_post.permalink


class RedditLinkPostFactory(RedditPostFactory):
    """Factory for link posts"""

    url = factory.Faker("uri")

    @factory.post_generation
    def _create_in_reddit(self, *args, **kwargs):  # pylint: disable=unused-argument
        """Create the post"""
        if not self.api:
            raise ValueError("RedditLinkPostFactory requires an api instance")

        reddit_post = self.api.create_post(self.channel.name, self.title, url=self.url)

        self.id = reddit_post.id
        self.created = _timestamp_to_iso_str(reddit_post.created)
        self.permalink = reddit_post.permalink


class ArticlePostFactory(RedditTextPostFactory):
    """Factory for article posts"""

    article_content = factory.List(
        [
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
        ]
    )
    text = None


class RedditCommentFactory(factory.Factory):
    """Factory for comments"""

    id = None
    api = None
    comment_id = None
    created = None
    children = factory.LazyFunction(lambda: [])
    text = factory.Faker("text", max_nb_chars=100)

    @factory.lazy_attribute
    def post_id(self):
        """Lazily create the post"""
        if not self.api:
            raise ValueError("RedditCommentFactory requires an api instance")

        if self.comment_id:
            return None

        return RedditTextPostFactory.create(api=self.api).id

    @factory.post_generation
    def create_in_reddit(self, *args, **kwargs):  # pylint: disable=unused-argument
        """Lazily create the comment"""
        if not self.api:
            raise ValueError("RedditCommentFactory requires an api instance")

        comment = self.api.create_comment(
            self.text,
            post_id=self.post_id
            if not self.comment_id
            else None,  # only use post_id if top-level comment
            comment_id=self.comment_id,
        )

        self.id = comment.id
        self.created = _timestamp_to_iso_str(comment.created)

    class Meta:
        model = RedditComment


class SubscriptionFactory(DjangoModelFactory):
    """Factory for Subscription"""

    user = factory.SubFactory(UserFactory)
    post_id = factory.Sequence(base36.dumps)
    comment_id = factory.Maybe(
        "is_comment",
        yes_declaration=factory.Sequence(base36.dumps),
        no_declaration=None,
    )

    class Meta:
        model = Subscription

    class Params:
        is_comment = False
