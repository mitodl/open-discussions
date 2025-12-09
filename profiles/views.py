"""Views for REST APIs for channels"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.shortcuts import redirect
from django.views.decorators.cache import cache_page

from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from cairosvg import svg2png  # pylint:disable=no-name-in-module

from open_discussions.permissions import (
    IsStaffPermission,
    AnonymousAccessReadonlyPermission,
)
from profiles.models import Profile, UserWebsite
from profiles.permissions import HasEditPermission, HasSiteEditPermission
from profiles.serializers import (
    UserSerializer,
    ProfileSerializer,
    UserWebsiteSerializer,
)
from profiles.utils import generate_svg_avatar, DEFAULT_PROFILE_IMAGE


class UserViewSet(viewsets.ModelViewSet):
    """View for users"""

    permission_classes = (IsAuthenticated, IsStaffPermission)

    serializer_class = UserSerializer
    queryset = get_user_model().objects.filter(is_active=True)
    lookup_field = "username"


class ProfileViewSet(
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    """View for profile"""

    permission_classes = (AnonymousAccessReadonlyPermission, HasEditPermission)
    serializer_class = ProfileSerializer
    queryset = Profile.objects.prefetch_related("userwebsite_set").filter(
        user__is_active=True
    )
    lookup_field = "user__username"

    def get_serializer_context(self):
        return {"include_user_websites": True}


class UserWebsiteViewSet(
    mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """View for user websites"""

    permission_classes = (IsAuthenticated, HasSiteEditPermission)
    serializer_class = UserWebsiteSerializer
    queryset = UserWebsite.objects.select_related("profile__user")


@cache_page(60 * 60 * 24)
def name_initials_avatar_view(
    request, username, size, color, bgcolor
):  # pylint:disable=unused-argument
    """View for initial avatar"""
    user = User.objects.filter(username=username).first()
    if not user:
        return redirect(DEFAULT_PROFILE_IMAGE)
    svg = generate_svg_avatar(user.profile.name, int(size), color, bgcolor)
    return HttpResponse(svg2png(bytestring=svg), content_type="image/png")


class UserContributionListView(APIView):
    """View that returns user a user's posts or comments depending on the request URL"""

    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            "include_permalink_data": True,
            "current_user": self.request.user,
            "request": self.request,
            "view": self,
        }

    def get(self, request, *args, **kwargs):
        """
        View method for HTTP GET request (deprecated - discussions removed)
        Returns empty list as posts/comments no longer exist
        """
        object_type = self.kwargs["object_type"]
        
        return Response(
            {
                object_type: [],
                "pagination": {"after": None, "before": None},
            }
        )
