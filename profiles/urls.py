"""URL configurations for profiles"""
from django.conf.urls import url, include

from rest_framework.routers import DefaultRouter

from profiles.views import UserViewSet, ProfileViewSet, initialized_avatar

router = DefaultRouter()
router.register(r'users', UserViewSet, base_name='user_api')
router.register(r'profiles', ProfileViewSet, base_name='profile_api')

urlpatterns = [
    url(r'^api/v0/', include(router.urls)),
    url(r'^profile/(?P<username>[A-Za-z0-9_]+)/(?P<size>\d+)/(?P<color>[A-Za-z0-9]+)/(?P<bgcolor>[A-Za-z0-9]+).png',
        initialized_avatar, name="profile_avatar")
]
