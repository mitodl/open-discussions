"""Serializers for channels_fields"""
import copy
import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from guardian.shortcuts import assign_perm
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from channels.constants import WIDGET_LIST_CHANGE_PERM
from channels.serializers.channels import ChannelAppearanceMixin
from channels.serializers.validators import validate_email, validate_username
from channels_fields.api import add_user_role, create_field_groups_and_roles
from channels_fields.constants import FIELD_ROLE_MODERATORS
from channels_fields.models import FieldChannel, FieldList, Subfield
from course_catalog.constants import PrivacyLevel
from course_catalog.models import UserList
from course_catalog.serializers import UserListSerializer
from open_discussions.serializers import WriteableSerializerMethodField
from profiles.models import Profile
from widgets.models import WidgetList

User = get_user_model()

log = logging.getLogger(__name__)


class FieldListSerializer(serializers.ModelSerializer):
    """Serializer for FieldList"""

    field_list = UserListSerializer(many=False, read_only=True)

    class Meta:
        model = FieldList
        fields = "__all__"
        read_only_fields = ("field_channel",)


class SubfieldSerializer(serializers.ModelSerializer):
    """Serializer for Subfields"""

    parent_field = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="name"
    )

    field_channel = serializers.SlugRelatedField(
        many=False, read_only=True, slug_field="name"
    )

    class Meta:
        model = Subfield
        fields = ("parent_field", "field_channel", "position")


class FieldChannelSerializer(serializers.ModelSerializer):
    """Serializer for FieldChannel"""

    lists = FieldListSerializer(many=True, read_only=True)
    featured_list = UserListSerializer(many=False, read_only=True)
    subfields = SubfieldSerializer(many=True, read_only=True)

    class Meta:
        model = FieldChannel
        fields = "__all__"
        read_only_fields = ("widget_list",)

        class Meta:
            model = FieldChannel
            fields = "__all__"
            read_only_fields = ("widget_list",)


class FieldChannelCreateSerializer(serializers.ModelSerializer):
    """Write serializer for FieldChannel"""

    featured_list = serializers.PrimaryKeyRelatedField(
        many=False,
        allow_null=True,
        allow_empty=True,
        required=False,
        queryset=UserList.objects.filter(privacy_level=PrivacyLevel.public.value),
    )
    lists = WriteableSerializerMethodField()
    subfields = WriteableSerializerMethodField()

    class Meta:
        model = FieldChannel
        fields = (
            "name",
            "title",
            "description",
            "subfields",
            "featured_list",
            "lists",
            "about",
        )

    def validate_lists(self, lists):
        """Validator for lists"""
        if len(lists) > 0:
            if isinstance(lists[0], dict):
                lists = [list["field_list"]["id"] for list in lists]
            try:
                valid_list_ids = set(
                    UserList.objects.filter(
                        id__in=lists, privacy_level=PrivacyLevel.public.value
                    ).values_list("id", flat=True)
                )
            except ValueError:
                raise ValidationError("List ids must be integers")
            missing = set(lists).difference(valid_list_ids)
            if missing:
                raise ValidationError(f"Invalid list ids: {missing}")
        return {"lists": lists}

    def get_lists(self, instance):
        """Returns the list of topics"""
        return [
            FieldListSerializer(list).data
            for list in instance.lists.all()
            .prefetch_related("field_list", "field_channel")
            .order_by("position")
        ]

    def validate_subfields(self, subfields):
        """Validator for subfields"""
        if len(subfields) > 0:
            if isinstance(subfields[0], dict):
                subfields = [subfield["field_channel"] for subfield in subfields]
            try:
                valid_subfield_names = set(
                    FieldChannel.objects.filter(name__in=subfields).values_list(
                        "name", flat=True
                    )
                )
            except ValueError:
                raise ValidationError("Subfield names must be strings")
            missing = set(subfields).difference(valid_subfield_names)
            if missing:
                raise ValidationError(f"Invalid subfield names: {missing}")
        return {"subfields": subfields}

    def get_subfields(self, instance):
        """Returns the list of topics"""
        return [
            SubfieldSerializer(subfield).data
            for subfield in instance.subfields.all()
            .prefetch_related("field_channel")
            .order_by("position")
        ]

    def upsert_field_lists(self, instance, validated_data):
        """Update or create field lists for a new or updated field channel"""
        if "lists" not in validated_data:
            return
        field_lists = validated_data.pop("lists")
        new_lists = set()
        former_lists = list(instance.lists.values_list("id", flat=True))
        for (idx, list_pk) in enumerate(field_lists):
            userlist = UserList.objects.filter(pk=list_pk).first()
            if userlist:
                field_list, _ = FieldList.objects.update_or_create(
                    field_channel=instance,
                    field_list=userlist,
                    defaults={"position": idx},
                )
                new_lists.add(field_list)
        removed_lists = list(set(former_lists) - {list.id for list in new_lists})
        with transaction.atomic():
            instance.lists.set(new_lists)
            instance.lists.filter(id__in=removed_lists).delete()

    def upsert_subfields(self, instance, validated_data):
        """Update or create subfields for a new or updated field channel"""
        if "subfields" not in validated_data:
            return
        subfields = validated_data.pop("subfields")
        new_subfields = set()
        former_subfields = list(
            instance.subfields.values_list("field_channel__name", flat=True)
        )
        for (idx, field_name) in enumerate(subfields):
            field_channel = FieldChannel.objects.filter(name=field_name).first()
            if field_channel and field_channel.pk != instance.pk:
                subfield, _ = Subfield.objects.update_or_create(
                    parent_channel=instance,
                    field_channel=field_channel,
                    defaults={"position": idx},
                )
                new_subfields.add(subfield)
        removed_subfields = list(
            set(former_subfields)
            - {subfield.field_channel.name for subfield in new_subfields}
        )
        with transaction.atomic():
            instance.subfields.set(new_subfields)
            instance.subfields.filter(
                field_channel__name__in=removed_subfields
            ).delete()

    def create(self, validated_data):
        base_field_data = copy.deepcopy(validated_data)
        for key in ("subfields", "lists"):
            base_field_data.pop(key, None)
        with transaction.atomic():
            widget_list = WidgetList.objects.create()
            base_field_data["widget_list"] = widget_list
            field_channel = super().create(base_field_data)
            roles = create_field_groups_and_roles(field_channel)
            moderator_group = roles[FIELD_ROLE_MODERATORS].group
            assign_perm(WIDGET_LIST_CHANGE_PERM, moderator_group, widget_list)
            self.upsert_field_lists(field_channel, validated_data)
            self.upsert_subfields(field_channel, validated_data)
            return field_channel


class FieldChannelWriteSerializer(FieldChannelCreateSerializer, ChannelAppearanceMixin):
    """Similar to FieldChannelCreateSerializer, with read-only name"""

    class Meta:
        model = FieldChannel
        fields = (
            "name",
            "title",
            "description",
            "subfields",
            "featured_list",
            "lists",
            "about",
            "avatar",
            "banner",
        )
        read_only_fields = ("name",)

    def update(self, instance, validated_data):
        """Update an existing field channel"""
        self.upsert_field_lists(instance, validated_data)
        self.upsert_subfields(instance, validated_data)

        avatar = validated_data.pop("avatar", None)
        if avatar:
            instance.avatar.save(
                f"field_channel_avatar_{instance.name}.jpg", avatar, save=False
            )
            instance.save(update_fields=["avatar"], update_image=True)

        banner = validated_data.pop("banner", None)
        if banner:
            instance.banner.save(
                f"field_channel_banner_{instance.name}.jpg", banner, save=False
            )
            instance.save(update_fields=["banner"], update_image=True)

        return super().update(instance, validated_data)


class FieldModeratorSerializer(serializers.Serializer):
    """Serializer for moderators"""

    moderator_name = WriteableSerializerMethodField()
    email = WriteableSerializerMethodField()
    full_name = serializers.SerializerMethodField()

    def get_moderator_name(self, instance):
        """Returns the name for the moderator"""
        return instance.username

    def get_email(self, instance):
        """Get the email from the associated user"""
        return (
            User.objects.filter(username=instance.username)
            .values_list("email", flat=True)
            .first()
        )

    def get_full_name(self, instance):
        """Get the full name of the associated user"""
        return (
            Profile.objects.filter(user__username=instance.username)
            .values_list("name", flat=True)
            .first()
        )

    def validate_moderator_name(self, value):
        """Validate moderator name"""
        return {"moderator_name": validate_username(value)}

    def validate_email(self, value):
        """Validate email"""
        return {"email": validate_email(value)}

    def create(self, validated_data):
        field_name = self.context["view"].kwargs["field_name"]
        moderator_name = validated_data.get("moderator_name")
        email = validated_data.get("email")

        if email and moderator_name:
            raise ValueError("Only one of moderator_name, email should be specified")

        if moderator_name:
            username = moderator_name
        elif email:
            username = User.objects.get(email__iexact=email).username
        else:
            raise ValueError("Missing moderator_name or email")

        user = User.objects.get(username=username)
        add_user_role(
            FieldChannel.objects.get(name=field_name), FIELD_ROLE_MODERATORS, user
        )
        return user
