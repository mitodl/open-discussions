"""
Serializers for profile REST APIs
"""
from django.contrib.auth import get_user_model
from django.db import transaction

import ulid
from rest_framework import serializers

from channels.api import get_or_create_user
from profiles.models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for Profile"""
    class Meta:
        model = Profile
        fields = ('name', 'image', 'image_small', 'image_medium')


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User"""
    # username cannot be set but a default is generated on create using ulid.new
    username = serializers.CharField(
        read_only=True,
        default=serializers.CreateOnlyDefault(ulid.new)
    )
    profile = ProfileSerializer()

    def create(self, validated_data):
        profile_data = validated_data.pop('profile') or {}
        with transaction.atomic():
            user = get_user_model().objects.create(**validated_data)
            Profile.objects.create(user=user, **profile_data)

        get_or_create_user(user.username)
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)

        if profile_data:
            profile = instance.profile
            profile.name = profile_data.get('name', profile.name)
            profile.image = profile_data.get('image', profile.image)
            profile.image_small = profile_data.get('image_small', profile.image_small)
            profile.image_medium = profile_data.get('image_medium', profile.image_medium)
            profile.save()

        return instance

    class Meta:
        model = get_user_model()
        fields = ('id', 'username', 'profile')
        read_only_fields = ('id',)
