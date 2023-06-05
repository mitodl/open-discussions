"""Reddit fixtures"""
# pylint: disable=redefined-outer-name, unused-argument
from types import SimpleNamespace
import pytest

from channels import api
from channels.constants import CHANNEL_TYPE_PRIVATE, CHANNEL_TYPE_PUBLIC, LINK_TYPE_SELF
from channels.factories.models import PostFactory
from channels.factories.reddit import RedditFactories, FactoryStore
from channels.proxies import PostProxy
from channels.utils import render_article_text


@pytest.fixture
def praw_settings(settings, cassette_exists):
    """Settings needed to use Api client"""
    if cassette_exists:
        settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID = "client_id"
        settings.OPEN_DISCUSSIONS_REDDIT_SECRET = "secret"
        settings.OPEN_DISCUSSIONS_REDDIT_URL = "https://reddit.local"
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
        return reddit_factories.user("staff_user", is_staff=True)


@pytest.fixture()
def reddit_index_user(reddit_factories):
    """Override the staff_user fixture to use reddit_factories"""
    from channels.test_utils import no_ssl_verification

    with no_ssl_verification():
        return reddit_factories.user("index_user", is_staff=True)


@pytest.fixture()
def private_channel(reddit_factories, staff_user):
    """Returns a standard private channel for tests"""
    return reddit_factories.channel(
        "private_channel", staff_user, channel_type=CHANNEL_TYPE_PRIVATE
    )


@pytest.fixture
def public_channel(reddit_factories, staff_user):
    """Returns a standard public channel for tests"""
    return reddit_factories.channel(
        "public_channel", staff_user, channel_type=CHANNEL_TYPE_PUBLIC
    )


@pytest.fixture()
def staff_api(staff_user):
    """A fixture for an Api instance configured with the staff user"""
    return api.Api(staff_user)


@pytest.fixture()
def contributor_api(user):
    """A fixture for an Api instance configured with the contributor user"""
    return api.Api(user)


@pytest.fixture()
def private_channel_and_contributor(private_channel, staff_api, user, mocker):
    """Fixture for a channel and a user who is a contributor"""

    mocker.patch("search.search_index_helpers.upsert_profile", autospec=True)

    staff_api.add_contributor(user.username, private_channel.name)
    staff_api.add_subscriber(user.username, private_channel.name)
    return private_channel, user


@pytest.fixture()
def subscribed_channels(reddit_factories, staff_user, staff_api, user):
    """Fixture for five channels with a user who is a contributor & subscriber"""
    channels = []
    for i in range(5):
        channels.append(
            reddit_factories.channel(
                "private_channel_{}".format(i),
                staff_user,
                channel_type=CHANNEL_TYPE_PRIVATE,
            )
        )
        staff_api.add_contributor(user.username, channels[i].name)
        staff_api.add_subscriber(user.username, channels[i].name)
    return channels


@pytest.fixture()
def reddit_submission_obj():
    """A dummy Post object"""
    article_content = {"text": "some text"}
    return SimpleNamespace(
        author=SimpleNamespace(name="testuser"),
        article_content=article_content,
        plain_text=render_article_text(article_content),
        subreddit=SimpleNamespace(
            display_name="channel_1", title="Channel", subreddit_type="public"
        ),
        selftext="Body text",
        score=1,
        created=12345,
        id="a",
        title="Post Title",
        num_comments=1,
        is_self=True,
        likes=1,
        banned_by=None,
        edited=False,
        permalink="http://reddit.local/r/channel_1/a/post-title",
    )


@pytest.fixture()
def reddit_comment_obj(mocker, reddit_submission_obj):
    """A dummy Comment object"""
    return SimpleNamespace(
        parent=mocker.Mock(return_value=reddit_submission_obj),
        submission=reddit_submission_obj,
        author=SimpleNamespace(name="testuser"),
        subreddit=reddit_submission_obj.subreddit,
        body="Comment text",
        id="b",
        score=1,
        created=12345,
        likes=1,
        banned_by=None,
        edited=False,
        permalink=lambda: "/r/{}/{}".format(
            reddit_submission_obj.subreddit.display_name,
            "/r/{}/comments/a/post-title/43".format(
                reddit_submission_obj.subreddit.display_name
            ),
        ),
    )


@pytest.fixture()
def post_proxy(reddit_submission_obj):
    """A dummy PostProxy object based on the reddit_submission_obj fixture"""
    post = PostFactory.create(
        post_id=reddit_submission_obj.id,
        channel__name=reddit_submission_obj.subreddit.display_name,
        post_type=LINK_TYPE_SELF,
    )
    return PostProxy(reddit_submission_obj, post)
