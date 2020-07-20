"""Spam verification tests"""
from types import SimpleNamespace

from akismet import AkismetError
import pytest

from channels.factories.models import PostFactory, CommentFactory
from channels.spam import SpamChecker, extract_spam_check_headers

# pylint: disable=redefined-outer-name


@pytest.fixture(autouse=True)
def default_settings(settings):
    """Default settings for tests"""
    settings.AKISMET_API_KEY = "test-key"
    settings.AKISMET_BLOG_URL = "http://mit.edu"
    # just in case we somehow execute it if a test fails
    settings.AKISMET_IS_TESTING = True


@pytest.fixture()
def user_request_args():
    """User request args extracted from headers"""
    return SimpleNamespace(user_agent="UserAgent", user_ip="127.0.0.1")


@pytest.fixture()
def mock_akismet(mocker):  # pylint: disable=unused-argument
    """Fixture for a valid request and checker"""
    return mocker.patch("channels.spam.akismet.Akismet", autospec=True)


@pytest.fixture
def post_checker(
    user, user_request_args, mock_akismet
):  # pylint: disable=unused-argument
    """Fixture for post check"""
    post = PostFactory.create(author=user)

    def _check(**kwargs):
        resolved_kwargs = {**vars(user_request_args), "post": post, **kwargs}

        checker = SpamChecker()

        return checker.is_post_spam(**resolved_kwargs)

    return SimpleNamespace(post=post, check=_check)


@pytest.fixture
def comment_checker(
    user, user_request_args, mock_akismet
):  # pylint: disable=unused-argument
    """Fixture for post check"""
    comment = CommentFactory.create(author=user)

    def _check(**kwargs):
        resolved_kwargs = {**vars(user_request_args), "comment": comment, **kwargs}

        checker = SpamChecker()

        return checker.is_comment_spam(**resolved_kwargs)

    return SimpleNamespace(comment=comment, check=_check)


@pytest.mark.parametrize(
    "headers, expected",
    [
        [
            dict(HTTP_X_FORWARDED_FOR="127.0.0.7"),
            SimpleNamespace(user_agent="", user_ip="127.0.0.7"),
        ],
        [
            dict(HTTP_USER_AGENT="user-agent", HTTP_X_FORWARDED_FOR="127.0.0.7"),
            SimpleNamespace(user_agent="user-agent", user_ip="127.0.0.7"),
        ],
    ],
)
def test_extract_spam_check_headers(rf, headers, expected):
    """Test that extract_spam_check_headers extracts user agent and ip from request headers"""
    request = rf.post("/api", **headers)

    assert extract_spam_check_headers(request) == expected


@pytest.mark.parametrize(
    "checker",
    [pytest.lazy_fixture("post_checker"), pytest.lazy_fixture("comment_checker")],
)
def test_not_configured(settings, mock_akismet, checker):
    """Verify that Akismet doesn't mark anything as spam if it's not configured"""
    settings.AKISMET_API_KEY = None
    settings.AKISMET_BLOG_URL = None

    assert checker.check() is False

    mock_akismet.return_value.comment_check.assert_not_called()


@pytest.mark.parametrize("side_effect", [AkismetError(), Exception()])
@pytest.mark.parametrize(
    "checker",
    [pytest.lazy_fixture("post_checker"), pytest.lazy_fixture("comment_checker")],
)
def test_client_init_exception(mocker, mock_akismet, side_effect, checker):
    """Validation should pass if we can't initialize"""
    mock_log = mocker.patch("channels.spam.log")

    mock_akismet.side_effect = side_effect

    assert checker.check() is False

    mock_log.exception.assert_called_once()
    mock_akismet.return_value.comment_check.assert_not_called()


@pytest.mark.parametrize(
    "checker",
    [pytest.lazy_fixture("post_checker"), pytest.lazy_fixture("comment_checker")],
)
def test_check_raises_exception(mocker, mock_akismet, checker):
    """Verify that if the request to check fails, we log a message but allow it through"""
    mock_log = mocker.patch("channels.spam.log")
    mock_akismet.return_value.comment_check.side_effect = Exception()

    assert checker.check() is False

    mock_log.exception.assert_called_once_with("Error trying to spam check w/ Akismet")


@pytest.mark.parametrize(
    "checker",
    [pytest.lazy_fixture("post_checker"), pytest.lazy_fixture("comment_checker")],
)
@pytest.mark.parametrize(
    "extra_kwargs",
    [
        pytest.param(dict(user_agent="", user_ip=""), id="no_headers"),
        pytest.param(dict(user_ip=""), id="no_ip"),
        pytest.param(dict(user_agent=""), id="no_useragent"),
    ],
)
def test_invalid_headers(mocker, mock_akismet, checker, extra_kwargs):
    """Verify that is_comment_spam returns false for requests with no IP or UA"""
    mock_log = mocker.patch("channels.spam.log")

    assert checker.check(**extra_kwargs) is True

    mock_log.info.assert_called_once_with(
        "Couldn't determine user agent or ip, assuming to be spam"
    )
    mock_akismet.return_value.comment_check.assert_not_called()


def test_is_comment_spam(mock_akismet, comment_checker, user_request_args, user):
    """Verify is_comment_spam calls the Akismet API correctly"""
    assert (
        comment_checker.check() == mock_akismet.return_value.comment_check.return_value
    )

    mock_akismet.return_value.comment_check.assert_called_once_with(
        user_agent=user_request_args.user_agent,
        user_ip=user_request_args.user_ip,
        comment_content=comment_checker.comment.text,
        comment_type="reply",
        comment_author=user.profile.name,
        comment_author_email=user.email,
        is_test=True,
    )


def test_is_text_post_spam(mock_akismet, post_checker, user_request_args, user):
    """Verify is_post_spam calls the Akismet API correctly for a post"""
    assert post_checker.check() == mock_akismet.return_value.comment_check.return_value

    mock_akismet.return_value.comment_check.assert_called_once_with(
        user_agent=user_request_args.user_agent,
        user_ip=user_request_args.user_ip,
        comment_content=post_checker.post.plain_text,
        comment_type="forum-post",
        comment_author=user.profile.name,
        comment_author_email=user.email,
        is_test=True,
    )
