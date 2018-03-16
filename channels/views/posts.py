"""Views for REST APIs for posts"""

from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.serializers import PostSerializer
from channels.utils import (
    get_pagination_and_posts,
    get_listing_params,
    lookup_users_for_posts,
    lookup_subscriptions_for_posts,
    translate_praw_exceptions,
)


class PostListView(APIView):
    """
    View for listing and creating posts
    """

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'request': self.request,
            'view': self,
        }

    def get(self, request, *args, **kwargs):
        """Get list for posts and attach User objects to them"""
        with translate_praw_exceptions():
            listing_params = get_listing_params(self.request)
            api = Api(user=request.user)
            paginated_posts = api.list_posts(self.kwargs['channel_name'], listing_params)
            pagination, posts = get_pagination_and_posts(paginated_posts, listing_params)
            users = lookup_users_for_posts(posts)
            posts = [post for post in posts if post.author and post.author.name in users]
            subscriptions = lookup_subscriptions_for_posts(posts, request.user)

            return Response({
                'posts': PostSerializer(posts, many=True, context={
                    **self.get_serializer_context(),
                    'users': users,
                    'post_subscriptions': subscriptions,
                }).data,
                'pagination': pagination,
            })

    def post(self, request, *args, **kwargs):
        """Create a new post"""
        with translate_praw_exceptions():
            serializer = PostSerializer(data=request.data, context=self.get_serializer_context())
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
            )


class PostDetailView(APIView):
    """
    View for retrieving, updating or destroying posts
    """

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'request': self.request,
            'view': self,
        }

    def get_object(self):
        """Get post"""
        api = Api(user=self.request.user)
        return api.get_post(self.kwargs['post_id'])

    def get(self, request, *args, **kwargs):
        """Get post"""
        with translate_praw_exceptions():
            post = self.get_object()
            users = lookup_users_for_posts([post])
            if not post.author or post.author.name not in users:
                raise NotFound()
            subscriptions = lookup_subscriptions_for_posts([post], request.user)
            return Response(
                PostSerializer(
                    instance=post,
                    context={
                        **self.get_serializer_context(),
                        'users': users,
                        'post_subscriptions': subscriptions,
                    },
                ).data,
            )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Delete a post"""
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Update a post"""
        with translate_praw_exceptions():
            post = self.get_object()
            serializer = PostSerializer(
                instance=post,
                data=request.data,
                context=self.get_serializer_context(),
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(
                serializer.data,
            )
