"""User tracking middleware"""
from django.conf import settings
import jwt
from rest_framework_jwt.settings import api_settings

from profiles.models import Profile
from open_discussions.utils import now_in_utc


class UserActivityMiddleware:
    """Track user activity"""

    def __init__(self, get_response):
        """One-time configuration"""
        self.get_response = get_response
        self.jwt_decode_handler = api_settings.JWT_DECODE_HANDLER
        self.jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER

    def _track_activity(self, request):
        """
        Updates activity date on the user record

        Args:
            request (django.http.request.Request): the request to inspect

        Returns:
            bool: True if the activity was tracked
        """
        try:
            payload = self.jwt_decode_handler(request.COOKIES.get(settings.OPEN_DISCUSSIONS_COOKIE_NAME, None))
        except jwt.InvalidTokenError:
            return None

        if not payload:
            return None

        if not payload.get('tracked', False) and 'username' in payload:
            Profile.objects.filter(user__username=payload['username']).update(last_active_on=now_in_utc())
            payload['tracked'] = True
            return payload
        return None

    def __call__(self, request):
        """
        Processes an individual request for the feature flag cookie

        Args:
            request (django.http.request.Request): the request to inspect
        """
        payload = self._track_activity(request)

        response = self.get_response(request)

        if payload is not None:
            response.set_cookie(
                settings.OPEN_DISCUSSIONS_COOKIE_NAME,
                self.jwt_encode_handler(payload),
                domain=settings.OPEN_DISCUSSIONS_COOKIE_DOMAIN,
                httponly=True,
            )

        return response
