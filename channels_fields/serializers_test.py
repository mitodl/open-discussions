"""Tests for channels_fields.serializers"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from channels_fields.constants import FIELD_ROLE_MODERATORS
from channels_fields.factories import (
    FieldChannelFactory,
    FieldListFactory,
    SubfieldFactory,
)
from channels_fields.models import FieldChannelGroupRole
from channels_fields.serializers import (
    FieldChannelCreateSerializer,
    FieldChannelSerializer,
    FieldChannelWriteSerializer,
    FieldModeratorSerializer,
)
from course_catalog.constants import PrivacyLevel
from course_catalog.factories import UserListFactory
from course_catalog.serializers import UserListSerializer
from open_discussions.factories import UserFactory
from widgets.factories import WidgetListFactory

# pylint:disable=redefined-outer-name
pytestmark = pytest.mark.django_db


small_gif = (
    b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04"
    b"\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02"
    b"\x02\x4c\x01\x00\x3b"
)


def mock_image_file(filename):
    """Return a File object with a given name"""
    return SimpleUploadedFile(filename, small_gif, content_type="image/gif")


@pytest.fixture
def base_field_data():
    """Base field channel data for serializers"""
    return {
        "name": "my_field_name",
        "title": "my_title",
        "about": {"foo": "bar"},
        "public_description": "my desc",
    }


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

    mocker.patch("discussions.models.ResizeToFit", autospec=True)
    field_channel = FieldChannelFactory.create(
        banner=mock_image_file("banner.jpg") if has_banner else None,
        avatar=mock_image_file("avatar.jpg") if has_avatar else None,
        widget_list=WidgetListFactory.create() if has_widget_list else None,
        about={"foo": "bar"} if has_about else None,
        ga_tracking_id=ga_tracking_id,
    )

    field_lists = FieldListFactory.create_batch(3, field_channel=field_channel)

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
        "lists": [
            UserListSerializer(field_list.field_list).data
            for field_list in sorted(field_lists, key=lambda l: l.position)
        ],
        "subfields": [],
        "featured_list": None,
        "public_description": field_channel.public_description,
    }


def test_create_field_channel(base_field_data):
    """
    Test creating a field channel
    """
    user_lists = sorted(
        UserListFactory.create_batch(2, privacy_level=PrivacyLevel.public.value),
        key=lambda list: list.id,
        reverse=True,
    )
    data = {
        **base_field_data,
        "featured_list": user_lists[0].id,
        "lists": [list.id for list in user_lists],
    }
    serializer = FieldChannelCreateSerializer(data=data)
    assert serializer.is_valid()
    field_channel = serializer.create(serializer.validated_data)
    assert field_channel.widget_list is not None
    assert field_channel.name == data["name"]
    assert field_channel.title == data["title"]
    assert field_channel.about == data["about"]
    assert field_channel.public_description == data["public_description"]
    assert field_channel.featured_list == user_lists[0]
    assert [
        field_list.field_list.id
        for field_list in field_channel.lists.all().order_by("position")
    ] == [list.id for list in user_lists]


def test_create_field_channel_private_list(base_field_data):
    """Validation should fail if a list is private"""
    user_list = UserListFactory.create(privacy_level=PrivacyLevel.private.value)
    data = {**base_field_data, "featured_list": user_list.id, "lists": [user_list.id]}
    serializer = FieldChannelCreateSerializer(data=data)
    assert serializer.is_valid() is False
    assert "featured_list" in serializer.errors.keys()


def test_create_field_channel_bad_list_values(base_field_data):
    """Validation should fail if lists field has non-integer values"""
    data = {**base_field_data, "lists": ["my_list"]}
    serializer = FieldChannelCreateSerializer(data=data)
    assert serializer.is_valid() is False
    assert "lists" in serializer.errors.keys()


def test_create_field_channel_with_subfields(base_field_data):
    """Field channels can be created with subfields"""
    other_fields = sorted(
        FieldChannelFactory.create_batch(2), key=lambda field: field.id, reverse=True
    )
    data = {
        **base_field_data,
        "subfields": [other_field.name for other_field in other_fields],
    }
    serializer = FieldChannelCreateSerializer(data=data)
    assert serializer.is_valid() is True
    field_channel = serializer.create(serializer.validated_data)
    for other_field in other_fields:
        assert other_field.name in field_channel.subfields.values_list(
            "field_channel__name", flat=True
        ).order_by("position")


def test_create_field_channel_bad_subfields(base_field_data):
    """Validation should fail if a subfield does not exist"""
    data = {**base_field_data, "subfields": ["fake"]}
    serializer = FieldChannelCreateSerializer(data=data)
    assert serializer.is_valid() is False
    assert "subfields" in serializer.errors.keys()


def test_create_field_channel_bad_subfield_values(base_field_data):
    """Validation should fail if subfield data is not a list of strings"""
    data = {**base_field_data, "subfields": [{"name": "fake"}]}
    serializer = FieldChannelCreateSerializer(data=data)
    assert serializer.is_valid() is False
    assert "subfields" in serializer.errors.keys()


def test_update_field_channel():
    """
    Test updating a field_channel
    """
    new_field_title = "Biology"
    new_about = {"foo": "bar"}

    field_channel = FieldChannelFactory.create()
    lists = FieldListFactory.create_batch(2, field_channel=field_channel)
    subfields = SubfieldFactory.create_batch(2, parent_channel=field_channel)
    data = {
        "title": new_field_title,
        "about": new_about,
        "lists": [lists[0].field_list.id],
        "subfields": [subfields[1].field_channel.name],
        "featured_list": lists[0].field_list.id,
    }
    serializer = FieldChannelWriteSerializer(instance=field_channel, data=data)
    assert serializer.is_valid() is True
    updated_channel = serializer.update(field_channel, serializer.validated_data)
    assert updated_channel.title == new_field_title
    assert updated_channel.about == new_about
    assert updated_channel.name == field_channel.name
    assert updated_channel.subfields.count() == 1
    new_subfield = updated_channel.subfields.first()
    assert new_subfield.field_channel.name == subfields[1].field_channel.name
    assert new_subfield.parent_channel == field_channel
    assert new_subfield.position == 0
    assert updated_channel.lists.count() == 1
    assert updated_channel.lists.first().field_list.id == lists[0].field_list.id
    assert updated_channel.featured_list == lists[0].field_list


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
