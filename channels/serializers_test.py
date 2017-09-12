"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import (
    Mock,
    patch,
)

import pytest
from praw.models.reddit.redditor import Redditor
from rest_framework.exceptions import ValidationError

from channels.serializers import (
    ChannelSerializer,
    CommentSerializer,
    ContributorSerializer,
    ModeratorSerializer,
    PostSerializer,
)
from open_discussions.factories import UserFactory


pytestmark = pytest.mark.django_db


def test_serialize_channel(user):
    """
    Test serializing a channel
    """
    channel = Mock(
        display_name='name',
        title='title',
        subreddit_type='public',
        public_description='public_description',
    )
    request = Mock(user=user)
    assert ChannelSerializer(channel, context={
        "request": request,
    }).data == {
        'name': 'name',
        'title': 'title',
        'channel_type': 'public',
        'public_description': 'public_description',
    }


def test_create_channel(user):
    """
    Test creating a channel
    """
    validated_data = {
        'display_name': 'name',
        'title': 'title',
        'subreddit_type': 'public',
        'public_description': 'public_description',
    }
    request = Mock(user=user)
    with patch('channels.serializers.Api', autospec=True) as api:
        channel = ChannelSerializer(context={
            "request": request,
        }).create(validated_data)
    api.return_value.create_channel.assert_called_once_with(
        name=validated_data['display_name'],
        title=validated_data['title'],
        channel_type=validated_data['subreddit_type'],
        public_description=validated_data['public_description'],
    )
    assert channel == api.return_value.create_channel.return_value
    api.assert_called_once_with(user=user)


@pytest.mark.parametrize("is_empty", [True, False])
def test_update_channel(user, is_empty):
    """
    Test updating a channel
    """
    validated_data = {} if is_empty else {
        'title': 'title',
        'subreddit_type': 'public',
        'public_description': 'public_description',
    }
    display_name = 'subreddit'
    instance = Mock(display_name=display_name)
    request = Mock(user=user)
    with patch('channels.serializers.Api', autospec=True) as api:
        channel = ChannelSerializer(context={
            "request": request,
        }).update(instance, validated_data)

    kwargs = {} if is_empty else {
        "title": validated_data['title'],
        "channel_type": validated_data['subreddit_type'],
        "public_description": validated_data['public_description'],
    }
    api.return_value.update_channel.assert_called_once_with(
        name=display_name,
        **kwargs
    )
    assert channel == api.return_value.update_channel.return_value
    api.assert_called_once_with(user=user)


def test_post_validate_upvoted():
    """upvoted must be a bool"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_upvoted("not a bool")
    assert ex.value.args[0] == 'upvoted must be a bool'


def test_post_validate_text():
    """text must be a string"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_text(["not a string"])
    assert ex.value.args[0] == 'text must be a string'


def test_post_validate_url():
    """url must be a string"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_url(["not a string"])
    assert ex.value.args[0] == 'url must be a string'


def test_post_both_text_and_url():
    """We can't create a post with both text and url specified"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().create({
            'title': 'title',
            'text': 'text',
            'url': 'url',
        })
    assert ex.value.args[0] == 'Only one of text or url can be used to create a post'


def test_post_neither_text_nor_url():
    """One of text or url must be specified"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().create({
            "title": "title",
        })
    assert ex.value.args[0] == 'One of text or url must be provided to create a post'


def test_post_edit_url():
    """Cannot update the URL for a post"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer(context={
            "request": Mock(),
            "view": Mock(kwargs={'post_id': 'post'}),
        }).update(Mock(), {
            "url": "url"
        })
    assert ex.value.args[0] == 'Cannot edit url for a post'


def test_comment_update_with_comment_id():
    """Cannot pass comment_id to a comment, this is provided in the URL"""
    with pytest.raises(ValidationError) as ex:
        CommentSerializer().update(Mock(), {
            "comment_id": "something"
        })
    assert ex.value.args[0] == 'comment_id must be provided via URL'


def test_comment_validate_upvoted():
    """upvoted must be a bool"""
    with pytest.raises(ValidationError) as ex:
        CommentSerializer().validate_upvoted("not a bool")
    assert ex.value.args[0] == 'upvoted must be a bool'


def test_comment_validate_downvoted():
    """downvoted must be a bool"""
    with pytest.raises(ValidationError) as ex:
        CommentSerializer().validate_downvoted("not a bool")
    assert ex.value.args[0] == 'downvoted must be a bool'


def test_comment_only_one_downvote_or_upvote():
    """only one of downvoted or upvoted can be true at the same time"""
    with pytest.raises(ValidationError) as ex:
        CommentSerializer().validate({
            "upvoted": True,
            "downvoted": True,
        })
    assert ex.value.args[0] == 'upvoted and downvoted cannot both be true'


def test_contributor():
    """Serialize of a redditor-like object"""
    redditor = Mock(spec=Redditor)
    # the `name` attribute cannot be configured during the mock object creation
    redditor.name = 'fooo_username'
    assert ContributorSerializer(redditor).data == {'contributor_name': 'fooo_username'}


def test_contributor_validate_name_no_string():
    """validate the input in case the value is not a string"""
    with pytest.raises(ValidationError) as ex:
        ContributorSerializer().validate_contributor_name(None)
    assert ex.value.args[0] == 'contributor name must be a string'


def test_contributor_validate_name_no_valid_user():
    """validate the input in case the user does not exists in the DB"""
    with pytest.raises(ValidationError) as ex:
        ContributorSerializer().validate_contributor_name('foo_user')
    assert ex.value.args[0] == 'contributor name is not a valid user'


def test_contributor_validate_name():
    """validate the input"""
    user = UserFactory.create()
    assert ContributorSerializer().validate_contributor_name(user.username) == {'contributor_name': user.username}


def test_contributor_create():
    """Adds a contributor"""
    user = UserFactory.create()
    contributor_user = UserFactory.create()
    contributor_redditor = Mock(spec=Redditor)
    contributor_redditor.name = contributor_user.username
    with patch('channels.serializers.Api', autospec=True) as api:
        api.return_value.add_contributor.return_value = contributor_redditor
        contributor = ContributorSerializer(context={
            "request": Mock(user=user),
            "view": Mock(kwargs={'channel_name': 'foo_channel'})
        }).create({'contributor_name': contributor_user.username})
        assert contributor is contributor_redditor
        api.return_value.add_contributor.assert_called_once_with(contributor_user.username, 'foo_channel')


def test_moderator():
    """Serialize of a redditor-like object"""
    redditor = Mock(spec=Redditor)
    # the `name` attribute cannot be configured during the mock object creation
    redditor.name = 'fooo_username'
    assert ModeratorSerializer(redditor).data == {'moderator_name': 'fooo_username'}


def test_moderator_validate_name_no_string():
    """validate the input in case the value is not a string"""
    with pytest.raises(ValidationError) as ex:
        ModeratorSerializer().validate_moderator_name(None)
    assert ex.value.args[0] == 'moderator name must be a string'


def test_moderator_validate_name_no_valid_user():
    """validate the input in case the user does not exists in the DB"""
    with pytest.raises(ValidationError) as ex:
        ModeratorSerializer().validate_moderator_name('foo_user')
    assert ex.value.args[0] == 'moderator name is not a valid user'


def test_moderator_validate_name():
    """validate the input"""
    user = UserFactory.create()
    assert ModeratorSerializer().validate_moderator_name(user.username) == {'moderator_name': user.username}


def test_moderator_create():
    """Adds a moderator"""
    user = UserFactory.create()
    moderator_user = UserFactory.create()
    moderator_redditor = Mock(spec=Redditor)
    moderator_redditor.name = moderator_user.username
    with patch('channels.serializers.Api', autospec=True) as api:
        api.return_value.add_moderator.return_value = moderator_redditor
        contributor = ModeratorSerializer(context={
            "request": Mock(user=user),
            "view": Mock(kwargs={'channel_name': 'foo_channel'})
        }).create({'moderator_name': moderator_user.username})
        assert contributor is moderator_redditor
        api.return_value.add_moderator.assert_called_once_with(moderator_user.username, 'foo_channel')
