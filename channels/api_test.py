"""API tests"""
# pylint: disable=redefined-outer-name,too-many-lines
from unittest.mock import Mock, MagicMock
from urllib.parse import urljoin
from types import SimpleNamespace
from datetime import datetime, timedelta
import pytz

from django.contrib.auth.models import AnonymousUser
import pytest
from praw.models import Comment as RedditComment
from praw.models.comment_forest import CommentForest
from praw.models.reddit.redditor import Redditor
from prawcore.exceptions import ResponseException, Forbidden
from rest_framework.exceptions import NotFound

from channels import api
from channels.constants import (
    COMMENTS_SORT_BEST,
    CHANNEL_TYPE_PUBLIC,
    CHANNEL_TYPE_PRIVATE,
    CHANNEL_TYPE_RESTRICTED,
    VALID_CHANNEL_TYPES,
    POST_TYPE,
    COMMENT_TYPE,
    VoteActions,
    ROLE_CONTRIBUTORS,
    ROLE_MODERATORS,
    LINK_TYPE_LINK,
    LINK_TYPE_SELF,
    LINK_TYPE_ANY,
    EXTENDED_POST_TYPE_ARTICLE,
    POSTS_SORT_HOT,
)
from channels.factories.models import ArticleFactory, ChannelFactory, PostFactory
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
from channels.utils import DEFAULT_LISTING_PARAMS, ListingParams
from channels.test_utils import assert_properties_eq
from search import search_index_helpers
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


def _mock_channel(*, name, **kwargs):
    """Create a mock channel and associated DB record"""
    if not Channel.objects.filter(name=name).exists():
        ChannelFactory.create(name=name)
    return Mock(display_name=name, **kwargs)


def _mock_post(*, post_id, subreddit, **kwargs):
    """Create a mock post and associated DB record"""
    if not Post.objects.filter(post_id=post_id).exists():
        PostFactory.create(
            post_id=post_id,
            is_text=True,
            channel=Channel.objects.get(name=subreddit.display_name),
        )
    return Mock(
        id=post_id,
        created=1_547_749_404,
        ups=1,
        banned_by=None,
        removed=False,
        selftext="content",
        url="http://example.com",
        **kwargs,
    )


def _mock_comment(*, comment_id, submission, subreddit, parent_id, **kwargs):
    """Create a mock comment and associated DB record"""
    author = kwargs.pop("user", None) or UserFactory.create()
    mock_author = Mock()
    mock_author.configure_mock(name=author.username)
    comment = Mock(
        id=comment_id,
        parent_id=parent_id,
        body="comment body",
        removed=False,
        banned_by=None,
        created=1_547_749_404,
        score=1,
        author=mock_author,
        submission=submission,
        subreddit=subreddit,
        **kwargs,
    )
    api.create_comment(
        post=Post.objects.get(post_id=submission.id), comment=comment, author=author
    )
    return comment


@pytest.fixture()
def mock_get_client(mocker):
    """Mock reddit get_client"""
    return mocker.patch(
        "channels.api._get_client",
        autospec=True,
        return_value=MagicMock(
            subreddit=Mock(
                return_value=_mock_channel(
                    name="channel",
                    submit=Mock(
                        return_value=_mock_post(
                            post_id="abc", subreddit=_mock_channel(name="channel")
                        )
                    ),
                )
            ),
            submission=Mock(
                return_value=_mock_post(
                    post_id="abc",
                    subreddit=_mock_channel(name="subreddit"),
                    reply=Mock(
                        return_value=_mock_comment(
                            comment_id="456",
                            parent_id="t3_abc",
                            link_id="t3_abc",
                            submission=_mock_post(
                                post_id="abc", subreddit=_mock_channel(name="subreddit")
                            ),
                            subreddit=_mock_channel(name="subreddit"),
                        )
                    ),
                    edit=Mock(
                        return_value=_mock_post(
                            post_id="abc", subreddit=_mock_channel(name="subreddit")
                        )
                    ),
                )
            ),
            comment=Mock(
                return_value=_mock_comment(
                    comment_id="567",
                    parent_id="t3_123",
                    link_id="t3_123",
                    submission=_mock_post(
                        post_id="123", subreddit=_mock_channel(name="other_subreddit")
                    ),
                    subreddit=_mock_channel(name="other_subreddit"),
                    reply=Mock(
                        return_value=_mock_comment(
                            comment_id="789",
                            parent_id="t1_567",
                            link_id="t3_123",
                            submission=_mock_post(
                                post_id="123",
                                subreddit=_mock_channel(name="other_subreddit"),
                            ),
                            subreddit=_mock_channel(name="other_subreddit"),
                        )
                    ),
                )
            ),
        ),
    )


@pytest.fixture()
def mock_client(mock_get_client):
    """Mock reddit client"""
    return mock_get_client.return_value


@pytest.fixture()
def mock_upsert_profile(mocker):
    """Mock of upsert_profile function"""
    return mocker.patch("channels.api.search_index_helpers.upsert_profile")


@pytest.fixture()
def listing_params():
    """Fixture for a basic ListingParams object"""
    return ListingParams(None, None, 0, POSTS_SORT_HOT)


@pytest.mark.parametrize(
    "vote_func", [api.Api.apply_post_vote, api.Api.apply_comment_vote]
)
@pytest.mark.parametrize(
    "request_data,likes_value,expected_instance_vote_func",
    [
        ({"upvoted": True}, None, "upvote"),
        ({"upvoted": True}, False, "upvote"),
        ({"downvoted": True}, None, "downvote"),
        ({"downvoted": True}, True, "downvote"),
        ({"upvoted": False}, True, "clear_vote"),
        ({"downvoted": False}, False, "clear_vote"),
        ({"upvoted": True}, True, None),
        ({"upvoted": False}, False, None),
        ({"downvoted": True}, False, None),
        ({"downvoted": False}, True, None),
    ],
)
def test_apply_vote(
    mocker, vote_func, request_data, likes_value, expected_instance_vote_func
):
    """
    Tests that the functions to apply an upvote/downvote behave appropriately given
    the voting request and the current state of upvotes/downvotes for the user.
    """
    mocker.patch("search.search_index_helpers.update_indexed_score")
    mock_instance = mocker.Mock(likes=likes_value)
    vote_result = vote_func(mock_instance, request_data, allow_downvote=True)
    expected_vote_success = expected_instance_vote_func is not None
    assert vote_result is expected_vote_success
    if expected_vote_success:
        expected_vote_func = getattr(mock_instance, expected_instance_vote_func)
        assert expected_vote_func.call_count == 1


@pytest.mark.parametrize(
    "vote_func,expected_allowed_downvote,expected_instance_type",
    [
        (api.Api.apply_post_vote, False, POST_TYPE),
        (api.Api.apply_comment_vote, True, COMMENT_TYPE),
    ],
)
def test_vote_indexing(
    mocker, vote_func, expected_allowed_downvote, expected_instance_type
):
    """Test that an upvote/downvote calls a function to update the index"""
    post = PostFactory.create(is_text=True)
    patched_vote_indexer = mocker.patch(
        "channels.api.search_index_helpers.update_indexed_score"
    )
    # Test upvote
    mock_reddit_obj = Mock()
    mock_reddit_obj.id = post.post_id
    mock_reddit_obj.likes = False
    vote_func(mock_reddit_obj, {"upvoted": True})
    patched_vote_indexer.assert_called_once_with(
        mock_reddit_obj, expected_instance_type, VoteActions.UPVOTE
    )
    # Test downvote (which may not be allowed)
    patched_vote_indexer.reset_mock()
    mock_reddit_obj.likes = True
    vote_func(mock_reddit_obj, {"downvoted": True})
    assert patched_vote_indexer.called is expected_allowed_downvote
    if patched_vote_indexer.called:
        patched_vote_indexer.assert_called_once_with(
            mock_reddit_obj, expected_instance_type, VoteActions.DOWNVOTE
        )
    # Test unchanged vote
    patched_vote_indexer.reset_mock()
    mock_reddit_obj.likes = True
    vote_func(mock_reddit_obj, {"upvoted": True})
    assert not patched_vote_indexer.called


def test_get_session(settings):
    """Test that _get_session uses the access token from settings"""
    settings.OPEN_DISCUSSIONS_REDDIT_ACCESS_TOKEN = "ACCESS_TOKEN"
    # pylint: disable=protected-access
    assert api._get_session().headers[api.ACCESS_TOKEN_HEADER_NAME] == "ACCESS_TOKEN"


def test_get_channel_user(mock_get_client):
    """Test get_channels for logged-in user"""
    user = UserFactory.create()
    channel = api.Api(user=user).get_channel("test")
    assert channel == mock_get_client.return_value.subreddit.return_value
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.subreddit.assert_called_once_with("test")


def test_list_channels_user(mock_get_client):
    """Test list_channels for logged-in user"""
    user = UserFactory.create()
    mock_get_client.return_value.user.subreddits.return_value = [
        _mock_channel(name="abc")
    ]
    channels = api.Api(user=user).list_channels()
    assert channels == mock_get_client.return_value.user.subreddits.return_value
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.user.subreddits.assert_called_once_with(limit=None)


@pytest.mark.parametrize(
    "kwargs, expected, allowed_post_types",
    [
        [
            {"channel_type": CHANNEL_TYPE_PUBLIC},
            {"subreddit_type": CHANNEL_TYPE_PUBLIC},
            [LINK_TYPE_LINK, LINK_TYPE_SELF],
        ],
        [
            {"channel_type": CHANNEL_TYPE_PRIVATE},
            {"subreddit_type": CHANNEL_TYPE_PRIVATE},
            [LINK_TYPE_LINK, LINK_TYPE_SELF],
        ],
        [
            {"channel_type": CHANNEL_TYPE_RESTRICTED},
            {"subreddit_type": CHANNEL_TYPE_RESTRICTED},
            [LINK_TYPE_LINK, LINK_TYPE_SELF],
        ],
        [
            {"link_type": LINK_TYPE_ANY},
            {"link_type": LINK_TYPE_ANY},
            [LINK_TYPE_LINK, LINK_TYPE_SELF],
        ],
        [
            {"link_type": LINK_TYPE_LINK},
            {"link_type": LINK_TYPE_LINK},
            [LINK_TYPE_LINK],
        ],
        [
            {"link_type": LINK_TYPE_SELF},
            {"link_type": LINK_TYPE_SELF},
            [LINK_TYPE_SELF],
        ],
        [
            {"allowed_post_types": [LINK_TYPE_LINK]},
            {"link_type": LINK_TYPE_ANY},
            [LINK_TYPE_LINK],
        ],
    ],
)
def test_create_channel_user(
    mock_get_client, indexing_decorator, kwargs, expected, allowed_post_types
):
    """Test create_channel for logged-in user"""
    user = UserFactory.create()
    # some defaults
    input_kwargs = {
        "channel_type": CHANNEL_TYPE_PUBLIC,
        "link_type": LINK_TYPE_ANY,
        **kwargs,
    }
    expected = {
        "subreddit_type": input_kwargs["channel_type"],
        "link_type": input_kwargs["link_type"],
        **expected,
    }
    channel = api.Api(user=user).create_channel("name", "Title", **input_kwargs)
    assert channel == mock_get_client.return_value.subreddit.create.return_value
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.subreddit.create.assert_called_once_with(
        "name", title="Title", allow_top=True, **expected
    )
    assert indexing_decorator.mock_persist_func.call_count == 0
    assert Channel.objects.filter(name="name").exists()
    channel = Channel.objects.get(name="name")
    assert [
        key for key, enabled in channel.allowed_post_types if enabled
    ] == allowed_post_types
    assert ChannelGroupRole.objects.filter(channel=channel).count() == 2
    assert channel.widget_list is not None
    moderator_perms = api.get_role_model(
        channel, ROLE_MODERATORS
    ).group.groupobjectpermission_set.all()
    assert len(moderator_perms) == 1
    assert any(
        [
            p.content_object == channel.widget_list
            and p.permission.codename == "change_widgetlist"
            for p in moderator_perms
        ]
    )


@pytest.mark.parametrize("channel_setting", api.CHANNEL_SETTINGS)
def test_create_channel_setting(mock_client, channel_setting):
    """Test create_channel for {channel_setting}"""
    user = UserFactory.create()
    kwargs = {channel_setting: "value"} if channel_setting != "allow_top" else {}
    expected_kwargs = {"link_type": LINK_TYPE_ANY, **kwargs}
    channel = api.Api(user=user).create_channel("name", "Title", **kwargs)
    assert channel == mock_client.subreddit.create.return_value
    mock_client.subreddit.create.assert_called_once_with(
        "name",
        title="Title",
        subreddit_type=api.CHANNEL_TYPE_PUBLIC,
        allow_top=True,
        **expected_kwargs,
    )


def test_create_channel_invalid_setting(mock_client):
    """Test create_channel for invalid other_settings"""
    user = UserFactory.create()
    client = api.Api(user=user)
    with pytest.raises(ValueError):
        client.create_channel("name", "Title", invalidarg="bad")
    assert mock_client.subreddit.create.call_count == 0


def test_create_channel_user_invalid_type(mock_client):
    """Test create_channel for logged-in user"""
    user = UserFactory.create()
    client = api.Api(user=user)
    with pytest.raises(ValueError):
        client.create_channel("name", "Title", channel_type="notachanneltype")
    assert mock_client.subreddit.create.call_count == 0


def test_create_channel_invalid_membership(mock_client):
    """Test create_channel for logged-in user"""
    user = UserFactory.create()
    client = api.Api(user=user)
    with pytest.raises(ValueError):
        client.create_channel("name", "Title", membership_is_managed="notabool")
    assert mock_client.subreddit.create.call_count == 0


@pytest.mark.parametrize("channel_type", VALID_CHANNEL_TYPES)
def test_update_channel_type(mock_client, channel_type, indexing_decorator):
    """Test create_channel for channel_type"""
    user = UserFactory.create()
    channel = api.Api(user=user).update_channel("name", channel_type=channel_type)
    assert channel == mock_client.subreddit.return_value
    mock_client.subreddit.assert_called_with("name")
    assert mock_client.subreddit.call_count == 2
    mock_client.subreddit.return_value.mod.update.assert_called_once_with(
        subreddit_type=channel_type
    )
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.update_channel_index
        in indexing_decorator.mock_persist_func.original
    )


@pytest.mark.parametrize("channel_setting", api.CHANNEL_SETTINGS + ("title",))
def test_update_channel_setting(mock_client, channel_setting, indexing_decorator):
    """Test update_channel for channel_setting"""
    user = UserFactory.create()
    kwargs = {channel_setting: "value" if channel_setting != "allow_top" else False}
    channel = api.Api(user=user).update_channel("name", **kwargs)
    assert channel == mock_client.subreddit.return_value
    mock_client.subreddit.assert_called_with("name")
    assert mock_client.subreddit.call_count == 2
    mock_client.subreddit.return_value.mod.update.assert_called_once_with(**kwargs)
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.update_channel_index
        in indexing_decorator.mock_persist_func.original
    )


@pytest.mark.parametrize(
    "allowed_post_types",
    [
        [LINK_TYPE_LINK, LINK_TYPE_SELF, EXTENDED_POST_TYPE_ARTICLE],
        [LINK_TYPE_LINK, EXTENDED_POST_TYPE_ARTICLE],
        [LINK_TYPE_LINK, LINK_TYPE_SELF],
        [LINK_TYPE_SELF, EXTENDED_POST_TYPE_ARTICLE],
        [LINK_TYPE_LINK],
        [LINK_TYPE_SELF],
        [EXTENDED_POST_TYPE_ARTICLE],
    ],
)
def test_update_channel_allowed_(mock_client, allowed_post_types):
    """Test update_channel for channel_setting"""
    user = UserFactory.create()
    channel = ChannelFactory.create()

    updated_channel = api.Api(user=user).update_channel(
        channel.name, allowed_post_types=allowed_post_types
    )

    assert updated_channel == mock_client.subreddit.return_value
    mock_client.subreddit.assert_called_with(channel.name)
    assert mock_client.subreddit.call_count == 2
    mock_client.subreddit.return_value.mod.update.assert_called_once_with(
        link_type=LINK_TYPE_ANY
    )

    channel.refresh_from_db()
    assert [
        key for key, enabled in channel.allowed_post_types if enabled
    ] == allowed_post_types


@pytest.mark.parametrize("membership_is_managed", [None, True, False])
def test_update_channel_membership(mock_client, membership_is_managed):
    """Test update_channel for membership"""
    name = "name"
    Channel.objects.create(name=name)
    user = UserFactory.create()
    channel = api.Api(user=user).update_channel(
        name, membership_is_managed=membership_is_managed
    )
    assert channel == mock_client.subreddit.return_value
    mock_client.subreddit.assert_called_with(name)
    assert mock_client.subreddit.call_count == 2
    mock_client.subreddit.return_value.mod.update.assert_called_once_with()

    channel_obj = Channel.objects.get(name=name)
    assert channel_obj.membership_is_managed is (
        membership_is_managed if membership_is_managed is not None else False
    )


def test_update_channel_invalid_channel_type(mock_client):
    """update_channel should restrict to valid channel types"""
    user = UserFactory.create()
    with pytest.raises(ValueError):
        api.Api(user=user).update_channel("name", channel_type="not_a_type")
    assert mock_client.subreddit.call_count == 0


def test_update_channel_invalid_key(mock_client):
    """update_channel should restrict to valid channel types"""
    user = UserFactory.create()
    with pytest.raises(ValueError):
        api.Api(user=user).update_channel("name", unexpected="key")
    assert mock_client.subreddit.call_count == 0


def test_update_channel_invalid_membership(mock_client):
    """update_channel should restrict to valid channel types"""
    user = UserFactory.create()
    with pytest.raises(ValueError):
        api.Api(user=user).update_channel("name", membership_is_managed="not_a_bool")
    assert mock_client.subreddit.call_count == 0


DEFAULT_POST_PROPS = dict(
    title="Title", num_comments=0, edited=False, deleted=False, removed=False, score=1
)


class TestCreatePost:
    """Tests for channel API create_post method"""

    @pytest.fixture()
    def scenario(self, mock_client):
        """Fixture for setup and test data needed for all create_post tests"""
        mock_reddit_post_submit = mock_client.subreddit.return_value.submit
        mock_returned_post = mock_reddit_post_submit.return_value
        Post.objects.filter(
            post_id=mock_returned_post.id
        ).delete()  # don't want this for this test
        channel = Channel.objects.create(name="123")
        return SimpleNamespace(
            mock_reddit_post_submit=mock_reddit_post_submit,
            mock_returned_post=mock_returned_post,
            channel=channel,
        )

    @pytest.mark.parametrize("text", ["Text", None])
    @pytest.mark.parametrize("exclude_from_frontpage_emails", [True, False])
    def test_create_post_text(  # pylint: disable=protected-access,too-many-arguments
        self,
        mock_client,
        contributor_api,
        scenario,
        text,
        exclude_from_frontpage_emails,
        user,
    ):
        """Test create_post with text"""
        if not exclude_from_frontpage_emails:
            old_post = PostFactory.create(author=user)
            old_post.created_on = datetime.now(pytz.UTC) - timedelta(days=10)
            old_post.save()

        post = contributor_api.create_post(scenario.channel.name, "Title", text=text)
        assert post.__wrapped__ == scenario.mock_returned_post
        mock_client.subreddit.assert_called_once_with(scenario.channel.name)
        scenario.mock_reddit_post_submit.assert_called_once_with(
            "Title", selftext=text or "", url=None
        )
        post = Post.objects.filter(post_id=scenario.mock_returned_post.id)
        assert post.exists()
        assert_properties_eq(
            post.first(),
            dict(
                text=text or "",
                url=None,
                post_type=LINK_TYPE_SELF,
                exclude_from_frontpage_emails=exclude_from_frontpage_emails,
                **DEFAULT_POST_PROPS,
            ),
        )

    @pytest.mark.parametrize("exclude_from_frontpage_emails", [True, False])
    def test_create_post_url(  # pylint: disable=too-many-arguments
        self,
        mock_client,
        contributor_api,
        scenario,
        exclude_from_frontpage_emails,
        user,
    ):
        """Test create_post with url"""
        if not exclude_from_frontpage_emails:
            old_post = PostFactory.create(author=user)
            old_post.created_on = datetime.now(pytz.UTC) - timedelta(days=10)
            old_post.save()

        post = contributor_api.create_post(
            scenario.channel.name, "Title", url="http://google.com"
        )
        assert post.__wrapped__ == scenario.mock_returned_post
        mock_client.subreddit.assert_called_once_with(scenario.channel.name)
        scenario.mock_reddit_post_submit.assert_called_once_with(
            "Title", selftext=None, url="http://google.com"
        )
        post = Post.objects.filter(post_id=scenario.mock_returned_post.id)
        assert post.exists()
        assert_properties_eq(
            post.first(),
            dict(
                url="http://google.com",
                text=None,
                post_type=LINK_TYPE_LINK,
                exclude_from_frontpage_emails=exclude_from_frontpage_emails,
                **DEFAULT_POST_PROPS,
            ),
        )

    @pytest.mark.parametrize("exclude_from_frontpage_emails", [True, False])
    def test_create_post_article(  # pylint: disable=too-many-arguments
        self,
        mock_client,
        contributor_api,
        exclude_from_frontpage_emails,
        scenario,
        user,
    ):
        """Test create_post with article content"""
        if not exclude_from_frontpage_emails:
            old_post = PostFactory.create(author=user)
            old_post.created_on = datetime.now(pytz.UTC) - timedelta(days=10)
            old_post.save()

        post = contributor_api.create_post(
            scenario.channel.name, "Title", article_content=["data"]
        )
        assert post.__wrapped__ == scenario.mock_returned_post
        mock_client.subreddit.assert_called_once_with(scenario.channel.name)
        scenario.mock_reddit_post_submit.assert_called_once_with(
            "Title", selftext="", url=None
        )
        post = Post.objects.filter(post_id=scenario.mock_returned_post.id)
        assert post.exists()
        assert_properties_eq(
            post.first(),
            dict(
                url=None,
                text=None,
                post_type=EXTENDED_POST_TYPE_ARTICLE,
                exclude_from_frontpage_emails=exclude_from_frontpage_emails,
                **DEFAULT_POST_PROPS,
            ),
        )
        article_query = Article.objects.filter(
            post__post_id=scenario.mock_returned_post.id
        )
        assert article_query.exists() is True
        assert article_query.count() == 1
        assert article_query.first().content == ["data"]


@pytest.mark.parametrize(
    "kwargs",
    [
        {"url": "http://google.com", "text": "Text"},
        {"url": "http://google.com", "text": "Text", "article_content": []},
        {"url": "http://google.com", "article_content": []},
        {"text": "Text", "article_content": []},
    ],
)
def test_create_post_errors(mock_client, kwargs):
    """Test create_post with url and text (or neither) raises error"""
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.create_post("channel", "Title", **kwargs)
    assert mock_client.subreddit.call_count == 0


def test_list_posts(mock_client):
    """list_posts should return a generator of posts"""
    client = api.Api(UserFactory.create())
    posts = client.list_posts("channel", DEFAULT_LISTING_PARAMS)
    assert posts == mock_client.subreddit.return_value.hot.return_value
    mock_client.subreddit.return_value.hot.assert_called_once_with(
        limit=25, params={"count": 0}
    )
    mock_client.subreddit.assert_called_once_with("channel")


def test_list_posts_invalid_sort(mock_client):
    """list_posts should raise an error is sort is invalid"""
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.list_posts("channel", ListingParams(None, None, 0, "bad"))
        mock_client.subreddit.assert_called_once_with("channel")


def test_get_post(mock_client):
    """Test get_post"""
    client = api.Api(UserFactory.create())
    post = client.get_post("abc")
    assert post.__wrapped__ == mock_client.submission.return_value
    assert post._self_post.post_id == "abc"  # pylint: disable=protected-access
    mock_client.submission.assert_called_once_with(id="abc")


def test_update_post_text(mock_client, indexing_decorator):
    """Test update_post for text passes"""
    mock_client.submission.return_value.selftext = "text"
    client = api.Api(UserFactory.create())
    post = client.update_post("abc", text="Text")
    assert post.__wrapped__ == mock_client.submission.return_value.edit.return_value
    assert post._self_post.post_id == "abc"  # pylint: disable=protected-access
    mock_client.submission.assert_called_once_with(id="abc")
    mock_client.submission.return_value.edit.assert_called_once_with("Text")
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.update_post_text
        in indexing_decorator.mock_persist_func.original
    )


def test_update_post_article(mock_client, indexing_decorator):
    """Test update_post for article passes"""
    mock_client.submission.return_value.selftext = ""
    client = api.Api(UserFactory.create())
    Post.objects.filter(post_id=mock_client.submission.return_value.id).delete()
    article = PostFactory.create(
        is_article=True, post_id=mock_client.submission.return_value.id
    ).article
    updated_content = [{"data": "updated"}]
    post_id = article.post.post_id
    post = client.update_post(post_id, article_content=updated_content)
    assert post.__wrapped__ == mock_client.submission.return_value
    assert post._self_post.post_id == post_id  # pylint: disable=protected-access
    mock_client.submission.assert_called_once_with(id=post_id)
    article.refresh_from_db()
    assert article.content == updated_content
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.update_post_text
        in indexing_decorator.mock_persist_func.original
    )


@pytest.mark.parametrize(
    "kwargs, post_type",
    [
        [{"text": "abc"}, LINK_TYPE_LINK],
        [{"article_content": ["abc"]}, LINK_TYPE_LINK],
        [{}, LINK_TYPE_SELF],
        [{}, EXTENDED_POST_TYPE_ARTICLE],
        [{"article_content": ["abc"], "text": "abc"}, LINK_TYPE_SELF],
        [{"article_content": ["abc"], "text": "abc"}, EXTENDED_POST_TYPE_ARTICLE],
        [{}, EXTENDED_POST_TYPE_ARTICLE],
        [{"text": "abc"}, None],
        [{"article_content": ["abc"]}, None],
        [{"article_content": ["abc"], "text": "abc"}, None],
    ],
)
def test_update_post_invalid(mock_client, kwargs, post_type):
    """Test update_post raises error if updating a post which is not a self post"""
    Post.objects.filter(post_id="abc").update(post_type=post_type)
    article = None
    mock_client.submission.return_value.is_self = False
    if post_type == EXTENDED_POST_TYPE_ARTICLE:
        article = ArticleFactory.create(
            post=Post.objects.get(post_id=mock_client.submission.return_value.id)
        )
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.update_post("abc", **kwargs)
    assert mock_client.submission.return_value.edit.call_count == 0
    if "article_content" in kwargs and article is not None:
        article.refresh_from_db()
        assert article.content != kwargs["article_content"]


def test_approve_post(mock_client, indexing_decorator):
    """Test approve_post passes"""
    mock_client.submission.return_value.selftext = "text"
    client = api.Api(UserFactory.create())
    client.approve_post("abc")
    mock_client.submission.assert_called_once_with(id="abc")
    mock_client.submission.return_value.mod.approve.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.update_post_removal_status
        in indexing_decorator.mock_persist_func.original
    )


def test_remove_post(mock_client, indexing_decorator):
    """Test remove_post passes"""
    mock_client.submission.return_value.selftext = "text"
    client = api.Api(UserFactory.create())
    client.remove_post("abc")
    mock_client.submission.assert_called_once_with(id="abc")
    mock_client.submission.return_value.mod.remove.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.update_post_removal_status
        in indexing_decorator.mock_persist_func.original
    )


def test_create_comment_on_post(mock_client, indexing_decorator):
    """Makes correct calls for comment on post"""
    Comment.objects.filter(
        comment_id=mock_client.submission.return_value.reply.return_value.id
    ).delete()  # don't want this for this test
    client = api.Api(UserFactory.create())
    post = Post.objects.get(post_id="abc")
    comment = client.create_comment("text", post_id="abc")
    assert comment == mock_client.submission.return_value.reply.return_value
    assert mock_client.comment.call_count == 0
    mock_client.submission.assert_called_once_with(id="abc")
    mock_client.submission.return_value.reply.assert_called_once_with("text")
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.index_new_comment
        in indexing_decorator.mock_persist_func.original
    )
    assert Comment.objects.filter(
        comment_id=mock_client.submission.return_value.reply.return_value.id,
        parent_id=mock_client.submission.return_value.id,
    ).exists()
    assert post.num_comments + 1 == Post.objects.get(post_id="abc").num_comments


def test_create_comment_on_comment(mock_client, indexing_decorator):
    """Makes correct calls for comment on comment"""
    Comment.objects.filter(
        comment_id=mock_client.comment.return_value.reply.return_value.id
    ).delete()  # don't want this for this test
    client = api.Api(UserFactory.create())
    post = Post.objects.get(post_id="abc")
    comment = client.create_comment("text", comment_id="567")
    assert comment == mock_client.comment.return_value.reply.return_value
    assert mock_client.submission.call_count == 0
    mock_client.comment.assert_called_once_with("567")
    mock_client.comment.return_value.reply.assert_called_once_with("text")
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.index_new_comment
        in indexing_decorator.mock_persist_func.original
    )
    assert Comment.objects.filter(
        comment_id=mock_client.comment.return_value.reply.return_value.id,
        parent_id=mock_client.comment.return_value.id,
    ).exists()
    assert post.num_comments + 1 == Post.objects.get(post_id="123").num_comments


def test_create_comment_args_error(mock_client):
    """Errors if both args provided"""
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.create_comment("text", post_id="id1", comment_id="id2")
    with pytest.raises(ValueError):
        client.create_comment("text")
    assert mock_client.submission.call_count == 0
    assert mock_client.comment.call_count == 0


def test_list_comments(mock_client):
    """Test list_comments"""
    client = api.Api(UserFactory.create())
    result = client.list_comments("abc", COMMENTS_SORT_BEST)
    mock_client.submission.assert_called_once_with(id="abc")
    assert mock_client.submission.return_value.comment_sort == COMMENTS_SORT_BEST
    assert result == mock_client.submission.return_value.comments


def test_list_comments_invalid_sort(mock_client):
    """Test list_comments with invalid sort raises error"""
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.list_comments("id", "invalid")
    assert mock_client.submission.call_count == 0


def test_get_comment(mock_client):
    """Test get_comment"""
    client = api.Api(UserFactory.create())
    comment = client.get_comment("id")
    assert comment == mock_client.comment.return_value
    mock_client.comment.assert_called_once_with("id")


def test_delete_comment(mock_client, indexing_decorator):
    """Test delete_comment"""
    client = api.Api(UserFactory.create())
    client.delete_comment("id")
    mock_client.comment.assert_called_once_with("id")
    mock_client.comment.return_value.delete.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.set_comment_to_deleted
        in indexing_decorator.mock_persist_func.original
    )


def test_update_comment(mock_client, indexing_decorator):
    """Test update_post passes"""
    client = api.Api(UserFactory.create())
    comment = client.update_comment("id", "Text")
    assert comment == mock_client.comment.return_value.edit.return_value
    mock_client.comment.assert_called_once_with("id")
    mock_client.comment.return_value.edit.assert_called_once_with("Text")
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.update_comment_text
        in indexing_decorator.mock_persist_func.original
    )


def test_approve_comment(mock_client, indexing_decorator):
    """Test approve_post passes"""
    mock_client.submission.return_value.selftext = "text"
    client = api.Api(UserFactory.create())
    client.approve_comment("id")
    mock_client.comment.assert_called_once_with("id")
    mock_client.comment.return_value.mod.approve.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.update_comment_removal_status
        in indexing_decorator.mock_persist_func.original
    )


def test_remove_comment(mock_client, indexing_decorator):
    """Test remove_comment passes"""
    mock_client.submission.return_value.selftext = "text"
    client = api.Api(UserFactory.create())
    client.remove_comment("id")
    mock_client.comment.assert_called_once_with("id")
    mock_client.comment.return_value.mod.remove.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_persist_func.call_count == 1
    assert (
        search_index_helpers.update_comment_removal_status
        in indexing_decorator.mock_persist_func.original
    )


def test_init_more_comments(mock_client, mocker):
    """Test init_more_comments"""
    client = api.Api(UserFactory.create())
    children = ["t1_itmt", "t1_it56t"]

    more_patch = mocker.patch("praw.models.reddit.more.MoreComments")
    result = client.init_more_comments(
        "parent_3i", "post_i2", children, COMMENTS_SORT_BEST
    )

    more_patch.assert_called_once_with(
        client.reddit,
        {"parent_id": "t1_parent_3i", "children": children, "count": len(children)},
    )
    assert result == more_patch.return_value
    mock_client.submission.assert_called_once_with("post_i2")
    assert result.submission == mock_client.submission.return_value
    assert result.submission.comment_sort == COMMENTS_SORT_BEST
    result.comments.assert_called_once_with()


def test_init_more_comments_no_parents(mock_client, mocker):
    """If no parent id is present the post id should be used"""
    client = api.Api(UserFactory.create())
    children = ["t1_itmt", "t1_it56t"]

    more_patch = mocker.patch("praw.models.reddit.more.MoreComments")
    result = client.init_more_comments(None, "post_i2", children, COMMENTS_SORT_BEST)

    more_patch.assert_called_once_with(
        client.reddit,
        {"parent_id": "t3_post_i2", "children": children, "count": len(children)},
    )
    assert result == more_patch.return_value
    mock_client.submission.assert_called_once_with("post_i2")
    assert result.submission == mock_client.submission.return_value
    result.comments.assert_called_once_with()


def test_init_more_comments_invalid_sort(
    mock_client, mocker
):  # pylint: disable=unused-argument
    """If no parent id is present the post id should be used"""
    client = api.Api(UserFactory.create())
    children = ["t1_itmt", "t1_it56t"]

    more_patch = mocker.patch("praw.models.reddit.more.MoreComments")
    with pytest.raises(ValueError):
        client.init_more_comments(None, "post_i2", children, "invalid_sort")

    assert more_patch.call_count == 0


def test_more_comments(mock_client, mocker):  # pylint: disable=unused-argument
    """Test more_comments without any extra comments"""
    client = api.Api(UserFactory.create())
    children = ["t1_itmt", "t1_it56t"]

    init_more_mock = mocker.patch("channels.api.Api.init_more_comments")
    post_id = "post_i2"
    mocker.patch.object(RedditComment, "replies", [])

    def _make_comment(comment_id):
        """Helper to make a comment with a valid list of replies"""
        return RedditComment(client.reddit, id=comment_id)

    comments = [_make_comment(comment_id) for comment_id in children]
    init_more_mock.return_value.comments.return_value = CommentForest(
        post_id, comments=comments
    )

    result = client.more_comments("parent_3i", post_id, children, COMMENTS_SORT_BEST)
    init_more_mock.assert_called_once_with(
        parent_id="parent_3i",
        post_id="post_i2",
        children=children,
        sort=COMMENTS_SORT_BEST,
    )
    assert result == comments


def test_more_comments_with_more_comments(
    mock_client, mocker
):  # pylint: disable=unused-argument
    """Test more_comments with an extra MoreComments"""
    client = api.Api(UserFactory.create())
    children = ["1", "2", "3"]
    extra_children = ["4", "5", "6"]

    init_more_mock = mocker.patch("channels.api.Api.init_more_comments")
    post_id = "post_i2"
    mocker.patch.object(RedditComment, "replies", [])

    def _make_comment(comment_id):
        """Helper to make a comment with a valid list of replies"""
        return RedditComment(client.reddit, id=comment_id)

    first_comments = [_make_comment(child) for child in children]
    side_effects = [
        Mock(
            comments=Mock(return_value=CommentForest(post_id, comments=first_comments))
        ),
        Mock(),  # only used for identity comparison
    ]
    init_more_mock.side_effect = side_effects

    result = client.more_comments(
        "parent_3i", post_id, children + extra_children, COMMENTS_SORT_BEST
    )
    assert init_more_mock.call_count == 2
    init_more_mock.assert_any_call(
        parent_id="parent_3i",
        post_id="post_i2",
        children=children + extra_children,
        sort=COMMENTS_SORT_BEST,
    )
    init_more_mock.assert_any_call(
        parent_id="parent_3i",
        post_id="post_i2",
        children=extra_children,
        sort=COMMENTS_SORT_BEST,
    )

    assert result[:-1] == first_comments
    more_comments = result[-1]
    assert side_effects[1] == more_comments


def test_list_user_contributions(
    mocker, mock_client, listing_params, user
):  # pylint: disable=unused-argument
    """Test list_user_posts and list_user_comments"""
    mock_redditor = Mock()
    mocker.patch("channels.api.Redditor", autospec=True, return_value=mock_redditor)
    client = api.Api(user)
    client.list_user_posts(user.username, listing_params)
    assert mock_redditor.submissions.hot.call_count == 1
    client.list_user_comments(user.username, listing_params)
    assert mock_redditor.comments.hot.call_count == 1


def test_frontpage(mock_client):
    """Test front page"""
    client = api.Api(UserFactory.create())
    posts = client.front_page(DEFAULT_LISTING_PARAMS)
    assert posts == mock_client.front.hot.return_value
    mock_client.front.hot.assert_called_once_with(limit=25, params={"count": 0})


def test_add_contributor(mock_client, mock_upsert_profile):
    """Test add contributor"""
    client_user = UserFactory.create()
    contributor = UserFactory.create()
    client = api.Api(client_user)
    redditor = client.add_contributor(contributor.username, "channel")
    mock_client.subreddit.return_value.contributor.add.assert_called_once_with(
        contributor
    )
    assert (
        ChannelGroupRole.objects.get(
            channel__name="channel", role=ROLE_CONTRIBUTORS
        ).group
        in contributor.groups.all()
    )
    mock_upsert_profile.assert_called_with(contributor.profile.id)
    assert isinstance(redditor, Redditor)
    assert redditor.name == contributor.username


def test_add_remove_contributor_no_user(mock_client):
    """Test add and remove contributor in case the user does not exist"""
    client_user = UserFactory.create()
    client = api.Api(client_user)
    with pytest.raises(NotFound):
        client.add_contributor("fooooooo", "channel")
    assert mock_client.subreddit.return_value.contributor.add.call_count == 0

    with pytest.raises(NotFound):
        client.remove_contributor("fooooooo", "channel")
    assert mock_client.subreddit.return_value.contributor.remove.call_count == 0


def test_remove_contributor(mock_client, mock_upsert_profile):
    """Test remove contributor"""
    client_user = UserFactory.create()
    contributor = UserFactory.create()
    client = api.Api(client_user)
    client.remove_contributor(contributor.username, "channel")
    mock_client.subreddit.return_value.contributor.remove.assert_called_once_with(
        contributor
    )
    assert (
        ChannelGroupRole.objects.get(
            channel__name="channel", role=ROLE_CONTRIBUTORS
        ).group
        not in contributor.groups.all()
    )
    mock_upsert_profile.assert_called_with(contributor.profile.id)


def test_list_contributors(mock_client):
    """Test list contributor"""
    client_user = UserFactory.create()
    client = api.Api(client_user)
    contributors = client.list_contributors("channel")
    mock_client.subreddit.return_value.contributor.assert_called_once_with()
    assert mock_client.subreddit.return_value.contributor.return_value == contributors


def test_add_moderator(mock_client, mock_upsert_profile):
    """Test add moderator"""
    client = api.Api(UserFactory.create())
    moderator = UserFactory.create()
    # pylint: disable=assignment-from-no-return
    redditor = client.add_moderator(moderator.username, "channel")
    mock_client.subreddit.return_value.moderator.add.assert_called_once_with(moderator)
    # API function doesn't return the moderator. To do this the view calls _list_moderators
    assert redditor is None
    assert (
        ChannelGroupRole.objects.get(
            channel__name="channel", role=ROLE_MODERATORS
        ).group
        in moderator.groups.all()
    )
    mock_upsert_profile.assert_called_with(moderator.profile.id)


def test_add_moderator_no_user(mock_client):
    """Test add moderator where user does not exist"""
    client = api.Api(UserFactory.create())
    with pytest.raises(NotFound):
        client.add_moderator("foo_username", "channel")
    assert mock_client.subreddit.return_value.moderator.add.call_count == 0

    with pytest.raises(NotFound):
        client.remove_moderator("foo_username", "channel")
    assert mock_client.subreddit.return_value.moderator.remove.call_count == 0


def test_remove_moderator(mock_client, mock_upsert_profile):
    """Test remove moderator"""
    client = api.Api(UserFactory.create())
    moderator = UserFactory.create()
    channel = Channel.objects.get(name="channel")
    client.remove_moderator(moderator.username, "channel")
    mock_client.subreddit.return_value.moderator.remove.assert_called_once_with(
        moderator
    )
    assert (
        ChannelGroupRole.objects.get(
            channel__name="channel", role=ROLE_MODERATORS
        ).group
        not in moderator.groups.all()
    )
    mock_upsert_profile.assert_called_with(moderator.profile.id)


def test_list_moderator(mock_client):
    """Test list moderator"""
    client = api.Api(UserFactory.create())
    moderators = client.list_moderators("channel")
    mock_client.subreddit.return_value.moderator.assert_called_once_with(redditor=None)
    assert mock_client.subreddit.return_value.moderator.return_value == moderators


@pytest.mark.parametrize("is_moderator", [True, False])
def test_is_moderator(mock_client, is_moderator):
    """is_moderator should pass a username to reddit to filter on"""
    client = api.Api(UserFactory.create())
    # the actual return value here will be different against a reddit backend
    # but truthiness of the return iterable is all that matters
    mock_client.subreddit.return_value.moderator.return_value = (
        ["username"] if is_moderator else []
    )
    assert client.is_moderator("channel", "username") is is_moderator
    mock_client.subreddit.return_value.moderator.assert_called_once_with(
        redditor="username"
    )


def test_is_moderator_forbidden(mock_client):
    """is_moderator should return False if the user is not allowed to make the API call"""
    client = api.Api(UserFactory.create())
    # the actual return value here will be different against a reddit backend
    # but truthiness of the return iterable is all that matters
    mock_client.subreddit.return_value.moderator.side_effect = Forbidden(
        Mock(status_code=403)
    )
    assert client.is_moderator("channel", "username") is False
    mock_client.subreddit.return_value.moderator.assert_called_once_with(
        redditor="username"
    )


def test_is_moderator_missing_username(mock_client):  # pylint: disable=unused-argument
    """is_moderator should raise an exception if the username is missing"""
    client = api.Api(UserFactory.create())
    # the actual return value here will be different against a reddit backend
    # but truthiness of the return iterable is all that matters
    with pytest.raises(ValueError) as ex:
        client.is_moderator("channel", "")
    assert ex.value.args[0] == "Missing moderator_name"


@pytest.mark.parametrize("verify_ssl", [True, False])
def test_api_constructor(mocker, settings, verify_ssl):
    """
    Api() should have a client which uses certain settings to configure its request session
    """
    client_user = UserFactory.create()
    session_stub = mocker.patch("channels.api.requests.Session", autospec=True)
    refresh_token = "token"
    session_stub.return_value.get.return_value.json.return_value = {
        "refresh_token": refresh_token,
        "access_token": "access_token",
        "expires_in": 123,
    }
    session_stub.return_value.headers = {}

    settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID = "client_id"
    settings.OPEN_DISCUSSIONS_REDDIT_SECRET = "secret"
    settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL = verify_ssl
    settings.OPEN_DISCUSSIONS_REDDIT_URL = "http://fake_url"
    settings.VERSION = "1.2.3"

    client = api.Api(client_user)
    config = client.reddit.config
    assert config.short_url == settings.OPEN_DISCUSSIONS_REDDIT_URL
    assert config.reddit_url == settings.OPEN_DISCUSSIONS_REDDIT_URL
    assert config.oauth_url == settings.OPEN_DISCUSSIONS_REDDIT_URL
    assert config.user_agent == "MIT-Open: {}".format(settings.VERSION)
    assert config.client_id == settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID
    assert config.client_secret == settings.OPEN_DISCUSSIONS_REDDIT_SECRET
    assert config.refresh_token == refresh_token


def test_api_constructor_error(mocker):
    """
    If a non-401 response is received during Api() initialization, we should not delete the refresh
    and access tokens.
    """
    client_user = UserFactory.create()

    error = ResponseException(response=Mock(status_code=400))
    mocker.patch("channels.api._get_client", autospec=True, side_effect=error)

    RedditAccessToken.objects.create(user=client_user, token_value="token")
    RedditRefreshToken.objects.create(user=client_user, token_value="token")

    with pytest.raises(ResponseException):
        api.Api(client_user)

    # No attempt to clear tokens was made
    assert RedditAccessToken.objects.count() == 1
    assert RedditRefreshToken.objects.count() == 1


def test_api_constructor_anonymous_error(mocker):
    """
    If a 401 error is raised and the user is anonymous we should just raise the exception instead of trying again
    """
    error = ResponseException(response=Mock(status_code=401))
    get_client_mock = mocker.patch(
        "channels.api._get_client", autospec=True, side_effect=error
    )

    with pytest.raises(ResponseException):
        api.Api(None)

    assert get_client_mock.call_count == 1


def test_api_constructor_401_once(mocker):
    """
    If a 401 response is received during Api() initialization, we should delete the refresh
    and access tokens and try once more. The second time should succeed
    """
    client_user = UserFactory.create()

    mocked_client = Mock()
    effect = [ResponseException(response=Mock(status_code=401)), mocked_client]
    mocker.patch("channels.api._get_client", autospec=True, side_effect=effect)

    RedditAccessToken.objects.create(user=client_user, token_value="token")
    RedditRefreshToken.objects.create(user=client_user, token_value="token")

    assert api.Api(client_user).reddit == mocked_client

    assert RedditAccessToken.objects.count() == 0
    assert RedditRefreshToken.objects.count() == 0


def test_api_constructor_401_twice(mocker):
    """
    If a 401 response is received during Api() initialization, we should delete the refresh
    and access tokens and try once more. The second time should raise the error
    """
    client_user = UserFactory.create()

    effect = [
        ResponseException(response=Mock(status_code=401)),
        ResponseException(response=Mock(status_code=401)),
    ]
    mocker.patch("channels.api._get_client", autospec=True, side_effect=effect)

    RedditAccessToken.objects.create(user=client_user, token_value="token")
    RedditRefreshToken.objects.create(user=client_user, token_value="token")

    with pytest.raises(ResponseException):
        api.Api(client_user)

    assert RedditAccessToken.objects.count() == 0
    assert RedditRefreshToken.objects.count() == 0


@pytest.mark.parametrize("is_none", [True, False])
def test_api_constructor_none(is_none):
    """Api(None) should initialize for an anonymous user"""
    client = api.Api(None if is_none else AnonymousUser())
    assert bool(client.user.is_anonymous) is True


def test_get_or_create_auth_tokens(mocker, settings, user):
    """
    get_or_create_auth_tokens will contact our plugin's API to get a refresh token for a user, or to create one
    """
    settings.OPEN_DISCUSSIONS_REDDIT_URL = "http://fake"
    refresh_token_url = urljoin(
        settings.OPEN_DISCUSSIONS_REDDIT_URL, "/api/v1/generate_refresh_token"
    )
    get_session_stub = mocker.patch("channels.api._get_session", autospec=True)
    refresh_token_value = "refresh_token"
    access_token_value = "access_token"
    get_session_stub.return_value.get.return_value.json.return_value = {
        "refresh_token": refresh_token_value,
        "access_token": access_token_value,
        "expires_in": 123,
    }
    assert RedditAccessToken.objects.filter(user=user).count() == 0
    assert RedditRefreshToken.objects.filter(user=user).count() == 0
    refresh_token, access_token = api.get_or_create_auth_tokens(user)
    assert refresh_token.token_value == refresh_token_value
    assert access_token.token_value == access_token_value
    get_session_stub.return_value.get.assert_called_once_with(
        refresh_token_url, params={"username": user.username}
    )
    get_session_stub.return_value.get.return_value.json.assert_called_once_with()
    assert RedditAccessToken.objects.filter(user=user).count() == 1
    assert RedditRefreshToken.objects.filter(user=user).count() == 1


def test_add_subscriber(mock_client, mock_upsert_profile):
    """Test add subscriber"""
    client = api.Api(UserFactory.create())
    subscriber = UserFactory.create()
    redditor = client.add_subscriber(subscriber.username, "channel")
    mock_client.subreddit.return_value.subscribe.assert_called_once_with()
    assert redditor.name == subscriber.username
    assert ChannelSubscription.objects.filter(
        channel__name="channel", user=subscriber
    ).exists()
    mock_upsert_profile.assert_called_with(subscriber.profile.id)


def test_add_remove_subscriber_no_user(mock_client):
    """Test add and remove subscriber in case the user does not exist"""
    client_user = UserFactory.create()
    client = api.Api(client_user)
    with pytest.raises(NotFound):
        client.add_subscriber("fooooooo", "channel")
    assert mock_client.subreddit.return_value.subscribe.call_count == 0

    with pytest.raises(NotFound):
        client.remove_contributor("fooooooo", "channel")
    assert mock_client.subreddit.return_value.unsubscribe.call_count == 0


def test_remove_subscriber(mock_client, mock_upsert_profile):
    """Test remove subscriber"""
    client = api.Api(UserFactory.create(username="mitodl"))
    subscriber = UserFactory.create(username="01BTN7HY2SGT9677JXGNDDW859")
    client.remove_subscriber(subscriber.username, "testchannel5")
    mock_client.subreddit.return_value.unsubscribe.assert_called_once_with()
    assert not ChannelSubscription.objects.filter(
        channel__name="testchannel5", user=subscriber
    ).exists()
    mock_upsert_profile.assert_called_with(subscriber.profile.id)


def test_is_subscriber(mock_client):
    """Test is subscriber"""
    client = api.Api(UserFactory.create(username="mitodl"))
    subscriber = UserFactory.create()
    mock_client.user.subreddits.return_value = [
        _mock_channel(name="sub1"),
        _mock_channel(name="sub2"),
    ]
    assert client.is_subscriber(subscriber.username, "channel") is False
    assert client.is_subscriber(subscriber.username, "sub2") is True
    assert mock_client.user.subreddits.call_count == 2


def test_report_comment(mock_client):
    """Test report_comment"""
    client = api.Api(UserFactory.create())
    client.report_comment("id", "reason")
    mock_client.comment.assert_called_once_with("id")
    mock_client.comment.return_value.report.assert_called_once_with("reason")


def test_report_post(mock_client):
    """Test report_post"""
    client = api.Api(UserFactory.create())
    client.report_post("abc", "reason")
    mock_client.submission.assert_called_once_with(id="abc")
    mock_client.submission.return_value.report.assert_called_once_with("reason")


def test_list_reports(mock_client):
    """Test list_reports"""
    client = api.Api(UserFactory.create())
    assert (
        client.list_reports("channel")
        == mock_client.subreddit.return_value.mod.reports.return_value
    )
    mock_client.subreddit.assert_called_once_with("channel")
    mock_client.subreddit.return_value.mod.reports.assert_called_once_with()


def test_ignore_comment_reports(mock_client):
    """Test ignore_comment_reports"""
    client = api.Api(UserFactory.create())
    client.ignore_comment_reports("456")
    mock_client.comment.assert_called_once_with("456")
    mock_client.comment.return_value.mod.ignore_reports.assert_called_once_with()


def test_ignore_post_reports(mock_client):
    """Test ignore_post_reports"""
    client = api.Api(UserFactory.create())
    client.ignore_post_reports("abc")
    mock_client.submission.assert_called_once_with(id="abc")
    mock_client.submission.return_value.mod.ignore_reports.assert_called_once_with()


def test_add_post_subscription(mock_client, user):  # pylint: disable=unused-argument
    """Test add_post_subscription"""
    client = api.Api(user)
    assert not Subscription.objects.filter(user=user, post_id="abc").exists()
    client.add_post_subscription("abc")
    assert Subscription.objects.filter(user=user, post_id="abc").exists()


def test_remove_post_subscription(mock_client, user):  # pylint: disable=unused-argument
    """Test remove_post_subscription"""
    client = api.Api(user)
    client.add_post_subscription("abc")
    assert Subscription.objects.filter(user=user, post_id="abc").exists()
    client.remove_post_subscription("abc")
    assert not Subscription.objects.filter(user=user, post_id="abc").exists()


def test_add_comment_subscription(mock_client, user):  # pylint: disable=unused-argument
    """Test add_comment_subscription"""
    client = api.Api(user)
    assert not Subscription.objects.filter(
        user=user, post_id="abc", comment_id="def"
    ).exists()
    client.add_comment_subscription("abc", "def")
    assert Subscription.objects.filter(
        user=user, post_id="abc", comment_id="def"
    ).exists()


def test_remove_comment_subscription(
    mock_client, user
):  # pylint: disable=unused-argument
    """Test remove_comment_subscription"""
    client = api.Api(user)
    client.add_comment_subscription("abc", "def")
    assert Subscription.objects.filter(
        user=user, post_id="abc", comment_id="def"
    ).exists()
    client.remove_comment_subscription("abc", "def")
    assert not Subscription.objects.filter(
        user=user, post_id="abc", comment_id="def"
    ).exists()


@pytest.mark.parametrize(
    "link_type, expected",
    [
        [None, [LINK_TYPE_LINK, LINK_TYPE_SELF]],
        [LINK_TYPE_ANY, [LINK_TYPE_LINK, LINK_TYPE_SELF]],
        [LINK_TYPE_LINK, [LINK_TYPE_LINK]],
        [LINK_TYPE_SELF, [LINK_TYPE_SELF]],
    ],
)
def test_get_allowed_post_types_from_link_type(link_type, expected):
    """Tests that allowed_post_types is correctly determined from link_type"""
    assert api.get_allowed_post_types_from_link_type(link_type) == expected
