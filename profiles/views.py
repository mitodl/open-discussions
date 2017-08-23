"""Views for REST APIs for channels"""

from django.contrib.auth import get_user_model

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from open_discussions.permissions import JwtIsStaffPermission
from profiles.serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    """View for users"""
    permission_classes = (IsAuthenticated, JwtIsStaffPermission,)

    serializer_class = UserSerializer
    queryset = get_user_model().objects.all()
    lookup_field = 'username'
