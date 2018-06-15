"""Channels APIs"""
# pylint: disable=too-many-public-methods, too-many-lines
import logging
from datetime import datetime, timedelta
from urllib.parse import urljoin

from functools import partialmethod
import pytz
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import transaction
from django.http.response import Http404
import praw
from praw.exceptions import APIException
from praw.models.comment_forest import CommentForest
from praw.models.reddit import more
from praw.models.reddit.redditor import Redditor
import prawcore
from prawcore.exceptions import (
    Forbidden as PrawForbidden,
    NotFound as PrawNotFound,
    ResponseException,
)
from rest_framework.exceptions import (
    PermissionDenied,
    NotFound,
)

from channels.constants import (
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
)
from channels.models import (
    Channel,
    Comment,
    Post,
    RedditAccessToken,
    RedditRefreshToken,
    Subscription,
)
from channels.utils import get_kind_mapping

from channels import tasks
from open_discussions import features
from open_discussions.utils import now_in_utc
from search.task_helpers import (
    reddit_object_persist,
    index_new_post,
    index_new_comment,
    update_post_text,
    update_post_removal_status,
    update_comment_text,
    update_indexed_score,
    update_comment_removal_status,
    set_comment_to_deleted,
    set_post_to_deleted,
)

USER_AGENT = 'MIT-Open: {version}'
ACCESS_TOKEN_HEADER_NAME = 'X-Access-Token'

CHANNEL_SETTINGS = (
    'header_title',
    'link_type',
    'description',
    'public_description',
    'submit_link_label',
    'submit_text',
    'submit_text_label',
)

# this comes from https://github.com/mitodl/reddit/blob/master/r2/r2/models/token.py#L270
FULL_ACCESS_SCOPE = '*'
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
        user (User): the authenticated user, or None for anonymous user

    Returns:
        praw.Reddit: configured reddit client
    """
    if user.is_anonymous:
        return praw.Reddit(
            **_get_client_base_kwargs(),
        )

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


@features.if_feature_enabled(features.KEEP_LOCAL_COPY)
def sync_channel_model(name):
    """
    Create the channel in our database if it doesn't already exist

    Args:
        name (str): The name of the channel

    Returns:
        Channel: The channel object
    """
    return Channel.objects.get_or_create(name=name)[0]


@features.if_feature_enabled(features.KEEP_LOCAL_COPY)
def sync_post_model(*, channel_name, post_id):
    """
    Create a new Post if it doesn't exist already. Also create a new Channel if necessary

    Args:
        channel_name (str): The name of the channel
        post_id (str): The id of the post

    Returns:
        Post: The post object
    """
    with transaction.atomic():
        post = Post.objects.filter(post_id=post_id).first()
        if post is not None:
            return post

        channel = sync_channel_model(channel_name)
        return Post.objects.get_or_create(
            post_id=post_id,
            defaults={'channel': channel},
        )[0]


@features.if_feature_enabled(features.KEEP_LOCAL_COPY)
def sync_comment_model(*, channel_name, post_id, comment_id, parent_id):
    """
    Create a new Comment if it doesn't already exist. Also create a new Post and Channel if necessary

    Args:
        channel_name (str): The name of the channel
        post_id (str): The id of the post
        comment_id (str): The id of the comment
        parent_id (str): The id of the reply comment. If None the parent is the post

    Returns:
        Comment: The comment object
    """
    with transaction.atomic():
        comment = Comment.objects.filter(comment_id=comment_id).first()
        if comment is not None:
            return comment

        post = sync_post_model(channel_name=channel_name, post_id=post_id)
        return Comment.objects.get_or_create(
            comment_id=comment_id,
            defaults={
                'post': post,
                'parent_id': parent_id,
            }
        )[0]


class Api:
    """Channel API"""
    def __init__(self, user):
        """Constructor"""
        if user is None:
            user = AnonymousUser()

        if user.is_anonymous and not features.is_enabled(features.ANONYMOUS_ACCESS):
            # This feature flag is also checked in the permissions layer, but just in case
            raise Exception("Anonymous access is not allowed")

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
        # Until we decide otherwise anonymous users should not see any channels in the list
        return self.reddit.user.subreddits(limit=None) if not self.user.is_anonymous else []

    def get_channel(self, name):
        """
        Get the channel

        Args:
            name (str): The channel name

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

        channel = self.reddit.subreddit.create(
            name,
            title=title,
            subreddit_type=channel_type,
            **other_settings
        )
        tasks.sync_channel_model(name)
        return channel

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

    @staticmethod
    def _apply_vote(instance, validated_data, allow_downvote=False, instance_type=None):
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
        upvote = validated_data.get('upvoted')
        if allow_downvote:
            downvote = validated_data.get('downvoted')
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

        if vote_action == VoteActions.UPVOTE:
            instance.upvote()
        elif vote_action == VoteActions.DOWNVOTE:
            instance.downvote()
        elif vote_action in (VoteActions.CLEAR_UPVOTE, VoteActions.CLEAR_DOWNVOTE):
            instance.clear_vote()

        try:
            update_indexed_score(instance, instance_type, vote_action)
        except Exception:  # pylint: disable=broad-except
            log.exception('Error occurred while trying to index [%s] object score', instance_type)
        return True

    apply_post_vote = partialmethod(_apply_vote, allow_downvote=False, instance_type=POST_TYPE)
    apply_comment_vote = partialmethod(_apply_vote, allow_downvote=True, instance_type=COMMENT_TYPE)

    @reddit_object_persist(persistence_func=index_new_post)
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
        post = self.get_channel(channel_name).submit(title, selftext=text, url=url)
        tasks.sync_post_model(
            channel_name=channel_name,
            post_id=post.id,
        )
        return post

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

    def _get_listing(self, listing, listing_params):
        """
        List posts using the 'hot' algorithm

        Args:
            listing(praw.models.listing.BaseListingMixin): the listing to returna  generator for
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
            params['before'] = before
        if after is not None:
            params['after'] = after
        if count is not None:
            params['count'] = count

        kwargs = {
            'limit': settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT,
            'params': params,
        }

        if sort == POSTS_SORT_HOT:
            return listing.hot(**kwargs)
        elif sort == POSTS_SORT_NEW:
            return listing.new(**kwargs)
        elif sort == POSTS_SORT_TOP:
            return listing.top(**kwargs)
        else:
            raise Exception("Sort method '{}' is in VALID_POST_SORT_TYPES but not actually supported".format(sort))

    def get_post(self, post_id):
        """
        Gets the post

        Args:
            post_id(str): the base36 id for the post

        Returns:
            praw.models.Submission: the submitted post
        """
        return self.reddit.submission(id=post_id)

    @reddit_object_persist(persistence_func=update_post_text)
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

    def pin_post(self, post_id, pinned):
        """
        Pin the Post!

        Args:
            post_id(str): the base36 id for the post
            pinned(bool): the value for the 'stickied' field
        """
        post = self.get_post(post_id)
        post.mod.sticky(pinned)

    @reddit_object_persist(persistence_func=update_post_removal_status)
    def remove_post(self, post_id):
        """
        Removes the post, opposite of approve_post

        Args:
            post_id(str): the base36 id for the post
        """
        post = self.get_post(post_id)
        post.mod.remove()
        return post

    @reddit_object_persist(persistence_func=update_post_removal_status)
    def approve_post(self, post_id):
        """
        Approves the post, opposite of remove_post

        Args:
            post_id(str): the base36 id for the post
        """
        post = self.get_post(post_id)
        post.mod.approve()
        return post

    @reddit_object_persist(persistence_func=set_post_to_deleted)
    def delete_post(self, post_id):
        """
        Deletes the post

        Args:
            post_id(str): the id of the post to delete

        """
        post = self.get_post(post_id)
        post.delete()
        return post

    @reddit_object_persist(persistence_func=index_new_comment)
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
            reply = self.get_post(post_id).reply(text)
            parent_id = None
        else:
            reply = self.get_comment(comment_id).reply(text)
            parent_id = comment_id

        tasks.sync_comment_model(
            channel_name=reply.subreddit.display_name,
            post_id=reply.submission.id,
            comment_id=reply.id,
            parent_id=parent_id,
        )
        return reply

    @reddit_object_persist(persistence_func=update_comment_text)
    def update_comment(self, comment_id, text):
        """
        Updates a existing comment

        Args:
            comment_id(str): the id of the comment
            text(str): the updated text of the comment

        Returns:
            praw.models.Comment: the updated comment
        """
        comment = self.get_comment(comment_id).edit(text)
        return comment

    @reddit_object_persist(persistence_func=update_comment_removal_status)
    def remove_comment(self, comment_id):
        """
        Removes a comment

        Args:
            comment_id(str): the id of the comment
        """
        comment = self.get_comment(comment_id)
        comment.mod.remove()
        return comment

    @reddit_object_persist(persistence_func=update_comment_removal_status)
    def approve_comment(self, comment_id):
        """
        Approves a comment

        Args:
            comment_id(str): the id of the comment
        """
        comment = self.get_comment(comment_id)
        comment.mod.approve()
        return comment

    @reddit_object_persist(persistence_func=set_comment_to_deleted)
    def delete_comment(self, comment_id):
        """
        Deletes the comment

        Args:
            comment_id(str): the id of the comment to delete

        """
        comment = self.get_comment(comment_id)
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
            raise ValueError("Sort method '{}' is not supported for comments".format(sort))

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
            parent_id=parent_id,
            post_id=post_id,
            children=children,
            sort=sort,
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
                children=children[len(comments):],
                sort=sort
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
            qualified_parent_id = '{kind}_{parent_id}'.format(
                kind=get_kind_mapping()['comment'],
                parent_id=parent_id,
            )
        else:
            qualified_parent_id = '{kind}_{parent_id}'.format(
                kind=get_kind_mapping()['submission'],
                parent_id=post_id,
            )

        if sort not in VALID_COMMENT_SORT_TYPES:
            raise ValueError("Sort method '{}' is not supported for comments".format(sort))

        more_comments = more.MoreComments(self.reddit, {
            'children': children,
            'count': len(children),
            'parent_id': qualified_parent_id
        })
        more_comments.submission = self.reddit.submission(post_id)
        more_comments.submission.comment_limit = settings.OPEN_DISCUSSIONS_REDDIT_COMMENTS_LIMIT
        more_comments.submission.comment_sort = sort

        more_comments._load_comment = replace_load_comment(  # pylint: disable=protected-access
            more_comments._load_comment  # pylint: disable=protected-access
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
        try:
            channel.moderator.add(user)
            Api(user).accept_invite(channel_name)
        except APIException as ex:
            if ex.error_type != "ALREADY_MODERATOR":
                raise
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

    def list_moderators(self, channel_name, moderator_name=None):
        """
        Returns a list of moderators for the channel

        Args:
            channel_name(str): name of the channel
            moderator_name(str): optional moderator username to filter list to

        Returns:
            praw.models.listing.generator.ListingGenerator: a generator representing the contributors in the channel
        """
        return self.get_channel(channel_name).moderator(redditor=moderator_name)

    def is_moderator(self, channel_name, moderator_name):
        """
        Returns True if the given username is a moderator on the channel

        Args:
            channel_name(str): name of the channel
            moderator_name(str): moderator username

        Returns:
            bool: True if the given username is a moderator on the channel
        """
        # generators always eval True, so eval as list first and then as bool
        return bool(list(self.list_moderators(channel_name, moderator_name=moderator_name)))

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
            user=self.user,
            post_id=post_id,
            comment_id__isnull=True,
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
            user=self.user,
            post_id=post_id,
            comment_id=comment_id,
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
            user=self.user,
            post_id=post_id,
            comment_id=comment_id,
        ).delete()
