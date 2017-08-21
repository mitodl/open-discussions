"""Views for REST APIs for channels"""

from django.contrib.auth import get_user_model

from rest_framework import viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from profiles.serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    """View for users"""
    authentication_classes = (TokenAuthentication,)
    permission_classes = (IsAuthenticated, IsAdminUser,)

    serializer_class = UserSerializer
    queryset = get_user_model().objects.all()
    lookup_field = 'username'
