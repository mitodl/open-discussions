"""Views for REST APIs for posts"""

from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.proxies import proxy_posts
from channels.serializers.posts import PostSerializer
from channels.utils import (
    get_pagination_and_reddit_obj_list,
    get_listing_params,
    lookup_users_for_posts,
    lookup_subscriptions_for_posts,
    translate_praw_exceptions,
)
from open_discussions.permissions import AnonymousAccessReadonlyPermission


class PostListView(APIView):
    """
    View for listing and creating posts
    """

    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            "channel_api": self.request.channel_api,
            "current_user": self.request.user,
            "request": self.request,
            "view": self,
        }

    def get(self, request, *args, **kwargs):
        """Get list for posts and attach User objects to them"""
        with translate_praw_exceptions(request.user):
            listing_params = get_listing_params(self.request)
            api = Api(user=request.user)
            paginated_posts = api.list_posts(
                self.kwargs["channel_name"], listing_params
            )
            pagination, posts = get_pagination_and_reddit_obj_list(
                paginated_posts, listing_params
            )
            users = lookup_users_for_posts(posts)
            posts = proxy_posts(
                [
                    post
                    for post in posts
                    if post.author and post.author.username in users
                ]
            )
            subscriptions = lookup_subscriptions_for_posts(posts, request.user)

            return Response(
                {
                    "posts": PostSerializer(
                        posts,
                        many=True,
                        context={
                            **self.get_serializer_context(),
                            "users": users,
                            "post_subscriptions": subscriptions,
                        },
                    ).data,
                    "pagination": pagination,
                }
            )

    def post(self, request, *args, **kwargs):
        """Create a new post"""
        with translate_praw_exceptions(request.user):
            serializer = PostSerializer(
                data=request.data, context=self.get_serializer_context()
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostDetailView(APIView):
    """
    View for retrieving, updating or destroying posts
    """

    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            "channel_api": self.request.channel_api,
            "current_user": self.request.user,
            "request": self.request,
            "view": self,
        }

    @property
    def api(self):
        """Returns a Channel API object"""
        return Api(user=self.request.user)

    def get_object(self):
        """Get post"""
        return self.api.get_post(self.kwargs["post_id"])

    def get(self, request, *args, **kwargs):
        """Get post"""
        with translate_praw_exceptions(request.user):
            post = self.get_object()
            if post.removed and (
                request.user.is_anonymous
                or not (self.api.is_moderator(post.channel.name, request.user.username))
            ):
                raise NotFound()

            users = lookup_users_for_posts([post])
            if not post.author or post.author.name not in users:
                raise NotFound()
            subscriptions = lookup_subscriptions_for_posts([post], request.user)
            return Response(
                PostSerializer(
                    instance=post,
                    context={
                        **self.get_serializer_context(),
                        "users": users,
                        "post_subscriptions": subscriptions,
                    },
                ).data
            )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Delete a post"""
        self.api.delete_post(self.kwargs["post_id"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Update a post"""
        with translate_praw_exceptions(request.user):
            post = self.get_object()
            serializer = PostSerializer(
                instance=post,
                data=request.data,
                context=self.get_serializer_context(),
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
