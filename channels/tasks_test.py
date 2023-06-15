"""Tasks tests"""
from urllib.parse import urljoin

import base36
import pytest
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.shortcuts import reverse
from praw.models import Redditor
from prawcore.exceptions import ResponseException

from channels import tasks
from channels import api
from channels.constants import (
    CHANNEL_TYPE_PUBLIC,
    ROLE_MODERATORS,
    ROLE_CONTRIBUTORS,
    LINK_TYPE_ANY,
    COMMENT_TYPE,
    POST_TYPE,
)
from channels.factories.models import (
    ChannelFactory,
    PostFactory,
    CommentFactory,
    ChannelInvitationFactory,
    SpamCheckResultFactory,
)
from channels.models import ChannelSubscription, Channel, Post, Comment, SpamCheckResult
from open_discussions.factories import UserFactory
from search.exceptions import PopulateUserRolesException
from authentication.models import BlockedEmailRegex

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("indexing_user")]

# pylint:disable=redefined-outer-name

User = get_user_model()


@pytest.fixture
def channels_and_users():
    """Channels and users for testing"""
    return (
        [ChannelFactory.create(name=channel_name) for channel_name in ["a", "b", "c"]],
        UserFactory.create_batch(4),
    )


def test_evict_expired_access_tokens():
    """Test that the task evicts expired tokens"""
    from channels.factories.models import RedditAccessTokenFactory
    from channels.models import RedditAccessToken

    future = RedditAccessTokenFactory.create()
    expired = RedditAccessTokenFactory.create(expired=True)

    tasks.evict_expired_access_tokens.delay()

    assert RedditAccessToken.objects.count() == 1
    assert RedditAccessToken.objects.filter(id=future.id).exists()
    assert not RedditAccessToken.objects.filter(id=expired.id).exists()


def test_subscribe_all_users_to_channels(settings, mocker, mocked_celery):
    """Test that the main task batches out smaller tasks correctly"""
    settings.OPEN_DISCUSSIONS_DEFAULT_CHANNEL_BACKPOPULATE_BATCH_SIZE = 2
    users = sorted(UserFactory.create_batch(4), key=lambda user: user.username)
    channel_names = ["nochannel_1", "nochannel_2"]

    mock_subscribe_user_range_to_channels = mocker.patch(
        "channels.tasks.subscribe_user_range_to_channels"
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        tasks.subscribe_all_users_to_channels.delay(channel_names=channel_names)

    assert mocked_celery.group.call_count == 1
    list(mocked_celery.group.call_args[0][0])

    mock_subscribe_user_range_to_channels.si.assert_any_call(
        usernames=[users[0].username, users[1].username], channel_names=channel_names
    )
    mock_subscribe_user_range_to_channels.si.assert_any_call(
        usernames=[users[2].username, users[3].username], channel_names=channel_names
    )


def test_subscribe_user_range_to_channels(mocker):
    """Test that the main task batches out smaller tasks correctly"""
    mock_add_subscriber = mocker.patch("channels.api.Api.add_subscriber")
    mocker.patch("channels.api._get_client", autospec=True)
    usernames = [user.username for user in UserFactory.create_batch(5)]
    channel_names = ["nochannel_1", "nochannel_2"]

    tasks.subscribe_user_range_to_channels.delay(
        usernames=usernames, channel_names=channel_names
    )

    assert mock_add_subscriber.call_count == (len(usernames) * len(channel_names))

    for username in usernames:
        for channel_name in channel_names:
            mock_add_subscriber.assert_any_call(username, channel_name)


def test_populate_subscriptions_and_roles(
    mocker, mocked_celery, settings, channels_and_users
):
    """
    populate_subscriptions_and_roles should call sub-tasks with correct ids
    """
    channels, users = channels_and_users
    users = sorted(users, key=lambda user: user.id)
    channels = sorted(channels, key=lambda channel: channel.id)
    settings.OPENSEARCH_INDEXING_CHUNK_SIZE = 2
    mock_populate_user_subscriptions = mocker.patch(
        "channels.tasks.populate_user_subscriptions"
    )
    mock_populate_user_roles = mocker.patch("channels.tasks.populate_user_roles")

    with pytest.raises(mocked_celery.replace_exception_class):
        tasks.populate_subscriptions_and_roles.delay()

    assert mocked_celery.group.call_count == 1
    list(mocked_celery.group.call_args[0][0])
    mock_populate_user_subscriptions.si.assert_any_call([users[0].id, users[1].id])
    mock_populate_user_subscriptions.si.assert_any_call([users[2].id, users[3].id])
    mock_populate_user_roles.si.assert_any_call([channels[0].id, channels[1].id])
    mock_populate_user_roles.si.assert_any_call([channels[2].id])
    assert mocked_celery.replace.call_count == 1


@pytest.mark.parametrize("is_subscriber", [True, False])
def test_populate_user_subscriptions(mocker, is_subscriber, channels_and_users):
    """populate_user_subscriptions should create ChannelSubscription objects"""
    channels, users = channels_and_users
    client_mock = mocker.patch("channels.tasks.Api", autospec=True)
    client_mock.return_value.list_channels.return_value = [
        mocker.Mock(display_name=channel.name) for channel in channels if is_subscriber
    ]
    tasks.populate_user_subscriptions.delay([user.id for user in users])
    for user in users:
        for channel in channels:
            assert (
                ChannelSubscription.objects.filter(user=user, channel=channel).exists()
                is is_subscriber
            )


@pytest.mark.parametrize("is_moderator", [True, False])
@pytest.mark.parametrize("is_contributor", [True, False])
def test_populate_user_roles(mocker, is_contributor, is_moderator, channels_and_users):
    """populate_user_roles should create ChannelGroupRole objects"""
    channels, users = channels_and_users
    client_mock = mocker.patch("channels.api.Api", autospec=True)
    redditors = []
    for user in users:
        redditor = mocker.Mock(spec=Redditor)
        redditor.name = user.username
        redditors.append(redditor)

    client_mock.return_value.list_moderators.return_value = [
        redditor for redditor in redditors if is_moderator
    ]
    client_mock.return_value.list_contributors.return_value = [
        redditor for redditor in redditors if is_contributor
    ]
    tasks.populate_user_roles.delay([channel.id for channel in channels])
    for user in users:
        for channel in channels:
            assert (
                api.get_role_model(channel, ROLE_MODERATORS).group in user.groups.all()
            ) is is_moderator
            assert (
                api.get_role_model(channel, ROLE_CONTRIBUTORS).group
                in user.groups.all()
            ) is is_contributor


@pytest.mark.parametrize("is_error_moderator", [True, False])
def test_populate_user_roles_error(mocker, is_error_moderator, channels_and_users):
    """populate_user_roles should raise a PopulateUserRolesException if there is a ResponseException error"""
    channels, users = channels_and_users
    client_mock = mocker.patch("channels.api.Api", autospec=True)
    redditors = []
    for user in users:
        redditor = mocker.Mock(spec=Redditor)
        redditor.name = user.username
        redditors.append(redditor)

    client_mock.return_value.list_moderators.return_value = []
    client_mock.return_value.list_contributors.return_value = []

    if is_error_moderator:
        client_mock.return_value.list_moderators.side_effect = ResponseException(
            mocker.Mock()
        )
    else:
        client_mock.return_value.list_contributors.side_effect = ResponseException(
            mocker.Mock()
        )

    with pytest.raises(PopulateUserRolesException):
        tasks.populate_user_roles.delay([channel.id for channel in channels])


def test_populate_post_and_comment_fields(mocker, mocked_celery, settings):
    """
    populate_post_and_comment_fields should call sub-tasks with correct ids
    """
    posts = PostFactory.create_batch(4)
    settings.OPENSEARCH_INDEXING_CHUNK_SIZE = 2
    mock_populate_post_and_comment_fields_batch = mocker.patch(
        "channels.tasks.populate_post_and_comment_fields_batch"
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        tasks.populate_post_and_comment_fields.delay()

    assert mocked_celery.group.call_count == 1
    list(mocked_celery.group.call_args[0][0])
    mock_populate_post_and_comment_fields_batch.si.assert_any_call(
        [posts[0].id, posts[1].id]
    )
    mock_populate_post_and_comment_fields_batch.si.assert_any_call(
        [posts[2].id, posts[3].id]
    )
    assert mocked_celery.replace.call_count == 1


def test_populate_post_and_comment_fields_batch(mocker):
    """
    populate_post_and_comment_fields_batch should call backpopulate APIs for each post
    """
    posts = PostFactory.create_batch(10, unpopulated=True)
    mock_api = mocker.patch("channels.api.Api", autospec=True)
    mock_backpopulate_api = mocker.patch("channels.tasks.backpopulate_api")

    tasks.populate_post_and_comment_fields_batch.delay([post.id for post in posts])

    assert mock_api.return_value.get_submission.call_count == len(posts)
    assert mock_backpopulate_api.backpopulate_post.call_count == len(posts)
    assert mock_backpopulate_api.backpopulate_comments.call_count == len(posts)
    for post in posts:
        mock_api.return_value.get_submission.assert_any_call(post.post_id)
        mock_backpopulate_api.backpopulate_post.assert_any_call(
            post=post, submission=mock_api.return_value.get_submission.return_value
        )
        mock_backpopulate_api.backpopulate_comments.assert_any_call(
            post=post, submission=mock_api.return_value.get_submission.return_value
        )


def test_populate_channel_fields_batch(mocker):
    """
    populate_channel_fields should set fields from reddit
    """
    channels = ChannelFactory.create_batch(2)
    mock_api = mocker.patch("channels.api.Api", autospec=True)
    mock_subreddit = mock_api.return_value.get_subreddit.return_value
    mock_subreddit.submission_type = LINK_TYPE_ANY
    mock_subreddit.title = "A channel title"
    mock_subreddit.subreddit_type = CHANNEL_TYPE_PUBLIC

    updated_channel = channels[0]
    updated_channel.allowed_post_types = 0
    updated_channel.title = None
    updated_channel.channel_type = None
    updated_channel.save()

    tasks.populate_channel_fields_batch.delay([channel.id for channel in channels])

    updated_channel.refresh_from_db()

    mock_api.return_value.get_subreddit.assert_called_once_with(updated_channel.name)

    assert int(updated_channel.allowed_post_types) == int(
        Channel.allowed_post_types.self | Channel.allowed_post_types.link
    )
    assert updated_channel.channel_type == CHANNEL_TYPE_PUBLIC
    assert updated_channel.title == "A channel title"


def test_populate_posts_and_comments(mocker):
    """
    populate_posts_and_comments should call the backpopulate API for each post
    """

    post_ids = [1, 2, 3]

    ChannelFactory.create(name="exists")

    submission_mock = mocker.Mock(id="1", subreddit=mocker.Mock(display_name="exists"))

    mock_submissions = [
        submission_mock,
        mocker.Mock(id="2", subreddit=mocker.Mock(display_name="missing")),
    ]

    mock_api = mocker.patch("channels.api.Api", autospec=True)
    mock_api.return_value.get_submission.side_effect = mock_submissions

    mock_backpopulate_api = mocker.patch("channels.tasks.backpopulate_api")
    mock_backpopulate_api.backpopulate_comments.return_value = 15

    result = tasks.populate_posts_and_comments.delay(post_ids).get()

    assert mock_api.return_value.get_submission.call_count == len(post_ids)
    for post_id in post_ids:
        mock_api.return_value.get_submission.assert_any_call(base36.dumps(post_id))

    assert Post.objects.filter(post_id="1").exists()

    post = Post.objects.get(post_id="1")

    mock_backpopulate_api.backpopulate_post.assert_called_once_with(
        post=post, submission=submission_mock
    )
    mock_backpopulate_api.backpopulate_comments.assert_called_once_with(
        post=post, submission=submission_mock
    )

    for mock in mock_submissions:
        mock._fetch.assert_called_once_with()  # pylint: disable=protected-access

    assert result == {
        "posts": 1,
        "comments": 15,
        "failures": [
            {
                "thing_type": "post",
                "thing_id": "2",
                "reason": "unknown channel 'missing'",
            }
        ],
    }


def test_populate_posts_and_comments_merge_results():
    """
    populate_posts_and_comments_merge_results should aggregate result from other tasks
    """
    result = tasks.populate_posts_and_comments_merge_results.delay(
        [
            {"posts": 3, "comments": 5, "failures": [1, 2, 3]},
            {"posts": 6, "comments": 9, "failures": [3, 4, 5]},
        ]
    ).get()

    assert result == {"posts": 9, "comments": 14, "failures": [1, 2, 3, 3, 4, 5]}


def test_populate_all_posts_and_comments(mocker, settings, mocked_celery):
    """
    populate_all_posts_and_comments should create batched subtasks to populate the Posts and Comments
    """
    mock_api = mocker.patch("channels.api.Api", autospec=True)
    mock_api.return_value.reddit.front.new.return_value = iter(
        [mocker.Mock(id=base36.dumps(23))]
    )

    mock_populate_posts_and_comments = mocker.patch(
        "channels.tasks.populate_posts_and_comments"
    )
    mock_populate_posts_and_comments_merge_results = mocker.patch(
        "channels.tasks.populate_posts_and_comments_merge_results"
    )

    # ensure group consumers the generator passed to it so the other assertions work
    mocked_celery.group.side_effect = list

    settings.OPENSEARCH_INDEXING_CHUNK_SIZE = 10

    with pytest.raises(mocked_celery.replace_exception_class):
        tasks.populate_all_posts_and_comments.delay()

    assert mocked_celery.group.call_count == 1
    assert mock_populate_posts_and_comments.si.call_count == 3
    mock_populate_posts_and_comments.si.assert_any_call(list(range(0, 10)))
    mock_populate_posts_and_comments.si.assert_any_call(list(range(10, 20)))
    mock_populate_posts_and_comments.si.assert_any_call(list(range(20, 24)))
    mock_populate_posts_and_comments_merge_results.s.assert_called_once_with()
    assert mocked_celery.replace.call_count == 1


def test_send_invitation_email(mocker, settings):
    """Tests that send_invitation_email sends an email"""
    invite = ChannelInvitationFactory.create()
    mock_mail_api = mocker.patch("channels.tasks.mail_api")
    mock_mail_api.messages_for_recipients.return_value = [1]
    tasks.send_invitation_email.delay(invite.id)

    mock_mail_api.context_for_user.assert_called_once_with(
        extra_context={
            "invite": invite,
            "signup_url": urljoin(settings.SITE_BASE_URL, reverse("signup")),
        }
    )
    mock_mail_api.messages_for_recipients.assert_called_once_with(
        [(invite.email, mock_mail_api.context_for_user.return_value)], "invite"
    )
    mock_mail_api.send_messages.assert_called_once_with(
        mock_mail_api.messages_for_recipients.return_value
    )


@pytest.mark.parametrize("is_in_new_posts", [True, False])
@pytest.mark.parametrize("is_missing", [True, False])
@pytest.mark.parametrize("will_fail_repair", [True, False])
def test_maybe_repair_post_in_host_listing(
    mocker, settings, is_in_new_posts, is_missing, will_fail_repair
):
    """Tests that maybe_repair_post_in_host_listing correctly repairs if the post is missing"""

    get_admin_api_mock = mocker.patch("channels.tasks.get_admin_api")
    log_mock = mocker.patch("channels.tasks.log")
    will_attempt_repair = is_in_new_posts and is_missing

    channel_name = "channel"
    post_id = base36.dumps(23)

    missing_post = mocker.Mock(id=post_id)
    posts = list(mocker.Mock(id=str(x)) for x in range(5))

    admin_api_mock = get_admin_api_mock.return_value
    admin_api_mock.list_posts.side_effect = [
        ([missing_post] if is_in_new_posts else []) + posts,
        ([] if is_missing else [missing_post]) + posts,
        ([missing_post] if is_in_new_posts else []) + posts,
        ([] if will_fail_repair else [missing_post]) + posts,
    ]

    settings.OPEN_DISCUSSIONS_HOT_POST_REPAIR_LIMIT = 4

    tasks.maybe_repair_post_in_host_listing.delay(channel_name, post_id)

    get_admin_api_mock.assert_called_once_with()

    assert admin_api_mock.list_posts.call_count == (4 if will_attempt_repair else 2)

    if will_attempt_repair:
        missing_post.upvote.assert_called_once_with()
        missing_post.clear_vote.assert_called_once_with()
    else:
        missing_post.upvote.assert_not_called()
        missing_post.clear_vote.assert_not_called()

    if will_attempt_repair:
        if will_fail_repair:
            log_mock.error.assert_called_once_with(
                "Failed to repair submission %s missing from hot posts in channel %s",
                post_id,
                channel_name,
            )
        else:
            log_mock.info.assert_called_once_with(
                "Successfully repaired submission %s missing from hot posts in channel %s",
                post_id,
                channel_name,
            )


def test_update_memberships_for_managed_channels(mocker):
    """Test that update_memberships_for_managed_channels task calls the matching API"""
    mock_update_memberships_for_managed_channels_api = mocker.patch(
        "channels.membership_api.update_memberships_for_managed_channels", autospec=True
    )

    tasks.update_memberships_for_managed_channels.delay(
        channel_ids=[1, 2, 3], user_ids=[4, 5, 6]
    )

    mock_update_memberships_for_managed_channels_api.assert_called_once_with(
        channel_ids=[1, 2, 3], user_ids=[4, 5, 6]
    )


@pytest.mark.parametrize("is_spam", [True, False])
def test_check_comment_for_spam(mocker, is_spam):
    """Verify that check_comment_for_spam removes a comment if it is spam"""
    mock_api = mocker.patch("channels.tasks.get_admin_api").return_value
    mock_spam_checker = mocker.patch("channels.tasks.SPAM_CHECKER")
    mock_spam_checker.is_comment_spam.return_value = is_spam
    comment = CommentFactory.create()

    tasks.check_comment_for_spam.delay(
        user_agent="user-agent", user_ip="user-ip", comment_id=comment.comment_id
    )

    mock_spam_checker.is_comment_spam.assert_called_once_with(
        user_agent="user-agent", user_ip="user-ip", comment=comment
    )

    if is_spam:
        mock_api.remove_comment.assert_called_once_with(comment.comment_id)
    else:
        mock_api.remove_comment.assert_not_called()

    assert (
        SpamCheckResult.objects.filter(
            content_type=ContentType.objects.get(model=COMMENT_TYPE),
            object_id=comment.id,
            is_spam=is_spam,
        ).count()
        == 1
    )


@pytest.mark.parametrize("is_spam", [True, False])
def test_check_post_for_spam(mocker, is_spam):
    """Verify that check_post_for_spam removes a post if it is spam"""
    mock_api = mocker.patch("channels.tasks.get_admin_api").return_value
    mock_spam_checker = mocker.patch("channels.tasks.SPAM_CHECKER")
    mock_spam_checker.is_post_spam.return_value = is_spam
    mock_moderator_notification = mocker.patch("channels.tasks.notify_moderators.delay")

    post = PostFactory.create()

    tasks.check_post_for_spam.delay(
        user_agent="user-agent", user_ip="user-ip", post_id=post.post_id
    )

    mock_spam_checker.is_post_spam.assert_called_once_with(
        user_agent="user-agent", user_ip="user-ip", post=post
    )

    if is_spam:
        mock_api.remove_post.assert_called_once_with(post.post_id)
        mock_moderator_notification.assert_not_called()
    else:
        mock_api.remove_post.assert_not_called()
        mock_moderator_notification.assert_called_once_with(
            post.post_id, post.channel.name
        )

    assert (
        SpamCheckResult.objects.filter(
            content_type=ContentType.objects.get(model=POST_TYPE),
            object_id=post.id,
            is_spam=is_spam,
        ).count()
        == 1
    )


@pytest.mark.parametrize("spam", [True, False])
@pytest.mark.parametrize("retire_users", [True, False])
@pytest.mark.parametrize("skip_akismet", [True, False])
@pytest.mark.parametrize("existing_spam_check_result", [True, False])
def test_update_spam(
    mocker, spam, retire_users, skip_akismet, existing_spam_check_result
):
    """Test the update_spam task"""
    # pylint: disable=too-many-locals
    comment = CommentFactory.create()
    post = PostFactory.create()

    if existing_spam_check_result:
        comment_spam_check_result = SpamCheckResultFactory.create(
            content_object=comment, is_spam=(not spam)
        )
        post_spam_check_result = SpamCheckResultFactory.create(
            content_object=post, is_spam=(not spam)
        )

    post_author_email = post.author.email
    comment_author_email = comment.author.email

    mock_admin_api = mocker.patch("channels.tasks.get_admin_api").return_value
    mock_askimet_client = mocker.patch(
        "channels.tasks.create_akismet_client"
    ).return_value
    tasks.update_spam.delay(
        spam=spam,
        comment_ids=[comment.id],
        post_ids=[post.id],
        retire_users=retire_users,
        skip_akismet=skip_akismet,
    )

    if existing_spam_check_result:
        comment_spam_check_result.refresh_from_db()
        post_spam_check_result.refresh_from_db()
    else:
        comment_content_type = ContentType.objects.get_for_model(Comment)
        post_content_type = ContentType.objects.get_for_model(Post)

        comment_spam_check_result = SpamCheckResult.objects.get(
            content_type=comment_content_type, object_id=comment.id
        )

        post_spam_check_result = SpamCheckResult.objects.get(
            content_type=post_content_type, object_id=post.id
        )

    assert comment_spam_check_result.is_spam == spam
    assert post_spam_check_result.is_spam == spam

    if spam:
        mock_admin_api.remove_post.assert_called_once_with(post.post_id)
        mock_admin_api.remove_comment.assert_called_once_with(comment.comment_id)

        if not skip_akismet:
            mock_askimet_client.submit_spam.assert_any_call(
                user_agent=comment_spam_check_result.user_agent,
                user_ip=comment_spam_check_result.user_ip,
                comment_content=comment.text,
                comment_type="reply",
                comment_author=comment.author.profile.name,
                comment_author_email=comment.author.email,
            )

            mock_askimet_client.submit_spam.assert_any_call(
                user_agent=post_spam_check_result.user_agent,
                user_ip=post_spam_check_result.user_ip,
                comment_content=post.plain_text,
                comment_type="forum-post",
                comment_author=post.author.profile.name,
                comment_author_email=post.author.email,
            )

        if retire_users:
            blocked_email_regexes = BlockedEmailRegex.objects.all().values_list(
                "match", flat=True
            )
            assert post_author_email in blocked_email_regexes
            assert comment_author_email in blocked_email_regexes

            comment.refresh_from_db()
            post.refresh_from_db()

            assert comment.author.email == ""
            assert post.author.email == ""

            assert not comment.author.is_active
            assert not post.author.is_active

    else:
        mock_admin_api.approve_post.assert_called_once_with(post.post_id)
        mock_admin_api.approve_comment.assert_called_once_with(comment.comment_id)

        if not skip_akismet:
            mock_askimet_client.submit_ham.assert_any_call(
                user_agent=comment_spam_check_result.user_agent,
                user_ip=comment_spam_check_result.user_ip,
                comment_content=comment.text,
                comment_type="reply",
                comment_author=comment.author.profile.name,
                comment_author_email=comment.author.email,
            )

            mock_askimet_client.submit_ham.assert_any_call(
                user_agent=post_spam_check_result.user_agent,
                user_ip=post_spam_check_result.user_ip,
                comment_content=post.plain_text,
                comment_type="forum-post",
                comment_author=post.author.profile.name,
                comment_author_email=post.author.email,
            )
