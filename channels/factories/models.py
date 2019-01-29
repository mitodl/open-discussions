"""Factories for making test data"""
import operator
import string
from functools import reduce

import base36
import faker
import factory
from factory import SubFactory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyText
import pytz

from channels import api
from channels.constants import (
    VALID_CHANNEL_TYPES,
    LINK_TYPE_SELF,
    LINK_TYPE_LINK,
    VALID_EXTENDED_POST_TYPES,
    EXTENDED_POST_TYPE_ARTICLE,
)
from channels.factories.utils import channel_name
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

FAKE = faker.Factory.create()

DEFAULT_ALLOWED_POST_TYPES = reduce(operator.or_, Channel.allowed_post_types.values())


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


class LinkMetaFactory(DjangoModelFactory):
    """Factory for a channels.models.LinkMeta object"""

    url = FuzzyText(prefix="https://")
    thumbnail = FuzzyText(prefix="https://", suffix=".jpg")

    class Meta:
        model = LinkMeta


class ChannelFactory(DjangoModelFactory):
    """Factory for a channels.models.Channel object"""

    name = factory.LazyAttributeSequence(channel_name)
    allowed_post_types = DEFAULT_ALLOWED_POST_TYPES
    title = factory.Faker("text", max_nb_chars=50)
    channel_type = FuzzyChoice(VALID_CHANNEL_TYPES)
    about = factory.List(
        [
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
        ]
    )

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

    author = SubFactory(UserFactory)
    channel = SubFactory(ChannelFactory)
    link_meta = factory.Maybe(
        factory.LazyAttribute(lambda post: post.post_type == LINK_TYPE_LINK),
        yes_declaration=SubFactory(LinkMetaFactory),
        no_declaration=None,
    )

    post_id = factory.Sequence(base36.dumps)
    post_type = FuzzyChoice(VALID_EXTENDED_POST_TYPES)

    title = factory.Faker("text", max_nb_chars=50)
    text = factory.Maybe(
        factory.LazyAttribute(lambda post: post.post_type == LINK_TYPE_SELF),
        yes_declaration=factory.Faker("text", max_nb_chars=100),
        no_declaration=None,
    )
    url = factory.Maybe(
        factory.LazyAttribute(lambda post: post.post_type == LINK_TYPE_LINK),
        yes_declaration=factory.Faker("url"),
        no_declaration=None,
    )
    article = factory.Maybe(
        factory.LazyAttribute(
            lambda post: post.post_type == EXTENDED_POST_TYPE_ARTICLE
        ),
        yes_declaration=factory.RelatedFactory(
            "channels.factories.models.ArticleFactory",
            "post",
            # special case to support nullable author only on Post
            author=factory.LazyAttribute(
                lambda article: article.factory_parent.author or UserFactory.create()
            ),
        ),
        no_declaration=None,
    )

    edited = False
    removed = False
    deleted = False
    num_comments = 0

    class Meta:
        model = Post

    class Params:
        # this trait denotes what a comment that hasn't had data populated from reddit looks like
        unpopulated = factory.Trait(
            title=None,
            url=None,
            text=None,
            author=None,
            edited=None,
            removed=None,
            deleted=None,
        )
        is_link = factory.Trait(post_type=LINK_TYPE_LINK)
        is_text = factory.Trait(post_type=LINK_TYPE_SELF)
        is_article = factory.Trait(post_type=EXTENDED_POST_TYPE_ARTICLE)


class ArticleFactory(DjangoModelFactory):
    """Factory for channels.models.Article"""

    author = factory.SubFactory(UserFactory)
    post = factory.SubFactory(
        "channels.factories.models.PostFactory",
        is_article=True,
        article=None,
        author=factory.SelfAttribute("..author"),
    )
    content = factory.List(
        [
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
        ]
    )

    class Meta:
        model = Article


class CommentFactory(DjangoModelFactory):
    """Factory for a channels.models.Comment object"""

    post = SubFactory(PostFactory)
    author = SubFactory(UserFactory)

    comment_id = FuzzyText(chars=string.ascii_lowercase)
    parent_id = FuzzyText(chars=string.ascii_lowercase)

    text = factory.Faker("text", max_nb_chars=100)
    edited = False
    removed = False
    deleted = False

    class Meta:
        model = Comment

    class Params:
        # this trait denotes what a comment that hasn't had data populated from reddit looks like
        unpopulated = factory.Trait(
            text=None, author=None, edited=None, removed=None, deleted=None
        )


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
