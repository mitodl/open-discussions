"""Views for REST APIs for channels"""

from django.contrib.auth import get_user_model

from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated

from open_discussions.permissions import JwtIsStaffPermission
from profiles.models import Profile
from profiles.permissions import HasEditPermission
from profiles.serializers import UserSerializer, ProfileSerializer


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
