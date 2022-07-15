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
from channels.models import Comment
from channels.proxies import proxy_posts
from channels.serializers.posts import BasePostSerializer
from channels.serializers.comments import BaseCommentSerializer
from channels.utils import (
    get_pagination_and_reddit_obj_list,
    get_listing_params,
    translate_praw_exceptions,
)


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
            "channel_api": self.request.channel_api,
            "current_user": self.request.user,
            "request": self.request,
            "view": self,
        }

    def get(self, request, *args, **kwargs):
        # pylint:disable=too-many-locals
        """View method for HTTP GET request"""
        with translate_praw_exceptions(request.user):
            api = self.request.channel_api
            profile_username = self.kwargs["username"]
            profile_user = User.objects.get(username=profile_username)
            object_type = self.kwargs["object_type"]
            listing_params = get_listing_params(self.request)

            if object_type == "posts":
                serializer_cls = BasePostSerializer
                listing_getter = api.list_user_posts
            else:
                serializer_cls = BaseCommentSerializer
                listing_getter = api.list_user_comments

            object_listing = listing_getter(profile_username, listing_params)
            pagination, user_objects = get_pagination_and_reddit_obj_list(
                object_listing, listing_params
            )

            if object_type == "posts":
                user_objects = proxy_posts(user_objects)
                user_objects = list(
                    filter(lambda object: not object.removed, user_objects)
                )
            else:
                spam_comments = Comment.objects.filter(
                    comment_id__in=[object.id for object in user_objects], removed=True
                ).values_list("comment_id", flat=True)

                user_objects = list(
                    filter(lambda object: object.id not in spam_comments, user_objects)
                )

            return Response(
                {
                    object_type: serializer_cls(
                        user_objects,
                        many=True,
                        context={
                            **self.get_serializer_context(),
                            "users": {profile_username: profile_user},
                        },
                    ).data,
                    "pagination": pagination,
                }
            )
