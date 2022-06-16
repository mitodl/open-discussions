"""Tests for channels_fields.serializers"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from channels_fields.constants import FIELD_ROLE_MODERATORS
from channels_fields.factories import FieldChannelFactory
from channels_fields.models import FieldChannelGroupRole
from channels_fields.serializers import FieldChannelSerializer, FieldModeratorSerializer
from open_discussions.factories import UserFactory
from widgets.factories import WidgetListFactory

pytestmark = pytest.mark.django_db


def mock_image_file(filename):
    """Return a File object with a given name"""
    return SimpleUploadedFile(filename, b"", content_type="image/jpeg")


@pytest.mark.parametrize("has_avatar", [True, False])
@pytest.mark.parametrize("has_banner", [True, False])
@pytest.mark.parametrize("has_about", [True, False])
@pytest.mark.parametrize("has_widget_list", [True, False])
@pytest.mark.parametrize("ga_tracking_id", [None, "abc123"])
def test_serialize_channel(  # pylint: disable=too-many-arguments
    mocker, has_avatar, has_banner, has_about, has_widget_list, ga_tracking_id
):
    """
    Test serializing a field channel
    """
    field_channel = FieldChannelFactory.create(
        banner=mock_image_file("banner.jpg") if has_banner else None,
        avatar=mock_image_file("avatar.jpg") if has_avatar else None,
        avatar_small=mock_image_file("avatar_small.jpg") if has_avatar else None,
        avatar_medium=mock_image_file("avatar_medium.jpg") if has_avatar else None,
        widget_list=WidgetListFactory.create() if has_widget_list else None,
        about={"foo": "bar"} if has_about else None,
        ga_tracking_id=ga_tracking_id,
    )

    assert FieldChannelSerializer(field_channel).data == {
        "name": field_channel.name,
        "title": field_channel.title,
        "avatar": field_channel.avatar.url if has_avatar else None,
        "avatar_small": field_channel.avatar_small.url if has_avatar else None,
        "avatar_medium": field_channel.avatar_medium.url if has_avatar else None,
        "banner": field_channel.banner.url if has_banner else None,
        "ga_tracking_id": field_channel.ga_tracking_id,
        "widget_list": field_channel.widget_list.id if has_widget_list else None,
        "about": field_channel.about,
        "updated_on": mocker.ANY,
        "created_on": mocker.ANY,
        "id": field_channel.id,
    }


def test_create_field_channel():
    """
    Test creating a field channel
    """
    data = {"name": "name", "title": "title", "about": {"foo": "bar"}}
    serializer = FieldChannelSerializer(data=data)
    serializer.is_valid()
    field_channel = serializer.create(serializer.validated_data)
    assert field_channel.name == data["name"]
    assert field_channel.title == data["title"]
    assert field_channel.about == data["about"]
    assert field_channel.widget_list is not None


def test_update_field_channel():
    """
    Test updating a field_channel
    """
    new_field_title = "Biology"
    new_about = {"foo": "bar"}
    field_channel = FieldChannelFactory.create()
    validated_data = {"title": new_field_title, "about": new_about}
    updated_channel = FieldChannelSerializer().update(field_channel, validated_data)
    assert updated_channel.title == new_field_title
    assert updated_channel.about == new_about
    assert updated_channel.name == field_channel.name


@pytest.mark.parametrize("use_email", [True, False])
def test_moderator_serializer(mocker, field_channel, use_email):
    """Test creating moderators with the FieldModeratorSerializer"""
    field_user = UserFactory.create()
    if use_email:
        data = {"email": field_user.email}
    else:
        data = {"moderator_name": field_user.username}
    serializer = FieldModeratorSerializer(
        data=data,
        context={"view": mocker.Mock(kwargs={"field_name": field_channel.name})},
    )
    serializer.is_valid()
    serializer.create(serializer.validated_data)
    field_user.refresh_from_db()
    assert (
        FieldChannelGroupRole.objects.get(
            field__name=field_channel.name, role=FIELD_ROLE_MODERATORS
        ).group
        in field_user.groups.all()
    )
