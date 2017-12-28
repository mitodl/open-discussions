"""Views for REST API for frontpage"""
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.serializers import PostSerializer
from channels.utils import (
    get_pagination_and_posts,
    get_pagination_params,
    lookup_users_for_posts,
)


class FrontPageView(APIView):
    """
    View for listing posts for frontpage
    """

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'request': self.request,
            'view': self,
        }

    def get(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Get front page posts"""
        before, after, count = get_pagination_params(self.request)
        api = Api(user=self.request.user)
        paginated_posts = api.front_page(before=before, after=after, count=count)
        pagination, posts = get_pagination_and_posts(paginated_posts, before=before, count=count)
        users = lookup_users_for_posts(posts)
        posts = [post for post in posts if post.author and post.author.name in users]

        return Response({
            'posts': PostSerializer(
                posts,
                context={
                    **self.get_serializer_context(),
                    'users': users,
                },
                many=True,
            ).data,
            'pagination': pagination,
        })
