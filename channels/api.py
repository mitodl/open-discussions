"""Channels APIs"""
# pylint: disable=too-many-public-methods
from datetime import datetime, timedelta
from urllib.parse import urljoin

import pytz
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
import praw
from praw.models.reddit import more
from praw.models.reddit.redditor import Redditor
from prawcore.exceptions import (
    Forbidden as PrawForbidden,
    NotFound as PrawNotFound,
)
from rest_framework.exceptions import (
    PermissionDenied,
    NotFound,
)

from channels.models import (
    RedditAccessToken,
    RedditRefreshToken,
)

from open_discussions.utils import now_in_utc

CHANNEL_TYPE_PUBLIC = 'public'
CHANNEL_TYPE_PRIVATE = 'private'

VALID_CHANNEL_TYPES = (
    CHANNEL_TYPE_PRIVATE,
    CHANNEL_TYPE_PUBLIC,
)

USER_AGENT = 'MIT-Open: {version}'
ACCESS_TOKEN_HEADER_NAME = 'X-Access-Token'

CHANNEL_SETTINGS = (
    'header_title',
    'link_type',
    'public_description',
    'submit_link_label',
    'submit_text',
    'submit_text_label',
)

# this comes from https://github.com/mitodl/reddit/blob/master/r2/r2/models/token.py#L270
FULL_ACCESS_SCOPE = '*'
EXPIRES_IN_OFFSET = 30  # offsets the reddit refresh_token expirations by 30 seconds

User = get_user_model()


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
    refresh_token_url = urljoin(settings.OPEN_DISCUSSIONS_REDDIT_URL, '/api/v1/generate_refresh_token')

    session = _get_session()
    return session.get(refresh_token_url, params={'username': username}).json()


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
            refresh_token = RedditRefreshToken.objects.filter(user=user).select_for_update()[0]
            if not refresh_token.token_value:
                response = _get_refresh_token(user.username)
                refresh_token.token_value = response['refresh_token']
                refresh_token.save()

                # the response also returns a valid access_token, so we might as well store that for use
                # offset it negatively a bit to account for response time
                expires_at = now_in_utc() + timedelta(seconds=response['expires_in'] - EXPIRES_IN_OFFSET)
                access_token = RedditAccessToken.objects.create(
                    user=user,
                    token_value=response['access_token'],
                    token_expires_at=expires_at
                )

    # return the refresh token and access_token
    return refresh_token, (access_token or RedditAccessToken.valid_tokens_for_user(user, threshold_date).first())


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
            token_expires_at=expires_at.replace(tzinfo=pytz.utc)
        )

    return client


def _get_client_base_kwargs():
    """
    Returns common kwargs passed to praw.Redditor

    Returns:
        dict: set of client kwargs
    """
    return {
        'reddit_url': settings.OPEN_DISCUSSIONS_REDDIT_URL,
        'oauth_url': settings.OPEN_DISCUSSIONS_REDDIT_URL,
        'short_url': settings.OPEN_DISCUSSIONS_REDDIT_URL,
        'user_agent': _get_user_agent(),
        'requestor_kwargs': _get_requester_kwargs(),
        'check_for_updates': False,
        'client_id': settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID,
        'client_secret': settings.OPEN_DISCUSSIONS_REDDIT_SECRET,
    }


def _get_session():
    """
    Get a session to be used for communicating with reddit

    Returns:
        requests.Session: A session
    """
    session = requests.Session()
    session.verify = settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL
    session.headers.update({
        ACCESS_TOKEN_HEADER_NAME: settings.OPEN_DISCUSSIONS_REDDIT_ACCESS_TOKEN,
    })
    return session


def _get_requester_kwargs():
    """
    Gets the arguments for the praw requester

    Returns:
        dict: dictionary of requester arguments
    """
    return {
        'session': _get_session(),
    }


def _get_client(user):
    """
    Get a configured Reddit client_id

    Args:
        user (User): the authenticated user

    Returns:
        praw.Reddit: configured reddit client
    """
    refresh_token, access_token = get_or_create_auth_tokens(user)

    return _configure_access_token(praw.Reddit(
        refresh_token=refresh_token.token_value,
        **_get_client_base_kwargs(),
    ), access_token, user)


def _get_user_agent():
    """Gets the user agent"""
    return USER_AGENT.format(version=settings.VERSION)


def evict_expired_access_tokens():
    """Evicts expired access tokens"""
    # give a 5-minute buffer
    now = now_in_utc() - timedelta(minutes=5)
    RedditAccessToken.objects.filter(token_expires_at__lt=now).delete()


class Api:
    """Channel API"""
    def __init__(self, user):
        """Constructor"""
        self.user = user
        self.reddit = _get_client(user=user)

    def list_channels(self):
        """
        List the channels

        Returns:
            ListingGenerator(praw.models.Subreddit): a generator over channel listings
        """
        return self.reddit.user.subreddits()

    def get_channel(self, name):
        """
        Get the channel

        Returns:
            praw.models.Subreddit: the specified channel
        """
        return self.reddit.subreddit(name)

    def create_channel(self, name, title, channel_type=CHANNEL_TYPE_PUBLIC, **other_settings):
        """
        Create a channel

        Args:
            name (str): name of the channel
            title (str): title of the channel
            channel_type (str): type of the channel
            **other_settings (dict): dict of additional settings

        Returns:
            praw.models.Subreddit: the created subreddit
        """
        if channel_type not in VALID_CHANNEL_TYPES:
            raise ValueError('Invalid argument channel_type={}'.format(channel_type))

        for key, value in other_settings.items():
            if key not in CHANNEL_SETTINGS:
                raise ValueError('Invalid argument {}={}'.format(key, value))

        return self.reddit.subreddit.create(
            name,
            title=title,
            subreddit_type=channel_type,
            **other_settings
        )

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
        if channel_type is not None and channel_type not in VALID_CHANNEL_TYPES:
            raise ValueError('Invalid argument channel_type={}'.format(channel_type))

        for key, value in other_settings.items():
            if key not in CHANNEL_SETTINGS:
                raise ValueError('Invalid argument {}={}'.format(key, value))

        values = other_settings.copy()
        if title is not None:
            values['title'] = title
        if channel_type is not None:
            values['subreddit_type'] = channel_type

        self.get_channel(name).mod.update(**values)
        return self.get_channel(name)

    def create_post(self, channel_name, title, text=None, url=None):
        """
        Create a new post in a channel

        Args:
            channel_name(str): the channel name identifier
            title(str): the title of the post
            text(str): the text of the post
            url(str): the url of the post

        Raises:
            ValueError: if both text and url are provided

        Returns:
            praw.models.Submission: the submitted post
        """
        if len(list(filter(lambda val: val is not None, [text, url]))) != 1:
            raise ValueError('Exactly one of text and url must be provided')
        return self.get_channel(channel_name).submit(title, selftext=text, url=url)

    def front_page(self, before=None, after=None, count=None):
        """
        List posts on front page using 'hot' algorithm

        Args:
            before (str): fullname of the first post on the next page
            after (str): fullname of the last post on the previous page
            count (int): number of posts seen so far

        Returns:
            praw.models.listing.generator.ListingGenerator:
                A generator of posts for a subreddit
        """
        params = {}
        if before is not None:
            params['before'] = before
        if after is not None:
            params['after'] = after
        if count is not None:
            params['count'] = count

        return self.reddit.front.hot(limit=settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT, params=params)

    def list_posts(self, channel_name, before=None, after=None, count=None):
        """
        List posts using the 'hot' algorithm

        Args:
            channel_name(str): the channel name identifier
            before (str): fullname of the first post on the next page
            after (str): fullname of the last post on the previous page
            count (int): number of posts seen so far

        Returns:
            praw.models.listing.generator.ListingGenerator:
                A generator of posts for a subreddit
        """
        params = {}
        if before is not None:
            params['before'] = before
        if after is not None:
            params['after'] = after
        if count is not None:
            params['count'] = count
        return self.get_channel(channel_name).hot(limit=settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT, params=params)

    def get_post(self, post_id):
        """
        Gets the post

        Args:
            post_id(str): the base36 id for the post

        Returns:
            praw.models.Submission: the submitted post
        """
        return self.reddit.submission(id=post_id)

    def update_post(self, post_id, text):
        """
        Updates the post

        Args:
            post_id(str): the base36 id for the post
            text (str): The text for the post

        Raises:
            ValueError: if the url post was provided

        Returns:
            praw.models.Submission: the submitted post
        """
        post = self.get_post(post_id)

        if not post.is_self:
            raise ValueError('Posts with a url cannot be updated')

        return post.edit(text)

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
        if len(list(filter(lambda val: val is not None, [post_id, comment_id]))) != 1:
            raise ValueError('Exactly one of post_id and comment_id must be provided')

        if post_id is not None:
            return self.get_post(post_id).reply(text)

        return self.get_comment(comment_id).reply(text)

    def update_comment(self, comment_id, text):
        """
        Updates a existing comment

        Args:
            comment_id(str): the id of the comment
            text(str): the updated text of the comment

        Returns:
            praw.models.Comment: the updated comment
        """

        return self.get_comment(comment_id).edit(text)

    def delete_comment(self, comment_id):
        """
        Deletes the comment

        Args:
            comment_id(str): the id of the comment to delete

        """
        self.get_comment(comment_id).delete()

    def get_comment(self, comment_id):
        """
        Gets the comment

        Args:
            comment_id(str): the base36 id for the comment

        Returns:
            praw.models.Comment: the comment
        """
        return self.reddit.comment(comment_id)

    def list_comments(self, post_id):
        """
        Lists the comments of a post_id

        Args:
            post_id(str): the base36 id for the post

        Returns:
            praw.models.CommentForest: the base of the comment tree
        """
        return self.get_post(post_id).comments

    def more_comments(self, comment_fullname, parent_fullname, count, children=None):
        """
        Initializes a MoreComments instance from the passed data and fetches channel

        Args:
            comment_fullname(str): the fullname for the comment
            parent_fullname(str): the fullname of the post
            count(int): the count of comments
            children(list(str)): the list of more comments (leave empty continue page links)

        Returns:
            praw.models.MoreComments: the set of more comments
        """
        submission_id = parent_fullname.split('_', 1)[1]
        comment_id = comment_fullname.split('_', 1)[1]
        data = {
            'id': comment_id,
            'name': comment_fullname,
            'parent_id': parent_fullname,
            'children': children or [],
            'count': count,
        }
        more_comments = more.MoreComments(self.reddit, data)
        more_comments.submission = self.reddit.submission(submission_id)
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
        self.get_channel(channel_name).contributor.add(user)
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
        self.get_channel(channel_name).contributor.remove(user)

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

        Returns:
            praw.models.Redditor: the reddit representation of the user
        """
        try:
            user = User.objects.get(username=moderator_name)
        except User.DoesNotExist:
            raise NotFound("User {} does not exist".format(moderator_name))
        channel = self.get_channel(channel_name)
        if moderator_name not in channel.moderator():
            channel.moderator.add(user)
            Api(user).accept_invite(channel_name)
        return Redditor(self.reddit, name=moderator_name)

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

        try:
            self.get_channel(channel_name).moderator.remove(user)
        except PrawForbidden:
            # User is already not a moderator,
            # or maybe there's another unrelated 403 error from reddit, but we can't tell the difference,
            # and the double removal case is probably more common.
            pass

    def list_moderators(self, channel_name):
        """
        Returns a list of moderators for the channel

        Args:
            channel_name(str): name of the channel

        Returns:
            praw.models.listing.generator.ListingGenerator: a generator representing the contributors in the channel
        """
        return self.get_channel(channel_name).moderator()

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
        try:
            channel.subscribe()
        except PrawForbidden as ex:
            raise PermissionDenied() from ex
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
        try:
            channel.unsubscribe()
        except PrawNotFound:
            # User is already unsubscribed,
            # or maybe there's another unrelated 403 error from reddit, but we can't tell the difference,
            # and the double removal case is probably more common.
            pass

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
