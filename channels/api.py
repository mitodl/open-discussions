"""Channels APIs"""
# pylint: disable=too-many-public-methods, too-many-lines
import logging
import operator
from datetime import datetime, timedelta, timezone
from functools import reduce, partialmethod
from urllib.parse import urljoin

import pytz
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, Group
from django.db import transaction
from django.db.models.functions import Coalesce
from django.http.response import Http404
from guardian.shortcuts import assign_perm
import praw
from praw.exceptions import APIException
from praw.models import Comment as RedditComment
from praw.models.comment_forest import CommentForest
from praw.models.reddit import more
from praw.models.reddit.redditor import Redditor
from praw.models.reddit.submission import Submission
import prawcore
from prawcore.exceptions import (
    Forbidden as PrawForbidden,
    NotFound as PrawNotFound,
    ResponseException,
)
from rest_framework.exceptions import PermissionDenied, NotFound

from channels import task_helpers as channel_task_helpers
from channels.constants import (
    DELETED_COMMENT_OR_POST_TEXT,
    CHANNEL_TYPE_PUBLIC,
    POSTS_SORT_HOT,
    POSTS_SORT_NEW,
    POSTS_SORT_TOP,
    VALID_CHANNEL_TYPES,
    VALID_POST_SORT_TYPES,
    VALID_COMMENT_SORT_TYPES,
    POST_TYPE,
    COMMENT_TYPE,
    VoteActions,
    ROLE_CONTRIBUTORS,
    ROLE_MODERATORS,
    ROLE_CHOICES,
    LINK_TYPE_ANY,
    LINK_TYPE_LINK,
    LINK_TYPE_SELF,
    EXTENDED_POST_TYPE_ARTICLE,
    WIDGET_LIST_CHANGE_PERM,
)
from channels.exceptions import ConflictException
from channels.models import (
    Article,
    Channel,
    Comment,
    Post,
    RedditAccessToken,
    RedditRefreshToken,
    Subscription,
    ChannelSubscription,
    ChannelGroupRole,
)
from channels.proxies import (
    PostProxy,
    ChannelProxy,
    proxy_post,
    proxy_channel,
    proxy_channels,
)
from channels.utils import (
    get_kind_mapping,
    get_or_create_link_meta,
    get_kind_and_id,
    num_items_not_none,
)

from notifications.models import (
    NotificationSettings,
    NOTIFICATION_TYPE_MODERATOR,
    FREQUENCY_IMMEDIATE,
)
from open_discussions.utils import now_in_utc
from search import search_index_helpers
from search.search_index_helpers import reddit_object_persist
from widgets.models import WidgetList

USER_AGENT = "MIT-Open: {version}"
ACCESS_TOKEN_HEADER_NAME = "X-Access-Token"

CHANNEL_SETTINGS = (
    "header_title",
    "link_type",
    "description",
    "public_description",
    "submit_link_label",
    "submit_text",
    "submit_text_label",
    "allow_top",
)

# this comes from https://github.com/mitodl/reddit/blob/master/r2/r2/models/token.py#L270
FULL_ACCESS_SCOPE = "*"
EXPIRES_IN_OFFSET = 30  # offsets the reddit refresh_token expirations by 30 seconds

User = get_user_model()

# monkey patch praw's rate limiter to not limit us
prawcore.rate_limit.RateLimiter.delay = lambda *args: None

log = logging.getLogger()


def _get_refresh_token(username):
    """
    Get or create a user on reddit using our refresh_token plugin

    Args:
        username (str): The reddit username

    Returns:
        dict: parsed json response for refresh token
    """
    # This is using our custom refresh_token plugin which is installed against
    # a modified instance of reddit. It registers a new user with a random password if
    # one does not exist, then obtains an OAuth refresh token for that user. This is then used
    # with praw to authenticate.
    refresh_token_url = urljoin(
        settings.OPEN_DISCUSSIONS_REDDIT_URL, "/api/v1/generate_refresh_token"
    )

    session = _get_session()
    return session.get(refresh_token_url, params={"username": username}).json()


def get_or_create_auth_tokens(user):
    """
    Gets the stored refresh token or generates a new one

    Args:
        user (User): the authenticated user

    Returns:
        (channels.models.RedditRefreshToken, channels.models.RedditAccessToken): the stored tokens
    """
    threshold_date = now_in_utc() + timedelta(minutes=2)
    refresh_token, _ = RedditRefreshToken.objects.get_or_create(user=user)
    access_token = None

    # if we created this token just now, atomically generate one
    if not refresh_token.token_value:
        with transaction.atomic():
            refresh_token = RedditRefreshToken.objects.filter(
                user=user
            ).select_for_update()[0]
            if not refresh_token.token_value:
                response = _get_refresh_token(user.username)
                refresh_token.token_value = response["refresh_token"]
                refresh_token.save()

                # the response also returns a valid access_token, so we might as well store that for use
                # offset it negatively a bit to account for response time
                expires_at = now_in_utc() + timedelta(
                    seconds=response["expires_in"] - EXPIRES_IN_OFFSET
                )
                access_token = RedditAccessToken.objects.create(
                    user=user,
                    token_value=response["access_token"],
                    token_expires_at=expires_at,
                )

    # return the refresh token and access_token
    return (
        refresh_token,
        (
            access_token
            or RedditAccessToken.valid_tokens_for_user(user, threshold_date).first()
        ),
    )


def _configure_access_token(client, access_token, user):
    """
    Configure or fetch a new access_token for the client

    Args:
        client (praw.Reddit): the client needing access_token configuration
        access_token (channels.models.RedditAccessToken): an access token to try
        user (User): the authenticated user

    Returns:
        client (praw.Reddit): the configured client
    """
    # pylint: disable=protected-access

    # if we have a valid access token, use it
    # otherwise force a fetch for a new one and persist it
    authorizer = client._core._authorizer

    if access_token:
        # "hydrate" the authorizer from our stored access token
        authorizer.access_token = access_token.token_value
        authorizer._expiration_timestamp = access_token.token_expires_at.timestamp()
        authorizer.scopes = set([FULL_ACCESS_SCOPE])
    else:
        authorizer = client._core._authorizer
        authorizer.refresh()
        expires_at = datetime.fromtimestamp(authorizer._expiration_timestamp)
        RedditAccessToken.objects.create(
            user=user,
            token_value=authorizer.access_token,
            token_expires_at=expires_at.replace(tzinfo=pytz.utc),
        )

    return client


def _get_client_base_kwargs():
    """
    Returns common kwargs passed to praw.Redditor

    Returns:
        dict: set of client kwargs
    """
    return {
        "reddit_url": settings.OPEN_DISCUSSIONS_REDDIT_URL,
        "oauth_url": settings.OPEN_DISCUSSIONS_REDDIT_URL,
        "short_url": settings.OPEN_DISCUSSIONS_REDDIT_URL,
        "user_agent": _get_user_agent(),
        "requestor_kwargs": _get_requester_kwargs(),
        "check_for_updates": False,
        "client_id": settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID,
        "client_secret": settings.OPEN_DISCUSSIONS_REDDIT_SECRET,
    }


def _get_session():
    """
    Get a session to be used for communicating with reddit

    Returns:
        requests.Session: A session
    """
    session = requests.Session()
    session.verify = settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL
    session.headers.update(
        {ACCESS_TOKEN_HEADER_NAME: settings.OPEN_DISCUSSIONS_REDDIT_ACCESS_TOKEN}
    )
    return session


def _get_requester_kwargs():
    """
    Gets the arguments for the praw requester

    Returns:
        dict: dictionary of requester arguments
    """
    return {"session": _get_session()}


def _get_client(user):
    """
    Get a configured Reddit client_id

    Args:
        user (User): the authenticated user, or None for anonymous user

    Returns:
        praw.Reddit: configured reddit client
    """
    if user.is_anonymous:
        return praw.Reddit(**_get_client_base_kwargs())

    refresh_token, access_token = get_or_create_auth_tokens(user)

    return _configure_access_token(
        praw.Reddit(
            refresh_token=refresh_token.token_value, **_get_client_base_kwargs()
        ),
        access_token,
        user,
    )


def _get_user_agent():
    """Gets the user agent"""
    return USER_AGENT.format(version=settings.VERSION)


def evict_expired_access_tokens():
    """Evicts expired access tokens"""
    # give a 5-minute buffer
    now = now_in_utc() - timedelta(minutes=5)
    RedditAccessToken.objects.filter(token_expires_at__lt=now).delete()


def replace_load_comment(original_load_comment):
    """
    Return patched version of MoreComments._load_comment which handles the case where the parent id is missing

    Args:
        original_load_comment (callable): The original MoreComments._load_comment method

    Returns:
        callable: A function wrapping original_load_comment
    """

    def replacement_load_comment(*args, **kwargs):
        """Patch function to handle AssertionError"""
        try:
            return original_load_comment(*args, **kwargs)
        except AssertionError:
            # If the parent doesn't exist the code will receive no children which will error as
            # an AssertionError
            raise Http404

    return replacement_load_comment


def sync_channel_subscription_model(channel_name, user):
    """
    Create or update channel subscription for a user

    Args:
        channel_name (str): The name of the channel
        user (django.contrib.models.auth.User): The user

    Returns:
        ChannelSubscription: the channel user role object
    """
    with transaction.atomic():
        channel = Channel.objects.get(name=channel_name)
        return ChannelSubscription.objects.update_or_create(channel=channel, user=user)[
            0
        ]


@transaction.atomic
def get_role_model(channel, role):
    """
    Get or create a ChannelGroupRole object

    Args:
        channel(channels.models.Channel): The channel
        role(str): The role name (moderators, contributors)

    Returns:
        ChannelGroupRole: the ChannelGroupRole object
    """
    return ChannelGroupRole.objects.get(channel=channel, role=role)


def add_user_role(channel, role, user):
    """
    Add a user to a channel role's group

    Args:
        channel(channels.models.Channel): The channel
        role(str): The role name (moderators, contributors)
        user(django.contrib.auth.models.User): The user
    """
    get_role_model(channel, role).group.user_set.add(user)


def remove_user_role(channel, role, user):
    """
    Remove a user from a channel role's group

    Args:
        channel(channels.models.Channel): The channel
        role(str): The role name (moderators, contributors)
        user(django.contrib.auth.models.User): The user
    """
    get_role_model(channel, role).group.user_set.remove(user)


def get_post_type(*, text, url, article_content):
    """
    Returns the post type given the passed input values

    Args:
        text (str or None): the post text
        url (str): the post url
        article_content (dict): the post article text data
    Returns:
        str: the type of post
    Raises:
        ValueError: If incompatible pieces of content are being submitted (e.g.: a URL is
            being submitted for a text post)
    """
    if not any([text, url, article_content]):
        # title-only text post
        return LINK_TYPE_SELF

    if num_items_not_none([text, url, article_content]) != 1:
        raise ValueError(
            "Not more than one of text, url, or article_content can be provided"
        )

    if url is not None:
        return LINK_TYPE_LINK
    elif article_content is not None:
        return EXTENDED_POST_TYPE_ARTICLE
    return LINK_TYPE_SELF


def get_admin_api():
    """
    Creates an instance of the API configured with the admin user

    Returns:
        channels.api.Api: Api instance configured for the admin user
    """
    admin_user = User.objects.get(username=settings.INDEXING_API_USERNAME)
    return Api(admin_user)


def get_allowed_post_types_from_link_type(link_type):
    """
    Determine allowed_post_types based on a value for reddit's link_type setting

    Args:
        link_type (str): the link type or None

    Returns:
        list of str: list of allowed post types
    """
    if link_type in [LINK_TYPE_LINK, LINK_TYPE_SELF]:
        return [link_type]
    else:
        # ANY or enforce a standard default
        return [LINK_TYPE_LINK, LINK_TYPE_SELF]


def allowed_post_types_bitmask(allowed_post_types):
    """
    Returns a computer bitmask for the post types

    Args:
        allowed_post_types (list of str): list of allowed post types

    Returns:
        int: bit mask for the allowed post types
    """
    return reduce(
        operator.or_,
        [
            bit
            for post_type, bit in Channel.allowed_post_types.items()
            if post_type in allowed_post_types
        ],
        0,
    )


def create_channel(
    name, title, membership_is_managed, allowed_post_types, channel_type
):
    """
    Create a channel and related models

    Args:
        name(str): the channel name
        title(str): the channel title
        membership_is_managed (boolean): True if the channel is managed by another app
        allowed_post_types (list of str): list of allowed post types
        channel_type (str): the channel type

    Returns:
        channels.models.Channel: the created channel
    """
    widget_list = WidgetList.objects.create()

    channel, created = Channel.objects.get_or_create(
        name=name,
        defaults={
            "title": title,
            "widget_list": widget_list,
            "membership_is_managed": membership_is_managed,
            "allowed_post_types": allowed_post_types_bitmask(allowed_post_types),
            "channel_type": channel_type,
        },
    )

    if not created:
        # previously this was handled by a praw exception being converted in channels.utils.translate_praw_exceptions
        # but now we raise if we try to create, but didn't
        raise ConflictException()

    roles = create_channel_groups_and_roles(channel)

    moderator_group = roles[ROLE_MODERATORS].group
    assign_perm(WIDGET_LIST_CHANGE_PERM, moderator_group, widget_list)

    return channel


def create_channel_groups_and_roles(channel):
    """
    Create a channel's groups and roles

    Args:
        channel(channels.models.Channel): the channel to create groups for
    """
    roles = {}
    for role in ROLE_CHOICES:
        group = Group.objects.create(name=f"{channel.name}_{role}")
        roles[role] = ChannelGroupRole.objects.create(
            channel=channel, group=group, role=role
        )

    return roles


def comment_values_from_reddit(comment):
    """
    Returns the values to populate the comment from a comment

    Args:
        comment (praw.models.Comment): the reddit comment to source data from

    Returns:
        dict: property values for a channels.models.Comment record
    """
    _, parent_id = get_kind_and_id(comment.parent_id)
    return dict(
        parent_id=parent_id,
        text=comment.body,
        score=comment.score,
        edited=comment.edited if comment.edited is False else True,
        removed=comment.banned_by is not None,
        deleted=comment.body == DELETED_COMMENT_OR_POST_TEXT,
        created_on=datetime.fromtimestamp(comment.created, tz=timezone.utc).isoformat(),
    )


def create_comment(*, post, comment, author):
    """
    Creates a comment based on values from reddit

    Args:
        post (channels.models.Post): the post the comment is on
        comment (praw.models.Comment): the reddit comment
        author (User): the user who wrote the comment or None if the user doesn't exist anymore

    Returns:
        channels.models.Comment: a new comment
    """

    comment_values = comment_values_from_reddit(comment)

    # special case, the field is auto_now_add, so we need to set this by doing an update after create
    created_on = comment_values.get("created_on")

    comment, created = Comment.objects.update_or_create(
        comment_id=comment.id,
        defaults={**comment_values, "post": post, "author": author},
    )

    if created:
        # intentionally not an update(), because otherwise we'd have to re-select
        comment.created_on = created_on
        comment.save()

    return comment


class Api:
    """Channel API"""

    # help Mock() spec this object correctly
    reddit = None
    user = None

    def __init__(self, user):
        """Constructor"""
        if user is None:
            user = AnonymousUser()

        self.user = user
        try:
            self.reddit = _get_client(user=user)
        except ResponseException as ex:
            if not user.is_anonymous and ex.response.status_code == 401:
                RedditAccessToken.objects.filter(user=user).delete()
                RedditRefreshToken.objects.filter(user=user).delete()

                self.reddit = _get_client(user=user)
            else:
                raise

    def list_channels(self):
        """
        List the channels

        Returns:
            ListingGenerator(praw.models.Subreddit): a generator over channel listings
        """
        if self.user.is_anonymous:
            subreddits = self.reddit.subreddits.default()
        else:
            subreddits = self.reddit.user.subreddits(limit=None)

        # call list() to force one-time evaluation of the generator
        return proxy_channels(list(subreddits))

    def get_subreddit(self, name):
        """
        Get the subreddit

        Args:
            name (str): The subreddit name

        Returns:
            praw.models.Subreddit: the specified subreddit
        """
        return self.reddit.subreddit(name)

    def get_channel(self, name):
        """
        Get the channel

        Args:
            name (str): The channel name

        Returns:
            channels.proxies.ChannelProxy: the specified channel
        """
        return proxy_channel(self.get_subreddit(name))

    def create_channel(
        self,
        name,
        title,
        channel_type=CHANNEL_TYPE_PUBLIC,
        membership_is_managed=False,
        allowed_post_types=None,
        link_type=LINK_TYPE_ANY,
        **other_settings,
    ):  # pylint: disable=too-many-arguments
        """
        Create a channel

        Args:
            name (str): name of the channel
            title (str): title of the channel
            channel_type (str): type of the channel
            membership_is_managed (bool): Whether the channel membership is managed externally
            allowed_post_types (list of str): list of allowed post types
            link_type (str): the link type for this channel
            **other_settings (dict): dict of additional settings

        Returns:
            channels.proxies.ChannelProxy: the created channel
        """
        if channel_type not in VALID_CHANNEL_TYPES:
            raise ValueError("Invalid argument channel_type={}".format(channel_type))

        for key, value in other_settings.items():
            if key not in CHANNEL_SETTINGS:
                raise ValueError("Invalid argument {}={}".format(key, value))

        if not isinstance(membership_is_managed, bool):
            raise ValueError("Invalid argument membership_is_managed")

        if not allowed_post_types:
            # forward-port link type to allowed_post_types
            allowed_post_types = get_allowed_post_types_from_link_type(link_type)

        # wrap channel creation as an atomic operation across the db and reddit
        with transaction.atomic():
            channel = create_channel(
                name, title, membership_is_managed, allowed_post_types, channel_type
            )

            # create in reddit after we persist the db records so an error here rolls back everything
            subreddit = self.reddit.subreddit.create(
                name,
                title=title,
                subreddit_type=channel_type,
                allow_top=True,
                link_type=link_type,
                **other_settings,
            )

        return ChannelProxy(subreddit, channel)

    @reddit_object_persist(search_index_helpers.update_channel_index)
    def update_channel(self, name, title=None, channel_type=None, **other_settings):
        """
        Updates a channel

        Args:
            name (str): name of the channel
            title (str): title of the channel
            channel_type (str): type of the channel
            **other_settings (dict): dict of additional settings

        Returns:
            praw.models.Subreddit: the updated subreddit
        """
        membership_is_managed = other_settings.pop("membership_is_managed", False)
        allowed_post_types = other_settings.pop("allowed_post_types", None)

        if channel_type is not None and channel_type not in VALID_CHANNEL_TYPES:
            raise ValueError("Invalid argument channel_type={}".format(channel_type))

        for key, value in other_settings.items():
            if key not in CHANNEL_SETTINGS:
                raise ValueError("Invalid argument {}={}".format(key, value))

        channel_kwargs = {}
        if membership_is_managed is not None:
            if not isinstance(membership_is_managed, bool):
                raise ValueError("Invalid argument membership_is_managed")
            channel_kwargs["membership_is_managed"] = membership_is_managed

        if channel_type is not None:
            channel_kwargs["channel_type"] = channel_type

        if title is not None:
            channel_kwargs["title"] = title

        if allowed_post_types is not None:
            channel_kwargs["allowed_post_types"] = allowed_post_types_bitmask(
                allowed_post_types
            )

            # set reddit to allow all link types, going forward we will validate the post link_type against allowed_post_types if it is set
            other_settings["link_type"] = LINK_TYPE_ANY
        elif "link_type" in other_settings:
            channel_kwargs["allowed_post_types"] = allowed_post_types_bitmask(
                get_allowed_post_types_from_link_type(other_settings["link_type"])
            )

        if channel_kwargs:
            Channel.objects.filter(name=name).update(**channel_kwargs)

        values = other_settings.copy()
        if title is not None:
            values["title"] = title
        if channel_type is not None:
            values["subreddit_type"] = channel_type

        self.get_channel(name).mod.update(**values)
        return self.get_channel(name)

    @staticmethod
    def _apply_comment_vote(comment, upvote, downvote, is_upvoted, is_downvoted):
        """
        Applies an upvote to the related Comment record

        Args:
            comment (Comment): the reddit comment
            upvote (boolean): nullable flag for applying an upvote
            downvote (boolean): nullable flag for applying a downvote
            is_upvoted (boolean): True if the user currently has upvoted the post
            is_downvoted (boolean): True if the user currently has downvoted the post
        """
        vote_delta = sum(
            [
                # start handle upvote
                # adds the upvote
                1 if upvote and not is_upvoted else 0,
                # removes an opposing downvote, if present
                1 if upvote and is_downvoted else 0,
                # clear an existing upvote only, but only count this once if downvoting also
                -1 if upvote is False and is_upvoted and not downvote else 0,
                # end handle upvote
                # --------
                # start handle downvote
                # adds the downvote
                -1 if downvote and not is_downvoted else 0,
                # removes an opposing upvote, if present
                -1 if downvote and is_upvoted else 0,
                # clear an existing downvote, but only count this once if upvoting also
                1 if downvote is False and is_downvoted and not upvote else 0,
                # end handle downvote
            ]
        )

        if vote_delta:
            # apply an update to the nullable comment score
            # by substituting the current score from reddit if there's a null
            Comment.objects.filter(comment_id=comment.id).update(
                score=Coalesce("score", comment.score) + vote_delta
            )

    @staticmethod
    def _apply_post_vote(submission, upvote, is_upvoted):
        """
        Applies an upvote to the related Post record

        Args:
            submission (Submission): the reddit submission
            upvote (boolean): nullable flag for applying an upvote
            is_upvoted (boolean): True if the user currently has upvoted the post
        """
        vote_delta = sum(
            [
                # adds the upvote
                1 if upvote and not is_upvoted else 0,
                # clear an existing upvote
                -1 if upvote is False and is_upvoted else 0,
            ]
        )

        if vote_delta:
            # apply an update to the nullable post score
            # by substituting the current ups value from reddit if there's a null
            Post.objects.filter(post_id=submission.id).update(
                score=Coalesce("score", submission.ups) + vote_delta
            )

    @classmethod
    def _apply_vote(
        cls, instance, validated_data, allow_downvote=False, instance_type=None
    ):  # pylint: disable=too-many-branches
        """
        Apply a vote provided by the user to a comment or post, if it's different than before.

        Args:
            instance (Comment or Post): A comment or post
            validated_data (dict): validated data which contains the new vote from the user
            allow_downvote (bool): If false, ignore downvotes
            instance_type (str): A string indicating the reddit object type (comment, post/submission)
        Returns:
            bool:
                True if a change was made, False otherwise
        """
        upvote = validated_data.get("upvoted")
        if allow_downvote:
            downvote = validated_data.get("downvoted")
        else:
            downvote = None

        is_upvoted = instance.likes is True
        is_downvoted = instance.likes is False

        # Determine vote action to take based on the request and any already-applied votes
        if upvote and not is_upvoted:
            vote_action = VoteActions.UPVOTE
        elif downvote and not is_downvoted:
            vote_action = VoteActions.DOWNVOTE
        elif upvote is False and is_upvoted:
            vote_action = VoteActions.CLEAR_UPVOTE
        elif downvote is False and is_downvoted:
            vote_action = VoteActions.CLEAR_DOWNVOTE
        else:
            return False

        with transaction.atomic():
            # make upvotes atomic
            if isinstance(instance, Submission):
                cls._apply_post_vote(instance, upvote, is_upvoted)
            elif isinstance(instance, RedditComment):
                cls._apply_comment_vote(
                    instance, upvote, downvote, is_upvoted, is_downvoted
                )

            if vote_action == VoteActions.UPVOTE:
                instance.upvote()
            elif vote_action == VoteActions.DOWNVOTE:
                instance.downvote()
            elif vote_action in (VoteActions.CLEAR_UPVOTE, VoteActions.CLEAR_DOWNVOTE):
                instance.clear_vote()

        try:
            search_index_helpers.update_indexed_score(
                instance, instance_type, vote_action
            )
        except Exception:  # pylint: disable=broad-except
            log.exception(
                "Error occurred while trying to index [%s] object score", instance_type
            )
        return True

    apply_post_vote = partialmethod(
        _apply_vote, allow_downvote=False, instance_type=POST_TYPE
    )
    apply_comment_vote = partialmethod(
        _apply_vote, allow_downvote=True, instance_type=COMMENT_TYPE
    )

    @reddit_object_persist(
        search_index_helpers.index_new_post,
        channel_task_helpers.maybe_repair_post_in_host_listing,
    )  # pylint: disable=too-many-arguments, too-many-locals
    def create_post(
        self,
        channel_name,
        title,
        *,
        text=None,
        url=None,
        article_content=None,
        cover_image=None,
    ):
        """
        Create a new post in a channel

        Args:
            channel_name(str): the channel name identifier
            title(str): the title of the post
            text(str): the text of the post
            url(str): the url of the post
            article_content (dict): the article content of the post as a JSON dict
            cover_image(bytes): article cover image
        Raises:
            ValueError: if both text and url are provided

        Returns:
            channels.proxies.PostProxy: the proxied submission and post
        """
        post_type = get_post_type(text=text, url=url, article_content=article_content)
        channel = self.get_channel(channel_name)

        # If the channel has allowed_post_types configured, use that, otherwise delegate to reddit via the submit() call
        if channel.allowed_post_types:
            if not channel.allowed_post_types & getattr(
                Channel.allowed_post_types, post_type
            ):
                raise ValueError(
                    f"Post type {post_type} is not permitted in this channel"
                )

        # Reddit requires at least an empty string for text posts (article posts shadow an empty text post)
        if post_type != LINK_TYPE_LINK and not text:
            text = ""
        submission = channel.submit(title, selftext=text, url=url)

        # Don't use empty str for article posts in the database
        if post_type == EXTENDED_POST_TYPE_ARTICLE:
            text = None

        users_first_post = (
            Post.objects.filter(author=self.user, removed=False, deleted=False)
            .order_by("created_on")
            .first()
        )

        exclude_from_frontpage_emails = bool(
            users_first_post is None
            or (datetime.now(pytz.UTC) - users_first_post.created_on).days < 1
        )

        with transaction.atomic():
            # select_for_update so no one else can write to this
            post, created = Post.objects.select_for_update().get_or_create(
                post_id=submission.id,
                defaults={
                    "channel": channel._self_channel,  # pylint: disable=protected-access
                    "title": title,
                    "text": text,
                    "url": url,
                    "post_type": post_type,
                    "author": self.user,
                    "score": submission.ups,
                    "num_comments": 0,
                    "edited": False,
                    "removed": False,
                    "deleted": False,
                    "created_on": datetime.fromtimestamp(
                        submission.created, tz=timezone.utc
                    ),
                    "exclude_from_frontpage_emails": exclude_from_frontpage_emails,
                },
            )

            if created and article_content:
                article, _ = Article.objects.get_or_create(
                    post=post,
                    defaults={"author": self.user, "content": article_content},
                )

                if cover_image and hasattr(cover_image, "name"):
                    article.cover_image.save(
                        f"article_image_{post.id}.jpg", cover_image, save=False
                    )
                    article.save(update_fields=["cover_image"])

            if created and url and post.link_meta is None and settings.EMBEDLY_KEY:
                post.link_meta = get_or_create_link_meta(url)
                post.save()

        return PostProxy(submission, post)

    def front_page(self, listing_params):
        """
        List posts on front page

        Args:
            listing_params (channels.utils.ListingParams): the pagination/sorting params requested for the listing

        Returns:
            praw.models.listing.generator.ListingGenerator:
                A generator of posts for a subreddit
        """
        return self._get_listing(self.reddit.front, listing_params)

    def list_posts(self, channel_name, listing_params):
        """
        List posts for a channel

        Args:
            channel_name(str): the channel name identifier
            listing_params (channels.utils.ListingParams): the pagination/sorting params requested for the listing

        Returns:
            praw.models.listing.generator.ListingGenerator:
                A generator of posts for a subreddit
        """
        channel = self.get_channel(channel_name)
        return self._get_listing(channel, listing_params)

    def list_user_posts(self, username, listing_params):
        """List posts submitted by a given user"""
        redditor = Redditor(self.reddit, name=username)
        return self._get_listing(redditor.submissions, listing_params)

    def list_user_comments(self, username, listing_params):
        """List comments submitted by a given user"""
        redditor = Redditor(self.reddit, name=username)
        return self._get_listing(redditor.comments, listing_params)

    def _get_listing(self, listing, listing_params):
        """
        List posts using the 'hot' algorithm

        Args:
            listing(praw.models.listing.BaseListingMixin): the listing to return a  generator for
            listing_params (channels.utils.ListingParams): the pagination/sorting params requested for the listing

        Returns:
            praw.models.listing.generator.ListingGenerator:
                A generator of posts for a subreddit
        """
        before, after, count, sort = listing_params
        if sort not in VALID_POST_SORT_TYPES:
            raise ValueError("Sort method '{}' is not supported".format(sort))

        params = {}
        if before is not None:
            params["before"] = before
        if after is not None:
            params["after"] = after
        if count is not None:
            params["count"] = count

        kwargs = {
            "limit": settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT,
            "params": params,
        }

        if sort == POSTS_SORT_HOT:
            return listing.hot(**kwargs)
        elif sort == POSTS_SORT_NEW:
            return listing.new(**kwargs)
        elif sort == POSTS_SORT_TOP:
            return listing.top(**kwargs)
        else:
            raise Exception(
                "Sort method '{}' is in VALID_POST_SORT_TYPES but not actually supported".format(
                    sort
                )
            )

    def get_submission(self, submission_id):
        """
        Gets the submission

        Args:
            submission_id(str): the base36 id for the submission

        Returns:
            praw.models.Submission: the submission
        """
        return self.reddit.submission(id=submission_id)

    def get_post(self, post_id):
        """
        Gets the post

        Args:
            post_id(str): the base36 id for the post

        Returns:
            channels.proxies.PostProxy: the submitted post
        """
        return proxy_post(self.get_submission(post_id))

    @reddit_object_persist(search_index_helpers.update_post_text)
    def update_post(
        self, post_id, *, text=None, article_content=None, cover_image=None
    ):
        """
        Updates the post

        Args:
            post_id(str): the base36 id for the post
            text (str): The text for the post
            article_content (dict): The article content as a JSON dict
            cover_image (bytes): The article cover image

        Raises:
            ValueError: if the url post was provided

        Returns:
            praw.models.Submission: the submitted post
        """
        if text and article_content:
            raise ValueError("Only one of text and article_content can be specified")

        if not text and not article_content and not cover_image:
            raise ValueError(
                "One of text, article_content, or cover_image must be specified"
            )

        post = self.get_post(post_id)

        if post.post_type:
            # new validation
            if text and post.post_type != LINK_TYPE_SELF:
                raise ValueError(
                    f"Posts of type '{post.post_type}' cannot have text updated"
                )
            elif article_content and post.post_type != EXTENDED_POST_TYPE_ARTICLE:
                raise ValueError(
                    f"Posts of type '{post.post_type}' cannot have article updated"
                )
        elif not post.is_self:
            # legacy validation
            raise ValueError("Posts with a url cannot be updated")

        with transaction.atomic():
            if text:
                Post.objects.filter(post_id=post_id).update(text=text, edited=True)
                return proxy_post(post.edit(text))

            edited = False

            if article_content:
                post.article.content = article_content
                edited = True
            if cover_image:
                if hasattr(cover_image, "name"):
                    post.article.cover_image.save(
                        f"article_image_{post.id}.jpg", cover_image, save=False
                    )
                    edited = True
            elif post.article.cover_image:
                post.article.cover_image = None
                edited = True
            post.article.save()

        if edited:
            # pylint: disable=protected-access
            post._self_post.edited = True
            post._self_post.save()

        return post

    def pin_post(self, post_id, pinned):
        """
        Pin the Post!

        Args:
            post_id(str): the base36 id for the post
            pinned(bool): the value for the 'stickied' field
        """
        post = self.get_post(post_id)
        post.mod.sticky(pinned)

    @reddit_object_persist(search_index_helpers.update_post_removal_status)
    def remove_post(self, post_id):
        """
        Removes the post, opposite of approve_post

        Args:
            post_id(str): the base36 id for the post
        """
        post = self.get_post(post_id)
        with transaction.atomic():
            Post.objects.filter(post_id=post_id).update(removed=True)
            post.mod.remove()
        return post

    @reddit_object_persist(search_index_helpers.update_post_removal_status)
    def approve_post(self, post_id):
        """
        Approves the post, opposite of remove_post

        Args:
            post_id(str): the base36 id for the post
        """
        post = self.get_post(post_id)
        with transaction.atomic():
            Post.objects.filter(post_id=post_id).update(removed=False)
            post.mod.approve()
        return post

    @reddit_object_persist(search_index_helpers.set_post_to_deleted)
    def delete_post(self, post_id):
        """
        Deletes the post

        Args:
            post_id(str): the id of the post to delete

        """
        post = self.get_post(post_id)
        with transaction.atomic():
            # pylint: disable=protected-access
            post._self_post.deleted = True
            post._self_post.save()
            post.delete()
        return post

    @reddit_object_persist(search_index_helpers.index_new_comment)
    def create_comment(self, text, post_id=None, comment_id=None):
        """
        Create a new comment in reply to a post or comment

        Args:
            text(str): the text of the comment
            post_id(str): the parent post id if replying to a post
            comment_id(str): the parent comment id if replying to a comment

        Raises:
            ValueError: if both post_id and comment_id are provided

        Returns:
            praw.models.Comment: the submitted comment
        """
        if num_items_not_none([post_id, comment_id]) != 1:
            raise ValueError("Exactly one of post_id and comment_id must be provided")

        if post_id is not None:
            comment = self.get_post(post_id).reply(text)
        else:
            comment = self.get_comment(comment_id).reply(text)

        _, link_id = get_kind_and_id(comment.link_id)

        with transaction.atomic():
            Post.objects.filter(post_id=link_id).update(
                num_comments=Coalesce("num_comments", 0) + 1
            )

            create_comment(
                post=Post.objects.get(post_id=link_id),
                comment=comment,
                author=self.user,
            )

        return comment

    @reddit_object_persist(search_index_helpers.update_comment_text)
    def update_comment(self, comment_id, text):
        """
        Updates a existing comment

        Args:
            comment_id(str): the id of the comment
            text(str): the updated text of the comment

        Returns:
            praw.models.Comment: the updated comment
        """
        comment = self.get_comment(comment_id)

        with transaction.atomic():
            Comment.objects.filter(comment_id=comment.id).update(text=text, edited=True)
            comment = comment.edit(text)
        return comment

    @reddit_object_persist(search_index_helpers.update_comment_removal_status)
    def remove_comment(self, comment_id):
        """
        Removes a comment

        Args:
            comment_id(str): the id of the comment
        """
        comment = self.get_comment(comment_id)
        with transaction.atomic():
            Comment.objects.filter(comment_id=comment_id).update(removed=True)
            comment.mod.remove()
        return comment

    @reddit_object_persist(search_index_helpers.update_comment_removal_status)
    def approve_comment(self, comment_id):
        """
        Approves a comment

        Args:
            comment_id(str): the id of the comment
        """
        comment = self.get_comment(comment_id)
        with transaction.atomic():
            Comment.objects.filter(comment_id=comment_id).update(removed=False)
            comment.mod.approve()
        return comment

    @reddit_object_persist(search_index_helpers.set_comment_to_deleted)
    def delete_comment(self, comment_id):
        """
        Deletes the comment

        Args:
            comment_id(str): the id of the comment to delete

        """
        comment = self.get_comment(comment_id)
        with transaction.atomic():
            Comment.objects.filter(comment_id=comment_id).update(deleted=False)
            comment.delete()
        return comment

    def get_comment(self, comment_id):
        """
        Gets the comment

        Args:
            comment_id(str): the base36 id for the comment

        Returns:
            praw.models.Comment: the comment
        """
        return self.reddit.comment(comment_id)

    def list_comments(self, post_id, sort):
        """
        Lists the comments of a post_id

        Args:
            post_id(str): the base36 id for the post
            sort(str): the sort method for comments

        Returns:
            praw.models.CommentForest: the base of the comment tree
        """
        if sort not in VALID_COMMENT_SORT_TYPES:
            raise ValueError(
                "Sort method '{}' is not supported for comments".format(sort)
            )

        post = self.get_post(post_id)
        post.comment_sort = sort
        post.comment_limit = settings.OPEN_DISCUSSIONS_REDDIT_COMMENTS_LIMIT
        return post.comments

    def more_comments(self, parent_id, post_id, children, sort):
        """
        Fetches data for a comment and its children and returns a list of comments
        (which might include another MoreComment)

        Args:
            parent_id (str): the fullname for the comment
            post_id (str): the id of the post
            children (list(str)):
                a list of comment ids
            sort(str): the sort method for comments

        Returns:
            list: A list of comments, might include a MoreComment at the end if more fetching required
        """
        more_comments = self.init_more_comments(
            parent_id=parent_id, post_id=post_id, children=children, sort=sort
        )

        # more_comments.comments() can return either a list of comments or a CommentForest object
        comments = more_comments.comments()
        if isinstance(comments, CommentForest):
            comments = comments.list()

        # if the number of comments is less than the number of children, it means that the morecomments
        # object did not return all the comments, so we need to manually add another morecomments
        # object with the remaining children; not sure why praw does not do it automatically
        # anyway this seems to happen only with objects that do NOT look like this one:
        # <MoreComments count=0, children=[]>
        if len(comments) < len(children):
            remaining_morecomments = self.init_more_comments(
                parent_id=parent_id,
                post_id=post_id,
                children=children[len(comments) :],
                sort=sort,
            )
            comments.append(remaining_morecomments)
        return comments

    def init_more_comments(self, parent_id, post_id, children, sort):
        """
        Initializes a MoreComments instance from the passed data and fetches channel

        Args:
            parent_id (str): the fullname for the comment
            post_id (str): the id of the post
            children(list(str)):
                a list of comment ids
            sort(str): the sort method for comments

        Returns:
            praw.models.MoreComments: the set of more comments
        """
        if parent_id is not None:
            qualified_parent_id = "{kind}_{parent_id}".format(
                kind=get_kind_mapping()["comment"], parent_id=parent_id
            )
        else:
            qualified_parent_id = "{kind}_{parent_id}".format(
                kind=get_kind_mapping()["submission"], parent_id=post_id
            )

        if sort not in VALID_COMMENT_SORT_TYPES:
            raise ValueError(
                "Sort method '{}' is not supported for comments".format(sort)
            )

        more_comments = more.MoreComments(
            self.reddit,
            {
                "children": children,
                "count": len(children),
                "parent_id": qualified_parent_id,
            },
        )
        more_comments.submission = self.reddit.submission(post_id)
        more_comments.submission.comment_limit = (
            settings.OPEN_DISCUSSIONS_REDDIT_COMMENTS_LIMIT
        )
        more_comments.submission.comment_sort = sort

        more_comments._load_comment = (
            replace_load_comment(  # pylint: disable=protected-access
                more_comments._load_comment  # pylint: disable=protected-access
            )
        )
        more_comments.comments()  # load the comments
        return more_comments

    def add_contributor(self, contributor_name, channel_name):
        """
        Adds a user to the contributors of a channel

        Args:
            contributor_name(str): the username for the user to be added as contributor
            channel_name(str): the channel name identifier

        Returns:
            praw.models.Redditor: the reddit representation of the user
        """
        try:
            user = User.objects.get(username=contributor_name)
        except User.DoesNotExist:
            raise NotFound("User {} does not exist".format(contributor_name))
        proxied_channel = self.get_channel(channel_name)
        with transaction.atomic():
            add_user_role(proxied_channel.channel, ROLE_CONTRIBUTORS, user)
            proxied_channel.contributor.add(user)
        search_index_helpers.upsert_profile(user.profile.id)
        return Redditor(self.reddit, name=contributor_name)

    def remove_contributor(self, contributor_name, channel_name):
        """
        Removes a user from the contributors of a channel

        Args:
            contributor_name(str): the username for the user to be added as contributor
            channel_name(str): the channel name identifier

        """
        try:
            user = User.objects.get(username=contributor_name)
        except User.DoesNotExist:
            raise NotFound("User {} does not exist".format(contributor_name))
        # This doesn't check if a user is a moderator because they should have access to the channel
        # regardless of their contributor status
        proxied_channel = self.get_channel(channel_name)
        with transaction.atomic():
            remove_user_role(proxied_channel.channel, ROLE_CONTRIBUTORS, user)
            proxied_channel.contributor.remove(user)
        search_index_helpers.upsert_profile(user.profile.id)

    def list_contributors(self, channel_name):
        """
        Returns a list of contributors in a channel

        Args:
            channel_name(str): the channel name identifier

        Returns:
            praw.models.listing.generator.ListingGenerator: a generator representing the contributors in the channel
        """
        return self.get_channel(channel_name).contributor()

    def add_moderator(self, moderator_name, channel_name):
        """
        Add a user to moderators for the channel

        Args:
            moderator_name(str): username of the user
            channel_name(str): name of the channel
        """
        try:
            user = User.objects.get(username=moderator_name)
        except User.DoesNotExist:
            raise NotFound("User {} does not exist".format(moderator_name))
        proxied_channel = self.get_channel(channel_name)
        self_channel = Channel.objects.get(name=channel_name)
        with transaction.atomic():
            add_user_role(proxied_channel.channel, ROLE_MODERATORS, user)
            try:
                proxied_channel.moderator.add(user)
                Api(user).accept_invite(channel_name)
                NotificationSettings.objects.get_or_create(
                    user=user,
                    notification_type=NOTIFICATION_TYPE_MODERATOR,
                    channel=self_channel,
                    defaults={"trigger_frequency": FREQUENCY_IMMEDIATE},
                )

            except APIException as ex:
                if ex.error_type != "ALREADY_MODERATOR":
                    raise

        search_index_helpers.upsert_profile(user.profile.id)

    def accept_invite(self, channel_name):
        """
        Accept invitation as a subreddit moderator

        Args:
            channel_name(str): name of the channel
        """
        self.get_channel(channel_name).mod.accept_invite()

    def remove_moderator(self, moderator_name, channel_name):
        """
        Remove moderator from a channel

        Args:
            moderator_name(str): username of the user
            channel_name(str): name of the channel
        """
        try:
            user = User.objects.get(username=moderator_name)
        except User.DoesNotExist:
            raise NotFound("User {} does not exist".format(moderator_name))

        proxied_channel = self.get_channel(channel_name)
        self_channel = Channel.objects.get(name=channel_name)
        with transaction.atomic():
            remove_user_role(proxied_channel.channel, ROLE_MODERATORS, user)
            proxied_channel.moderator.remove(user)
            NotificationSettings.objects.filter(
                user=user,
                channel=self_channel,
                notification_type=NOTIFICATION_TYPE_MODERATOR,
            ).delete()

        search_index_helpers.upsert_profile(user.profile.id)

    def _list_moderators(self, *, channel_name, moderator_name):
        """
        Returns a list of moderators for the channel

        Args:
            channel_name(str): name of the channel
            moderator_name(str): optional moderator username to filter list to

        Returns:
            praw.models.listing.generator.ListingGenerator: a generator representing the contributors in the channel
        """
        return self.get_channel(channel_name).moderator(redditor=moderator_name)

    def list_moderators(self, channel_name):
        """
        Returns a list of moderators for the channel

        Args:
            channel_name(str): name of the channel

        Returns:
            praw.models.listing.generator.ListingGenerator: a generator representing the contributors in the channel
        """
        return self._list_moderators(channel_name=channel_name, moderator_name=None)

    def is_moderator(self, channel_name, moderator_name):
        """
        Returns True if the given username is a moderator on the channel

        Args:
            channel_name(str): name of the channel
            moderator_name(str): moderator username

        Returns:
            bool: True if the given username is a moderator on the channel
        """
        if not moderator_name:
            # If we just let this pass through to reddit it will helpfully assume we mean to return all moderators.
            # So we have to be explicit here.
            raise ValueError("Missing moderator_name")
        # generators always eval True, so eval as list first and then as bool
        try:
            return bool(
                list(
                    self._list_moderators(
                        channel_name=channel_name, moderator_name=moderator_name
                    )
                )
            )
        except PrawForbidden:
            return False

    def add_subscriber(self, subscriber_name, channel_name):
        """
        Adds an user to the subscribers of a channel

        Args:
            subscriber_name(str): the username for the user to be added as subscriber
            channel_name(str): the channel name identifier

        Returns:
            praw.models.Redditor: the reddit representation of the user
        """
        try:
            user = User.objects.get(username=subscriber_name)
        except User.DoesNotExist:
            raise NotFound("User {} does not exist".format(subscriber_name))
        channel = Api(user).get_channel(channel_name)
        with transaction.atomic():
            sync_channel_subscription_model(channel_name, user)
            try:
                channel.subscribe()
            except PrawForbidden as ex:
                raise PermissionDenied() from ex
        search_index_helpers.upsert_profile(user.profile.id)
        return Redditor(self.reddit, name=subscriber_name)

    def remove_subscriber(self, subscriber_name, channel_name):
        """
        Removes an user from the subscribers of a channel

        Args:
            subscriber_name(str): the username for the user to be added as subscriber
            channel_name(str): the channel name identifier

        """
        try:
            user = User.objects.get(username=subscriber_name)
        except User.DoesNotExist:
            raise NotFound("User {} does not exist".format(subscriber_name))
        channel = Api(user).get_channel(channel_name)
        with transaction.atomic():
            ChannelSubscription.objects.filter(
                user=user, channel__name=channel_name
            ).delete()
            try:
                channel.unsubscribe()
            except PrawNotFound:
                # User is already unsubscribed,
                # or maybe there's another unrelated 403 error from reddit, but we can't tell the difference,
                # and the double removal case is probably more common.
                pass
        search_index_helpers.upsert_profile(user.profile.id)

    def is_subscriber(self, subscriber_name, channel_name):
        """
        Checks if an user is subscriber a channel

        Args:
            subscriber_name(str): the username for the user to be added as subscriber
            channel_name(str): the channel name identifier

        Returns:
            bool: whether the user has subscribed to the channel
        """
        try:
            user = User.objects.get(username=subscriber_name)
        except User.DoesNotExist:
            raise NotFound("User {} does not exist".format(subscriber_name))

        api = Api(user)
        return channel_name in (channel.display_name for channel in api.list_channels())

    def report_post(self, post_id, reason):
        """
        Reports a post to moderators

        Args:
            post_id(str): the id of the post to report
            reason(str): the reason why the post is being reported
        """
        self.get_post(post_id).report(reason)

    def report_comment(self, comment_id, reason):
        """
        Reports a comment to moderators

        Args:
            comment_id(str): the id of the comment to report
            reason(str): the reason why the comment is being reported
        """
        self.get_comment(comment_id).report(reason)

    def list_reports(self, channel_name):
        """
        Lists reported content in a channel

        Args:
            channel_name(str): the channel name identifier

        Returns:
            praw.models.listing.generator.ListingGenerator: a generator representing the reports in the channel
        """
        return self.get_channel(channel_name).mod.reports()

    def ignore_comment_reports(self, comment_id):
        """
        Ignore further reports on this comment

        Args:
            comment_id(str): the id of the comment to report
        """
        self.get_comment(comment_id).mod.ignore_reports()

    def ignore_post_reports(self, post_id):
        """
        Ignore further reports on this post

        Args:
            post_id(str): the id of the post to report
        """
        self.get_post(post_id).mod.ignore_reports()

    def add_post_subscription(self, post_id):
        """
        Adds a subscription to a post

        Args:
            post_id(str): the id of the post to subscribe to

        Returns:
            Subscription: the subscription
        """
        subscription, _ = Subscription.objects.get_or_create(
            user=self.user,
            post_id=post_id,
            comment_id=None,  # must be explicit about this
        )
        return subscription

    def remove_post_subscription(self, post_id):
        """
        Remove a subscription to a post

        Args:
            post_id(str): the id of the post to unsubscribe from
        """
        Subscription.objects.filter(
            user=self.user, post_id=post_id, comment_id__isnull=True
        ).delete()

    def add_comment_subscription(self, post_id, comment_id):
        """
        Adds a subscription to a comment

        Args:
            post_id(str): the id of the post to subscribe to
            comment_id(str): the id of the comment to subscribe to

        Returns:
            Subscription: the subscription
        """
        subscription, _ = Subscription.objects.get_or_create(
            user=self.user, post_id=post_id, comment_id=comment_id
        )
        return subscription

    def remove_comment_subscription(self, post_id, comment_id):
        """
        Remove a subscription to a comment

        Args:
            post_id(str): the id of the post to unsubscribe from
            comment_id(str): the id of the comment to unsubscribe from
        """
        Subscription.objects.filter(
            user=self.user, post_id=post_id, comment_id=comment_id
        ).delete()
