""" Tests for channels_fields.views"""
from django.urls import reverse

from channels_fields.api import add_user_role
from channels_fields.constants import FIELD_ROLE_MODERATORS
from channels_fields.factories import FieldChannelFactory
from channels_fields.models import FieldChannel
from channels_fields.serializers import FieldChannelSerializer
from open_discussions.factories import UserFactory


def test_list_field_channels(user_client):
    """Test that all field channels are returned"""
    field_channels = sorted(FieldChannelFactory.create_batch(15), key=lambda f: f.id)
    url = reverse("field_channels_api-list")
    field_list = sorted(user_client.get(url).json()["results"], key=lambda f: f["id"])
    assert len(field_list) == len(field_channels)
    for idx, field_channel in enumerate(field_channels):
        assert field_list[idx] == FieldChannelSerializer(instance=field_channel).data


def test_create_field_channel(admin_client):
    """An admin should be able to create a new field channel"""
    url = reverse("field_channels_api-list")
    data = {"name": "biology", "title": "Biology", "about": {}}
    admin_client.post(url, data=data).json()
    assert FieldChannel.objects.filter(name=data["name"]).exists()


def test_create_field_channel_missing_name(admin_client):
    """Name is required for creating a field channel"""
    url = reverse("field_channels_api-list")
    data = {"title": "Biology", "about": {}}
    response = admin_client.post(url, data=data)
    assert response.status_code == 400
    assert response.json() == {
        "error_type": "ValidationError",
        "name": ["This field is required."],
    }


def test_create_field_channel_forbidden(user_client):
    """A normal user should not be able to create a new field channel"""
    url = reverse("field_channels_api-list")
    data = {"name": "biology", "title": "Biology", "about": {}}
    response = user_client.post(url, data=data)
    assert response.status_code == 403
    assert FieldChannel.objects.filter(name=data["name"]).exists() is False


def test_update_field_channel(field_channel, client):
    """A moderator should be able to update a field channel"""
    url = reverse(
        "field_channels_api-detail", kwargs={"field_name": field_channel.name}
    )
    data = {"title": "NEW TITLE", "about": {}}
    field_user = UserFactory.create()
    add_user_role(field_channel, FIELD_ROLE_MODERATORS, field_user)
    client.force_login(field_user)
    response = client.patch(url, data=data)
    assert response.status_code == 200
    field_channel.refresh_from_db()
    assert field_channel.title == data["title"]
    assert field_channel.about == data["about"]


def test_update_field_channel_forbidden(field_channel, user_client):
    """A normal user should not be able to update a field channel"""
    url = reverse(
        "field_channels_api-detail", kwargs={"field_name": field_channel.name}
    )
    response = user_client.patch(url, data={"title": "new"})
    assert response.status_code == 403


def test_delete_field_channel(field_channel, client):
    """An admin should be able to delete a field channel"""
    url = reverse(
        "field_channels_api-detail", kwargs={"field_name": field_channel.name}
    )
    client.force_login(UserFactory.create(is_staff=True))
    response = client.delete(url)
    assert response.status_code == 204


def test_delete_field_channel_forbidden(field_channel, client):
    """A moderator should npt be able to delete a field channel"""
    url = reverse(
        "field_channels_api-detail", kwargs={"field_name": field_channel.name}
    )
    field_user = UserFactory.create()
    add_user_role(field_channel, FIELD_ROLE_MODERATORS, field_user)
    client.force_login(field_user)
    response = client.delete(url)
    assert response.status_code == 403


def test_list_moderators(field_channel, client):
    """A field moderator should be able to view other moderators for the channel"""
    url = reverse(
        "field_moderators_api-list", kwargs={"field_name": field_channel.name}
    )
    field_user = UserFactory.create()
    other_mod = UserFactory.create()
    for user in [field_user, other_mod]:
        add_user_role(field_channel, FIELD_ROLE_MODERATORS, user)
    client.force_login(field_user)
    mods_list = sorted(client.get(url).json(), key=lambda user: user["moderator_name"])
    for idx, user in enumerate(
        sorted([field_user, other_mod], key=lambda user: user.username)
    ):
        assert user.username == mods_list[idx]["moderator_name"]


def test_list_moderators_forbidden(field_channel, user_client):
    """A normal user should not be able to view other moderators for the field channel"""
    url = reverse(
        "field_moderators_api-list", kwargs={"field_name": field_channel.name}
    )
    assert user_client.get(url).status_code == 403


def test_add_moderator(field_channel, client):
    """A moderator should be able to add other moderators"""
    field_user = UserFactory.create()
    add_user_role(field_channel, FIELD_ROLE_MODERATORS, field_user)
    url = reverse(
        "field_moderators_api-list", kwargs={"field_name": field_channel.name}
    )
    client.force_login(field_user)
    other_user_1 = UserFactory.create()
    other_user_2 = UserFactory.create()
    client.post(url, data={"email": other_user_1.email})
    client.post(url, data={"moderator_name": other_user_2.username})
    updated_mods = [user["email"] for user in client.get(url).json()]
    assert other_user_1.email in updated_mods
    assert other_user_2.email in updated_mods


def test_add_moderator_forbidden(field_channel, user_client):
    """A normal user should not be able to add other moderators"""
    url = reverse(
        "field_moderators_api-list", kwargs={"field_name": field_channel.name}
    )
    assert (
        user_client.post(url, data={"email": UserFactory.create().email}).status_code
        == 403
    )


def test_delete_moderator(field_channel, client):
    """A field moderator should be able to delete other moderators for the field channel"""
    field_user = UserFactory.create()
    add_user_role(field_channel, FIELD_ROLE_MODERATORS, field_user)
    other_mod = UserFactory.create()
    for user in [field_user, other_mod]:
        add_user_role(field_channel, FIELD_ROLE_MODERATORS, user)
    url = reverse(
        "field_moderators_api-detail",
        kwargs={"field_name": field_channel.name, "moderator_name": other_mod.username},
    )
    client.force_login(field_user)
    assert client.delete(url).status_code == 204


def test_delete_moderator_forbidden(field_channel, user_client):
    """A normal user should not be able to delete other moderators for the field channel"""
    field_user = UserFactory.create()
    add_user_role(field_channel, FIELD_ROLE_MODERATORS, field_user)
    url = reverse(
        "field_moderators_api-detail",
        kwargs={
            "field_name": field_channel.name,
            "moderator_name": field_user.username,
        },
    )
    assert user_client.delete(url).status_code == 403
