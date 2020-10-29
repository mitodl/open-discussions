"""Tests for task helpers"""
import pytest

from channels import task_helpers
from open_discussions.features import HOT_POST_REPAIR
from open_discussions.constants import CELERY_HIGH_PRIORITY


@pytest.mark.parametrize("delay", [200, 100])
def test_maybe_repair_post_in_host_listing(mocker, settings, delay):
    """Test that maybe_repair_post_in_host_listing triggers the task correctly"""
    post = mocker.Mock()
    self_post = post._self_post  # pylint: disable=protected-access
    patched_maybe_repair_post_in_host_listing = mocker.patch(
        "channels.tasks.maybe_repair_post_in_host_listing"
    )

    settings.OPEN_DISCUSSIONS_HOT_POST_REPAIR_DELAY = delay
    settings.FEATURES[HOT_POST_REPAIR] = True

    task_helpers.maybe_repair_post_in_host_listing(post)

    patched_maybe_repair_post_in_host_listing.apply_async.assert_called_once_with(
        args=[self_post.channel.name, self_post.post_id], countdown=delay
    )


@pytest.mark.parametrize("is_exempt", [True, False])
def test_check_post_for_spam(mocker, rf, is_exempt, user):
    """Test that check_post_for_spam calls the task"""
    mock_exempt_check = mocker.patch(
        "channels.task_helpers.exempt_from_spamcheck", return_value=is_exempt
    )
    mock_extract_spam_check_headers = mocker.patch(
        "channels.task_helpers.extract_spam_check_headers"
    )
    mock_headers = mock_extract_spam_check_headers.return_value
    mock_task = mocker.patch("channels.tasks.check_post_for_spam")
    mock_request = rf.post("/api")
    mock_request.user = user

    task_helpers.check_post_for_spam(mock_request, "post-id")

    mock_exempt_check.assert_called_once_with(user.email)

    if not is_exempt:
        mock_extract_spam_check_headers.assert_called_once_with(mock_request)
        mock_task.apply_async.assert_called_once_with(
            kwargs=dict(
                user_agent=mock_headers.user_agent,
                user_ip=mock_headers.user_ip,
                post_id="post-id",
            ),
            countdown=15,
            priority=CELERY_HIGH_PRIORITY,
        )
    else:
        mock_extract_spam_check_headers.assert_not_called()
        mock_task.apply_async.assert_not_called()


@pytest.mark.parametrize("is_exempt", [True, False])
def test_check_comment_for_spam(mocker, rf, user, is_exempt):
    """Test that check_comment_for_spam calls the task"""
    mock_exempt_check = mocker.patch(
        "channels.task_helpers.exempt_from_spamcheck", return_value=is_exempt
    )
    mock_extract_spam_check_headers = mocker.patch(
        "channels.task_helpers.extract_spam_check_headers"
    )
    mock_headers = mock_extract_spam_check_headers.return_value
    mock_task = mocker.patch("channels.tasks.check_comment_for_spam")
    mock_request = rf.post("/api")
    mock_request.user = user

    task_helpers.check_comment_for_spam(mock_request, "comment-id")

    mock_exempt_check.assert_called_once_with(user.email)

    if not is_exempt:
        mock_extract_spam_check_headers.assert_called_once_with(mock_request)
        mock_task.apply_async.assert_called_once_with(
            kwargs=dict(
                user_agent=mock_headers.user_agent,
                user_ip=mock_headers.user_ip,
                comment_id="comment-id",
            ),
            countdown=15,
            priority=CELERY_HIGH_PRIORITY,
        )
    else:
        mock_extract_spam_check_headers.assert_not_called()
        mock_task.apply_async.assert_not_called()
