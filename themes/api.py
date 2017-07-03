"""Themes APIs"""
import praw
import requests

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
        return self.reddit.user.subreddits() if self.is_anonymous is not None else self.reddit.subreddits.default()

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
            praw.models.Subreddit: the created subreddit
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
        if text is not None and url is not None:
            raise ValueError('Only one of text and url can be provided')
        return self.get_theme(theme_name).submit(title, selftext=text, url=url)

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
            raise ValueError('Post a url cannot be updated')

        return post.edit(text)
