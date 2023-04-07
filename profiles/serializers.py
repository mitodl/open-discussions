"""
Serializers for profile REST APIs
"""
import re

from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
import ulid

from authentication import api as auth_api
from profiles.api import get_site_type_from_url, after_profile_created_or_updated
from profiles.models import (
    Profile,
    PROFILE_PROPS,
    UserWebsite,
    PERSONAL_SITE_TYPE,
    SOCIAL_SITE_NAME_MAP,
)
from profiles.utils import image_uri, IMAGE_MEDIUM, IMAGE_SMALL

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for Profile"""

    email_optin = serializers.BooleanField(write_only=True, required=False)
    toc_optin = serializers.BooleanField(write_only=True, required=False)
    username = serializers.SerializerMethodField(read_only=True)
    profile_image_medium = serializers.SerializerMethodField(read_only=True)
    profile_image_small = serializers.SerializerMethodField(read_only=True)
    placename = serializers.SerializerMethodField(read_only=True)

    def get_username(self, obj):
        """Custom getter for the username"""
        return str(obj.user.username)

    def get_profile_image_medium(self, obj):
        """Custom getter for medium profile image"""
        return image_uri(obj, IMAGE_MEDIUM)

    def get_profile_image_small(self, obj):
        """Custom getter for small profile image"""
        return image_uri(obj, IMAGE_SMALL)

    def get_placename(self, obj):
        """Custom getter for location text"""
        if obj.location:
            return obj.location.get("value", "")
        return ""

    def validate_location(self, location):
        """
        Validator for location.
        """
        if location and (
            not isinstance(location, dict) or ("value" not in location.keys())
        ):
            raise ValidationError("Missing/incorrect location information")
        return location

    def update(self, instance, validated_data):
        """Update the profile and related docs in Opensearch"""
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            update_image = "image_file" in validated_data
            instance.save(update_image=update_image)
            after_profile_created_or_updated(instance)
            return instance

    def to_representation(self, instance):
        """
        Overridden serialization method. Adds serialized UserWebsites if an option in the context indicates that
        it should be included.
        """
        data = super().to_representation(instance)
        if self.context.get("include_user_websites"):
            data["user_websites"] = UserWebsiteSerializer(
                instance.userwebsite_set.all(), many=True
            ).data
        return data

    class Meta:
        model = Profile
        fields = (
            "name",
            "image",
            "image_small",
            "image_medium",
            "image_file",
            "image_small_file",
            "image_medium_file",
            "profile_image_small",
            "profile_image_medium",
            "email_optin",
            "toc_optin",
            "bio",
            "headline",
            "username",
            "placename",
            "location",
        )
        read_only_fields = (
            "image_file_small",
            "image_file_medium",
            "profile_image_small",
            "profile_image_medium",
            "username",
            "placename",
        )
        extra_kwargs = {"location": {"write_only": True}}


class UserWebsiteSerializer(serializers.ModelSerializer):
    """Serializer for UserWebsite"""

    def validate_url(self, value):
        """
        Validator for url. Prepends http protocol to the url if the protocol wasn't already included in the value.
        """
        url = "" if not value else value.lower()
        if not re.search(r"^http[s]?://", url):
            return "%s%s" % ("http://", url)
        return url

    def to_internal_value(self, data):
        """
        Overridden deserialization method. Changes the default behavior in the following ways:
        1) Gets the profile id from a given username.
        2) Calculates the site_type from the url value and adds it to the internal value.
        """
        internal_value = super().to_internal_value(
            {
                **data,
                "profile": Profile.objects.filter(user__username=data.get("username"))
                .values_list("id", flat=True)
                .first(),
            }
        )
        internal_value["site_type"] = get_site_type_from_url(
            internal_value.get("url", "")
        )
        return internal_value

    def run_validators(self, value):
        """
        Overridden validation method. Changes the default behavior in the following ways:
        1) If the user submitted a URL to save as a specific site type (personal/social),
            ensure that the URL entered matches that submitted site type.
        2) If the data provided violates the uniqueness of the site type for the given user, coerce
            the error to a "url" field validation error instead of a non-field error.
        """
        submitted_site_type = self.initial_data.get("submitted_site_type")
        calculated_site_type = value.get("site_type")
        if submitted_site_type and calculated_site_type:
            # The URL is for a personal site, but was submitted as a social site
            if (
                calculated_site_type == PERSONAL_SITE_TYPE
                and submitted_site_type != calculated_site_type
            ):
                raise ValidationError(
                    {
                        "url": [
                            "Please provide a URL for one of these social sites: {}".format(
                                ", ".join(SOCIAL_SITE_NAME_MAP.values())
                            )
                        ]
                    }
                )
            # The URL is for a social site, but was submitted as a personal site
            elif (
                calculated_site_type in SOCIAL_SITE_NAME_MAP
                and submitted_site_type == PERSONAL_SITE_TYPE
            ):
                raise ValidationError(
                    {
                        "url": [
                            "A social site URL was provided. Please provide a URL for a personal website."
                        ]
                    }
                )
        try:
            return super().run_validators(value)
        except ValidationError as e:
            if e.get_codes() == ["unique"]:
                raise ValidationError(
                    {"url": ["A website of this type has already been saved."]},
                    code="unique",
                )

    def to_representation(self, instance):
        """
        Overridden serialization method. Excludes 'profile' from the serialized data as it isn't relevant as a
        serialized field (we only need to deserialize that value).
        """
        data = super().to_representation(instance)
        data.pop("profile")
        return data

    class Meta:
        model = UserWebsite
        fields = ("id", "profile", "url", "site_type")
        read_only_fields = ("id", "site_type")


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User"""

    uid = serializers.CharField(write_only=True, required=False)
    # username cannot be set but a default is generated on create using ulid.new
    username = serializers.CharField(read_only=True)
    email = serializers.CharField(write_only=True)
    profile = ProfileSerializer()

    def create(self, validated_data):
        profile_data = validated_data.pop("profile") or {}
        username = ulid.new()
        email = validated_data.get("email")
        uid = validated_data.get("uid", None)

        with transaction.atomic():
            user = auth_api.create_user(username, email, profile_data)

            if uid:
                auth_api.create_or_update_micromasters_social_auth(
                    user, uid, {"email": email}
                )

        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        uid = validated_data.get("uid", None)
        email = validated_data.get("email", None)

        with transaction.atomic():
            if email:
                instance.email = email
                instance.save()

            if uid:
                auth_api.create_or_update_micromasters_social_auth(
                    instance, uid, {"email": email}
                )

            if profile_data:
                profile = instance.profile
                for prop_name in PROFILE_PROPS:
                    setattr(
                        profile,
                        prop_name,
                        profile_data.get(prop_name, getattr(profile, prop_name)),
                    )
                profile.save()
                after_profile_created_or_updated(profile)

        return instance

    class Meta:
        model = User
        fields = ("id", "username", "profile", "email", "uid")
        read_only_fields = ("id", "username")
