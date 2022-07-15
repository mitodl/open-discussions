"""Base serializers"""
from django.contrib.auth import get_user_model

from rest_framework import serializers

from profiles.models import Profile

User = get_user_model()


class RedditObjectSerializer(serializers.Serializer):
    """Serializer class for reddit objects (posts, comments)"""

    def _get_user(self, instance):
        """
        Look up user in the context from the post author

        Args:
            instance (praw.models.Submission):
                The post to look up the user for
        """
        if instance.author is None:
            return None
        if "users" in self.context:
            return self.context["users"].get(instance.author.name)
        else:
            return (
                User.objects.filter(username=instance.author.name)
                .select_related("profile")
                .first()
            )

    def _get_profile(self, instance):
        """Return a user profile if it exists, else None
        Args:
            instance (praw.models.Submission):
                The post to look up the user for

        Returns:
            profiles.models.Profile: the user profile if it exists
        """
        try:
            return self._get_user(instance).profile
        except (AttributeError, Profile.DoesNotExist):
            return None
