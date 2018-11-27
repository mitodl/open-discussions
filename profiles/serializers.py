"""
Serializers for profile REST APIs
"""
from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import serializers
import ulid

from authentication import api as auth_api
from profiles.api import get_site_type_from_url
from profiles.models import Profile, PROFILE_PROPS, UserWebsite
from profiles.utils import image_uri, IMAGE_MEDIUM, IMAGE_SMALL

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for Profile"""

    email_optin = serializers.BooleanField(write_only=True, required=False)
    toc_optin = serializers.BooleanField(write_only=True, required=False)
    username = serializers.SerializerMethodField(read_only=True)
    profile_image_medium = serializers.SerializerMethodField(read_only=True)
    profile_image_small = serializers.SerializerMethodField(read_only=True)

    def get_username(self, obj):
        """Custom getter for the username"""
        return str(obj.user.username)

    def get_profile_image_medium(self, obj):
        """ Custom getter for medium profile image """
        return image_uri(obj, IMAGE_MEDIUM)

    def get_profile_image_small(self, obj):
        """ Custom getter for small profile image """
        return image_uri(obj, IMAGE_SMALL)

    def update(self, instance, validated_data):
        """Update the profile and related docs in Elasticsearch"""
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            update_image = "image_file" in validated_data
            instance.save(update_image=update_image)
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
        )
        read_only_fields = (
            "image_file_small",
            "image_file_medium",
            "profile_image_small",
            "profile_image_medium",
            "username",
        )


class UserWebsiteSerializer(serializers.ModelSerializer):
    """Serializer for UserWebsite"""

    def validate_site_type(self, value):
        """
        Validator for site_type

        NOTE: This is a no-op to allow for the calculation of site_type from the given url.
        """
        return value

    def to_internal_value(self, data):
        """
        Overridden deserialization method. In addition to standard deserialization,
        determine the site_type from the url and add it to the deserialized data
        """
        deserialized = super().to_internal_value(data)
        return {
            **deserialized,
            "site_type": get_site_type_from_url(deserialized.get("url")),
        }

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

        return instance

    class Meta:
        model = User
        fields = ("id", "username", "profile", "email", "uid")
        read_only_fields = ("id", "username")
