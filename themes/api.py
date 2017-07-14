"""Themes APIs"""
import requests
import praw
from praw.models.reddit import more

from django.conf import settings

THEME_TYPE_PUBLIC = 'public'
THEME_TYPE_PRIVATE = 'private'

VALID_THEME_TYPES = (
    THEME_TYPE_PRIVATE,
    THEME_TYPE_PUBLIC,
)

USER_AGENT = 'MIT-Open: {version}'

THEME_SETTINGS = (
    'header_title',
    'link_type',
    'public_description',
    'submit_link_label',
    'submit_text',
    'submit_text_label',
)


def _get_user_credentials(user):
    """
    Get credentials for authenticated user

    Args:
        user (User): the authenticated user

    Returns:
        dict: set of configuration credentials for the user
    """
    # pylint: disable=fixme,unused-argument
    # TODO: get a refresh token
    return {
        'client_id': settings.OPEN_DISCUSSIONS_REDDIT_AUTHENTICATED_CLIENT_ID,
        'client_secret': settings.OPEN_DISCUSSIONS_REDDIT_AUTHENTICATED_SECRET,
    }


def _get_anonymous_credentials():
    """
    Get credentials for anonymous user

    Returns:
        dict: set of configuration credentials for the user
    """
    return {
        'client_id': settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_CLIENT_ID,
        'client_secret': settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_SECRET,
        'username': settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_USERNAME,
        'password': settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_PASSWORD,
    }


def _get_credentials(user=None):
    """
    Get credentials for authenticated or anonymous user

    Args:
        user (User): the authenticated user

    Returns:
        dict: set of configuration credentials for the user
    """
    return _get_user_credentials(user) if user is not None else _get_anonymous_credentials()


def _get_requester_kwargs():
    """
    Gets the arguments for the praw requester

    Returns:
        dict: dictionary of requester arguments
    """
    session = requests.Session()
    session.verify = settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL
    return {
        'session': session,
    }


def _get_client(user=None):
    """
    Get a configured Reddit client_id

    Args:
        user (User): the authenticated user

    Returns:
        praw.Reddit: configured reddit client
    """
    credentials = _get_credentials(user=user)

    return praw.Reddit(
        reddit_url=settings.OPEN_DISCUSSIONS_REDDIT_URL,
        oauth_url=settings.OPEN_DISCUSSIONS_REDDIT_URL,
        short_url=settings.OPEN_DISCUSSIONS_REDDIT_URL,
        user_agent=_get_user_agent(),
        requestor_kwargs=_get_requester_kwargs(),
        **credentials
    )


def _get_user_agent():
    """Gets the user agent"""
    return USER_AGENT.format(version=settings.VERSION)


class Api:
    """Theme API"""
    def __init__(self, user=None):
        """Constructor"""
        self.user = user
        self.reddit = _get_client(user=user)

    @property
    def is_anonymous(self):
        """Returns True if user is anonymous"""
        return self.user is None

    def _assert_authenticated(self):
        """Asserts a user is authenticated"""
        if self.is_anonymous:
            raise Exception('Anonymous user not allowed to update themes')

    def list_themes(self):
        """
        List the themes

        Returns:
            ListingGenerator(praw.models.Subreddit): a generator over theme listings
        """
        return self.reddit.user.subreddits() if not self.is_anonymous else self.reddit.subreddits.default()

    def get_theme(self, name):
        """
        Get the theme

        Returns:
            praw.models.Subreddit: the specified theme
        """
        return self.reddit.subreddit(name)

    def create_theme(self, name, title, theme_type=THEME_TYPE_PUBLIC, **other_settings):
        """
        Create a theme

        Args:
            name (str): name of the theme
            title (str): title of the theme
            theme_type (str): type of the theme
            **other_settings (dict): dict of additional settings

        Returns:
            praw.models.Subreddit: the created subreddit
        """
        if theme_type not in VALID_THEME_TYPES:
            raise ValueError('Invalid argument theme_type={}'.format(theme_type))

        for key, value in other_settings.items():
            if key not in THEME_SETTINGS:
                raise ValueError('Invalid argument {}={}'.format(key, value))

        self._assert_authenticated()

        # pylint: disable=fixme
        # TODO: verify user is authorized to do this

        return self.reddit.subreddit.create(
            name,
            title=title,
            subreddit_type=theme_type,
            **other_settings
        )

    def update_theme(self, name, title=None, theme_type=None, **other_settings):
        """
        Updates a theme

        Args:
            name (str): name of the theme
            title (str): title of the theme
            theme_type (str): type of the theme
            **other_settings (dict): dict of additional settings

        Returns:
            praw.models.Subreddit: the updated subreddit
        """
        if theme_type is not None and theme_type not in VALID_THEME_TYPES:
            raise ValueError('Invalid argument theme_type={}'.format(theme_type))

        for key, value in other_settings.items():
            if key not in THEME_SETTINGS:
                raise ValueError('Invalid argument {}={}'.format(key, value))

        self._assert_authenticated()

        # pylint: disable=fixme
        # TODO: verify user is authorized to do this

        values = other_settings.copy()
        if title is not None:
            values['title'] = title
        if theme_type is not None:
            values['subreddit_type'] = theme_type

        return self.get_theme(name).mod.update(**values)

    def create_post(self, theme_name, title, text=None, url=None):
        """
        Create a new post in a theme_name

        Args:
            theme_name(str): the theme name identifier
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
        return self.get_theme(theme_name).submit(title, selftext=text, url=url)

    def list_posts(self, theme_name):
        """
        List posts using the 'hot' algorithm

        Args:
            theme_name(str): the theme name identifier

        Returns:
            praw.models.listing.generator.ListingGenerator:
                A generator of posts for a subreddit
        """
        return self.get_theme(theme_name).hot()

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

        Raises:
            ValueError: if the url post was provided

        Returns:
            praw.models.Submission: the submitted post
        """
        post = self.get_post(post_id)

        if not post.selftext:
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
        Initializes a MoreComments instance from the passed data and fetches theme

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
