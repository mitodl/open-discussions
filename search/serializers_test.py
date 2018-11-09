"""Tests for elasticsearch serializers"""
# pylint: disable=redefined-outer-name,unused-argument
import pytest

from channels.constants import POST_TYPE, COMMENT_TYPE
from channels.factories import PostFactory, CommentFactory
from channels.utils import get_reddit_slug
from open_discussions.factories import UserFactory
from profiles.models import Profile
from profiles.utils import image_uri, IMAGE_MEDIUM
from search.constants import PROFILE_TYPE
from search.serializers import (
    ESPostSerializer,
    ESCommentSerializer,
    ESProfileSerializer,
    serialize_post_for_bulk,
    serialize_comment_for_bulk,
    serialize_bulk_comments,
    serialize_bulk_profiles,
    serialize_profile_for_bulk,
)


@pytest.fixture
def patched_base_post_serializer(mocker):
    """Fixture that patches the base serializer class for ESPostSerializer"""
    base_serialized_data = {
        "author_id": 1,
        "author_name": "Author Name",
        "author_headline": "Author Headline",
        "profile_image": "/media/profile/1/208c7d959608417eb13bc87392cb5f77-2018-09-21T163449_small.jpg",
        "channel_title": "channel 1",
        "channel_name": "channel_1",
        "text": "Post Text",
        "score": 1,
        "created": 123,
        "num_comments": 0,
        "removed": False,
        "deleted": False,
        "id": 1,
        "title": "post_title",
        "url": None,
        "thumbnail": None,
        "slug": "post-title",
    }
    yield mocker.patch(
        "search.serializers.ESPostSerializer.base_serializer",
        return_value=mocker.Mock(data=base_serialized_data, _get_user=mocker.Mock()),
    )


@pytest.fixture
def patched_base_comment_serializer(mocker):
    """Fixture that patches the base serializer class for ESCommentSerializer"""
    base_serialized_data = {
        "author_id": 1,
        "author_name": "Author Name",
        "author_headline": "Author Headline",
        "profile_image": "/media/profile/1/208c7d959608417eb13bc87392cb5f77-2018-09-21T163449_small.jpg",
        "text": "Comment Text",
        "score": 1,
        "created": 456,
        "removed": False,
        "deleted": False,
        "id": 1,
        "parent_id": 2,
    }
    yield mocker.patch(
        "search.serializers.ESCommentSerializer.base_serializer",
        return_value=mocker.Mock(data=base_serialized_data, _get_user=mocker.Mock()),
    )


@pytest.fixture
def patched_base_profile_serializer(mocker, user):
    """Fixture that patches the base serializer class for ESProfileSerializer"""
    base_serialized_data = {
        "username": user.username,
        "name": "Author Name",
        "profile_image_small": "/media/profile/1/208c7d959608417eb13bc87392cb5f77-2018-09-21T163449_small.jpg",
        "profile_image_medium": "/media/profile/1/208c7d959608417eb13bc87392cb5f77-2018-09-21T163449_medium.jpg",
        "bio": "Test bio",
        "headline": "Test headline",
    }
    yield mocker.patch(
        "search.serializers.ESProfileSerializer.base_serializer",
        return_value=mocker.Mock(data=base_serialized_data, _get_user=mocker.Mock()),
    )


@pytest.mark.parametrize(
    "post_text,post_url", [["some text", None], ["", "http://example.com"]]
)
def test_es_post_serializer(
    patched_base_post_serializer, reddit_submission_obj, post_text, post_url
):
    """
    Test that ESPostSerializer correctly serializes a post/submission object
    """
    patched_base_post_serializer.return_value.data.update(
        {"text": post_text, "url": post_url}
    )
    base_serialized = patched_base_post_serializer.return_value.data
    serialized = ESPostSerializer().serialize(reddit_submission_obj)
    patched_base_post_serializer.assert_called_once_with(reddit_submission_obj)
    assert serialized == {
        "object_type": POST_TYPE,
        "author_id": base_serialized["author_id"],
        "author_name": base_serialized["author_name"],
        "author_headline": base_serialized["author_headline"],
        "author_avatar_small": base_serialized["profile_image"],
        "channel_name": base_serialized["channel_name"],
        "channel_title": base_serialized["channel_title"],
        "text": base_serialized["text"],
        "score": base_serialized["score"],
        "removed": base_serialized["removed"],
        "created": base_serialized["created"],
        "deleted": base_serialized["deleted"],
        "num_comments": base_serialized["num_comments"],
        "post_id": base_serialized["id"],
        "post_title": base_serialized["title"],
        "post_link_url": base_serialized["url"],
        "post_link_thumbnail": base_serialized["thumbnail"],
        "post_slug": base_serialized["slug"],
    }


def test_es_comment_serializer(patched_base_comment_serializer, reddit_comment_obj):
    """
    Test that ESCommentSerializer correctly serializes a comment object
    """
    base_serialized = patched_base_comment_serializer.return_value.data
    serialized = ESCommentSerializer().serialize(reddit_comment_obj)
    patched_base_comment_serializer.assert_called_once_with(reddit_comment_obj)
    assert serialized == {
        "object_type": COMMENT_TYPE,
        "author_id": base_serialized["author_id"],
        "author_name": base_serialized["author_name"],
        "author_headline": base_serialized["author_headline"],
        "author_avatar_small": base_serialized["profile_image"],
        "text": base_serialized["text"],
        "score": base_serialized["score"],
        "created": base_serialized["created"],
        "removed": base_serialized["removed"],
        "deleted": base_serialized["deleted"],
        "comment_id": base_serialized["id"],
        "parent_comment_id": base_serialized["parent_id"],
        "channel_name": reddit_comment_obj.subreddit.display_name,
        "channel_title": reddit_comment_obj.subreddit.title,
        "post_id": reddit_comment_obj.submission.id,
        "post_title": reddit_comment_obj.submission.title,
        "post_slug": get_reddit_slug(reddit_comment_obj.submission.permalink),
    }


def test_es_profile_serializer(mocker, user):
    """
    Test that ESProfileSerializer correctly serializes a profile object

    """
    mocker.patch(
        "search.serializers.get_channels", return_value={"channel01", "channel02"}
    )
    serialized = ESProfileSerializer().serialize(user.profile)
    assert serialized == {
        "object_type": PROFILE_TYPE,
        "author_id": user.username,
        "author_name": user.profile.name,
        "author_avatar_small": image_uri(user.profile),
        "author_avatar_medium": image_uri(user.profile, IMAGE_MEDIUM),
        "author_bio": user.profile.bio,
        "author_headline": user.profile.headline,
        "author_channel_membership": ["channel01", "channel02"],
    }


@pytest.mark.django_db
def test_serialize_bulk_comments(mocker, reddit_submission_obj, user, settings):
    """serialize_bulk_comments should index all comments for a post"""
    settings.INDEXING_API_USERNAME = user.username
    post = PostFactory.create(post_id=reddit_submission_obj.id)
    outer_comment = CommentFactory(post=post)
    inner_comment = CommentFactory(post=post, parent_id=outer_comment.comment_id)
    mock_api = mocker.patch("channels.api.Api", autospec=True)
    mock_serialize_comment = mocker.patch(
        "search.serializers.serialize_comment_for_bulk"
    )
    list(serialize_bulk_comments(post.post_id))
    mock_api(user).get_comment.assert_any_call(inner_comment.comment_id)
    mock_api(user).get_comment.assert_any_call(outer_comment.comment_id)
    assert mock_serialize_comment.call_count == 2


def test_serialize_post_for_bulk(mocker, reddit_submission_obj):
    """
    Test that serialize_post_for_bulk correctly serializes a post/submission object
    """
    post_id = "post1"
    base_serialized_post = {"serialized": "post"}
    mocker.patch(
        "search.serializers.ESPostSerializer.serialize",
        return_value=base_serialized_post,
    )
    mocker.patch("search.serializers.gen_post_id", return_value=post_id)
    serialized = serialize_post_for_bulk(reddit_submission_obj)
    assert serialized == {"_id": post_id, **base_serialized_post}


def test_serialize_comment_for_bulk(mocker, reddit_comment_obj):
    """
    Test that serialize_comment_for_bulk correctly serializes a comment object
    """
    comment_id = "comment1"
    base_serialized_comment = {"serialized": "comment"}
    mocker.patch(
        "search.serializers.ESCommentSerializer.serialize",
        return_value=base_serialized_comment,
    )
    mocker.patch("search.serializers.gen_comment_id", return_value=comment_id)
    serialized = serialize_comment_for_bulk(reddit_comment_obj)
    assert serialized == {"_id": comment_id, **base_serialized_comment}


def test_serialize_missing_author(
    patched_base_post_serializer,
    patched_base_comment_serializer,
    reddit_submission_obj,
    reddit_comment_obj,
):
    """Test that objects with missing author information can still be serialized"""
    deleted_author_dict = {"author_id": "[deleted]", "author_name": "[deleted]"}
    patched_base_post_serializer.return_value.data.update(deleted_author_dict)
    patched_base_comment_serializer.return_value.data.update(deleted_author_dict)
    serialized_post = ESPostSerializer().serialize(reddit_submission_obj)
    serialized_comment = ESCommentSerializer().serialize(reddit_comment_obj)
    assert serialized_post["author_id"] is None
    assert serialized_post["author_name"] is None
    assert serialized_comment["author_id"] is None
    assert serialized_comment["author_name"] is None


@pytest.mark.django_db
def test_serialize_bulk_profiles(mocker):
    """
    Test that serialize_bulk_profiles calls serialize_profile_for_bulk for every existing profile
    """
    mock_serialize_profile = mocker.patch(
        "search.serializers.serialize_profile_for_bulk"
    )
    users = UserFactory.create_batch(5)
    list(serialize_bulk_profiles([profile.id for profile in Profile.objects.all()]))
    for user in users:
        mock_serialize_profile.assert_any_call(user.profile)


def test_serialize_profile_for_bulk(patched_base_profile_serializer, user):
    """
    Test that serialize_profile_for_bulk yields a valid ESProfileSerializer
    """
    assert serialize_profile_for_bulk(user.profile) == {
        "_id": "u_{}".format(user.username),
        **ESProfileSerializer().serialize(user.profile),
    }
