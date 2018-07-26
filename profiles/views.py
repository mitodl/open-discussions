"""Views for REST APIs for channels"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated

from cairosvg import svg2png  # pylint:disable=no-name-in-module

from open_discussions.permissions import JwtIsStaffPermission
from profiles.models import Profile
from profiles.permissions import HasEditPermission
from profiles.serializers import UserSerializer, ProfileSerializer
from profiles.utils import get_svg_avatar


class UserViewSet(viewsets.ModelViewSet):
    """View for users"""
    permission_classes = (IsAuthenticated, JwtIsStaffPermission,)

    serializer_class = UserSerializer
    queryset = get_user_model().objects.all()
    lookup_field = 'username'


class ProfileViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """View for profile"""
    permission_classes = (IsAuthenticated, HasEditPermission)

    serializer_class = ProfileSerializer
    queryset = Profile.objects.all()
    lookup_field = 'user__username'


def initialized_avatar(request, username, size, color, bgcolor):  # pylint:disable=unused-argument
    """ View for initial avatar """
    user = get_object_or_404(User, username=username)
    svg = get_svg_avatar(user.profile.name, int(size), color, bgcolor)
    return HttpResponse(svg2png(bytestring=svg), content_type="image/png")
