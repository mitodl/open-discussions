"""Reddit fixtures"""
# pylint: disable=redefined-outer-name, unused-argument
from types import SimpleNamespace
import pytest

from channels import api
from channels.constants import (
    CHANNEL_TYPE_PRIVATE,
    CHANNEL_TYPE_PUBLIC,
)
from channels.factories import RedditFactories, FactoryStore


@pytest.fixture
def praw_settings(settings, cassette_exists):
    """Settings needed to use Api client"""
    if cassette_exists:
        settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID = 'client_id'
        settings.OPEN_DISCUSSIONS_REDDIT_SECRET = 'secret'
        settings.OPEN_DISCUSSIONS_REDDIT_URL = 'https://reddit.local'
    settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL = False
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 25
    return settings


@pytest.fixture()
def reddit_factories(use_betamax, cassette_name, cassette_exists):
    """RedditFactories fixture"""
    store = FactoryStore(cassette_name)
    ctx = RedditFactories(store)
    if cassette_exists:
        store.load()
    yield ctx
    if not cassette_exists:
        store.write()


@pytest.fixture()
def reddit_user(reddit_factories):
    """Override the user fixture to use reddit_factories"""
    return reddit_factories.user("contributor")


@pytest.fixture()
def reddit_staff_user(reddit_factories):
    """Override the staff_user fixture to use reddit_factories"""
    from channels.test_utils import no_ssl_verification
    with no_ssl_verification():
        return reddit_factories.user("staff_user")


@pytest.fixture()
def private_channel(reddit_factories, staff_user):
    """Returns a standard private channel for tests"""
    return reddit_factories.channel("private_channel", staff_user, channel_type=CHANNEL_TYPE_PRIVATE)


@pytest.fixture
def public_channel(reddit_factories, staff_user):
    """Returns a standard public channel for tests"""
    return reddit_factories.channel("public_channel", staff_user, channel_type=CHANNEL_TYPE_PUBLIC)


@pytest.fixture()
def staff_api(staff_user):
    """A fixture for an Api instance configured with the staff user"""
    return api.Api(staff_user)


@pytest.fixture()
def contributor_api(user):
    """A fixture for an Api instance configured with the contributor user"""
    return api.Api(user)


@pytest.fixture()
def private_channel_and_contributor(private_channel, staff_api, user):
    """Fixture for a channel and a user who is a contributor"""
    staff_api.add_contributor(user.username, private_channel.name)
    staff_api.add_subscriber(user.username, private_channel.name)
    return (private_channel, user)


@pytest.fixture()
def reddit_submission_obj():
    """A dummy Post object"""
    return SimpleNamespace(
        author=SimpleNamespace(name='Test User'),
        subreddit=SimpleNamespace(display_name='channel_1'),
        selftext='Body text',
        score=1,
        created=12345,
        id='a',
        title='Post Title',
        num_comments=1
    )


@pytest.fixture()
def reddit_comment_obj(mocker, reddit_submission_obj):
    """A dummy Comment object"""
    return SimpleNamespace(
        parent=mocker.Mock(return_value=reddit_submission_obj),
        submission=reddit_submission_obj,
        author=SimpleNamespace(name='Some Name'),
        subreddit=reddit_submission_obj.subreddit,
        body='Comment text',
        id='b',
        score=1,
        created=12345,
    )
