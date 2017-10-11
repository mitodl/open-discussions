"""Views for REST APIs for channels"""

from django.contrib.auth import get_user_model
from praw.models.reddit.redditor import Redditor
from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.serializers import (
    ChannelSerializer,
    CommentSerializer,
    ContributorSerializer,
    SubscriberSerializer,
    PostSerializer,
    ModeratorSerializer,
)
from channels.utils import get_pagination_and_posts, get_pagination_params
from open_discussions.permissions import JwtIsStaffOrReadonlyPermission

User = get_user_model()


class ChannelListView(ListCreateAPIView):
    """
    View for listing and creating channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission,)
    serializer_class = ChannelSerializer

    def get_queryset(self):
        """Get generator for channels list"""
        api = Api(user=self.request.user)
        return api.list_channels()


class ChannelDetailView(RetrieveUpdateAPIView):
    """
    View for getting information about or updating a specific channel
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission,)
    serializer_class = ChannelSerializer

    def get_object(self):
        """Get channel referenced by API"""
        api = Api(user=self.request.user)
        return api.get_channel(self.kwargs['channel_name'])


class ModeratorListView(ListCreateAPIView):
    """
    View for listing and adding moderators
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission,)
    serializer_class = ModeratorSerializer

    def get_queryset(self):
        """Get a list of moderators for channel"""
        api = Api(user=self.request.user)
        channel_name = self.kwargs['channel_name']
        return api.list_moderators(channel_name)


class ModeratorDetailView(APIView):
    """
    View to retrieve and remove moderators
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission,)

    def get(self, request, *args, **kwargs):
        """Get moderator for the channel"""
        api = Api(user=request.user)
        moderator_name = self.kwargs['moderator_name']
        channel_name = self.kwargs['channel_name']
        if moderator_name not in api.list_moderators(channel_name):
            raise NotFound('User {} is not a moderator of {}'.format(moderator_name, channel_name))
        return Response(
            ModeratorSerializer(
                Redditor(api.reddit, name=moderator_name)
            ).data
        )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a moderator from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs['channel_name']
        moderator_name = self.kwargs['moderator_name']

        api.remove_moderator(moderator_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)


def _lookup_users_for_posts(posts):
    """
    Helper function to look up user for each instance and attach it to instance.user

    Args:
        posts (list of praw.models.Submission):
            A list of submissions
    """
    users = User.objects.filter(
        username__in=[
            post.author.name for post in posts if post.author
        ]
    ).select_related('profile')
    return {user.username: user for user in users}


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
        before, after, count = get_pagination_params(self.request)
        api = Api(user=request.user)
        paginated_posts = api.list_posts(self.kwargs['channel_name'], before=before, after=after, count=count)
        pagination, posts = get_pagination_and_posts(paginated_posts, before=before, count=count)
        users = _lookup_users_for_posts(posts)
        posts = [post for post in posts if post.author and post.author.name in users]

        return Response({
            'posts': PostSerializer(posts, many=True, context={
                **self.get_serializer_context(),
                'users': users,
            }).data,
            'pagination': pagination,
        })

    def post(self, request, *args, **kwargs):
        """Create a new post"""
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
        post = self.get_object()
        users = _lookup_users_for_posts([post])
        if not post.author or post.author.name not in users:
            raise NotFound()
        return Response(
            PostSerializer(
                instance=post,
                context={
                    **self.get_serializer_context(),
                    'users': users,
                },
            ).data,
        )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Delete a post"""
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Update a post"""
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


def _populate_authors_for_comments(comments, author_set):
    """
    Helper function to look up user for each instance and attach it to instance.user

    Args:
        comments (list of praw.models.Comment):
            A list of comments
        author_set (set): This is modified to populate with the authors found in comments
    """
    for comment in comments:
        if comment.author:
            author_set.add(comment.author.name)

        _populate_authors_for_comments(comment.replies, author_set)


def _lookup_users_for_comments(comments):
    """
    Helper function to look up user for each instance and attach it to instance.user

    Args:
        comments (list of praw.models.Comment):
            A list of comments

    Returns:
        dict: A map of username to User
    """
    author_set = set()
    _populate_authors_for_comments(comments, author_set)

    users = User.objects.filter(username__in=author_set).select_related('profile')
    return {user.username: user for user in users}


class CommentListView(APIView):
    """
    View for listing and creating comments
    """

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'request': self.request,
            'view': self,
        }

    def get(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Get list for comments and attach User objects to them"""
        api = Api(user=self.request.user)
        comment_tree = api.list_comments(self.kwargs['post_id'])

        # Don't resolve any extra comments
        comment_tree.replace_more(limit=0)
        comments = list(comment_tree)

        users = _lookup_users_for_comments(comments)
        return Response(
            CommentSerializer(
                comments,
                context={
                    **self.get_serializer_context(),
                    'users': users,
                },
                many=True,
            ).data,
        )

    def post(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Create a new comment"""
        serializer = CommentSerializer(
            data=request.data,
            context=self.get_serializer_context(),
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class CommentDetailView(APIView):
    """
    View for retrieving, updating or destroying comments
    """

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'request': self.request,
            'view': self,
        }

    def get_object(self):
        """Get the comment object"""
        api = Api(user=self.request.user)
        return api.get_comment(self.kwargs['comment_id'])

    def patch(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Update a comment"""
        comment = self.get_object()
        serializer = CommentSerializer(
            instance=comment,
            data=request.data,
            context=self.get_serializer_context(),
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            serializer.data,
        )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Delete the comment"""
        self.get_object().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FrontPageView(APIView):
    """
    View for listing posts
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
        users = _lookup_users_for_posts(posts)
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


class ContributorListView(ListCreateAPIView):
    """
    View to list and add contributors in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )
    serializer_class = ContributorSerializer

    def get_queryset(self):
        """Get generator for contributors in channel"""
        api = Api(user=self.request.user)
        return api.list_contributors(self.kwargs['channel_name'])


class ContributorDetailView(APIView):
    """
    View to retrieve and remove contributors in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )

    def get(self, request, *args, **kwargs):
        """Get contributor in channel"""
        api = Api(user=request.user)
        contributor_name = self.kwargs['contributor_name']
        channel_name = self.kwargs['channel_name']
        if contributor_name not in api.list_contributors(channel_name):
            raise NotFound('User {} is not a contributor of {}'.format(contributor_name, channel_name))
        return Response(
            ContributorSerializer(
                Redditor(api.reddit, name=contributor_name)
            ).data
        )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a contributor from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs['channel_name']
        contributor_name = self.kwargs['contributor_name']

        api.remove_contributor(contributor_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubscriberListView(CreateAPIView):
    """
    View to add subscribers in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )
    serializer_class = SubscriberSerializer


class SubscriberDetailView(APIView):
    """
    View to retrieve and remove subscribers in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )

    def get(self, request, *args, **kwargs):
        """Get subscriber for the channel"""
        api = Api(user=request.user)
        subscriber_name = self.kwargs['subscriber_name']
        channel_name = self.kwargs['channel_name']
        if not api.is_subscriber(subscriber_name, channel_name):
            raise NotFound('User {} is not a subscriber of {}'.format(subscriber_name, channel_name))
        return Response(
            SubscriberSerializer(
                Redditor(api.reddit, name=subscriber_name)
            ).data
        )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a subscriber from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs['channel_name']
        subscriber_name = self.kwargs['subscriber_name']

        api.remove_subscriber(subscriber_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)
