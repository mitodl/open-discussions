"""Views for REST API for frontpage"""
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
)
from open_discussions.permissions import AnonymousAccessReadonlyPermission


class FrontPageView(APIView):
    """
    View for listing posts for frontpage
    """

    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            "current_user": self.request.user,
            "request": self.request,
            "view": self,
        }

    def get(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Get front page posts"""
        listing_params = get_listing_params(self.request)
        api = Api(user=self.request.user)
        paginated_posts = api.front_page(listing_params)
        pagination, posts = get_pagination_and_reddit_obj_list(
            paginated_posts, listing_params
        )
        users = lookup_users_for_posts(posts)
        posts = proxy_posts(
            [post for post in posts if post.author and post.author.username in users]
        )
        subscriptions = lookup_subscriptions_for_posts(posts, self.request.user)

        return Response(
            {
                "posts": PostSerializer(
                    posts,
                    context={
                        **self.get_serializer_context(),
                        "users": users,
                        "post_subscriptions": subscriptions,
                    },
                    many=True,
                ).data,
                "pagination": pagination,
            }
        )
