"""Views for REST APIs for comments"""

from django.contrib.auth import get_user_model
from praw.models import MoreComments
from praw.exceptions import PRAWException
from rest_framework import status
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.constants import COMMENTS_SORT_BEST
from channels.serializers import (
    CommentSerializer,
    GenericCommentSerializer,
)
from channels.utils import (
    translate_praw_exceptions,
    lookup_subscriptions_for_comments,
)
from open_discussions.permissions import AnonymousAccessReadonlyPermission

User = get_user_model()


def _populate_authors_for_comments(comments, author_set):
    """
    Helper function to look up user for each instance and attach it to instance.user

    Args:
        comments (list of praw.models.Comment):
            A list of comments
        author_set (set): This is modified to populate with the authors found in comments
    """
    for comment in comments:
        if isinstance(comment, MoreComments):
            continue
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
    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'current_user': self.request.user,
            'request': self.request,
            'view': self,
        }

    def get(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Get list for comments and attach User objects to them"""
        with translate_praw_exceptions(request.user):
            post_id = self.kwargs['post_id']
            api = Api(user=self.request.user)
            sort = request.query_params.get('sort', COMMENTS_SORT_BEST)
            comments = api.list_comments(post_id, sort).list()
            users = _lookup_users_for_comments(comments)
            subscriptions = lookup_subscriptions_for_comments(comments, self.request.user)

            serialized_comments_list = GenericCommentSerializer(
                comments,
                context={
                    **self.get_serializer_context(),
                    'users': users,
                    'comment_subscriptions': subscriptions,
                },
                many=True,
            ).data

            return Response(serialized_comments_list)

    def post(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Create a new comment"""
        with translate_praw_exceptions(request.user):
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


class MoreCommentsView(APIView):
    """
    View for expanding a MoreComments object
    """
    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'current_user': self.request.user,
            'request': self.request,
            'view': self,
        }

    def get(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Get list for comments and attach User objects to them"""
        with translate_praw_exceptions(request.user):
            children = request.query_params.getlist('children')
            sort = request.query_params.get('sort', COMMENTS_SORT_BEST)

            # validate the request parameters: each are required
            try:
                post_id = request.query_params['post_id']
            except KeyError:
                raise ValidationError("Missing parameter post_id")

            parent_id = request.query_params.get('parent_id')

            api = Api(user=self.request.user)
            comments = api.more_comments(parent_id, post_id, children, sort)

            users = _lookup_users_for_comments(comments)
            subscriptions = lookup_subscriptions_for_comments(comments, self.request.user)

            serialized_comments_list = GenericCommentSerializer(
                comments,
                context={
                    **self.get_serializer_context(),
                    'users': users,
                    'comment_subscriptions': subscriptions,
                },
                many=True,
            ).data

            return Response(serialized_comments_list)


class CommentDetailView(APIView):
    """
    View for updating or destroying comments
    """
    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'current_user': self.request.user,
            'request': self.request,
            'view': self,
        }

    def get_object(self):
        """Get the comment object"""
        api = Api(user=self.request.user)
        return api.get_comment(self.kwargs['comment_id'])

    def get(self, request, *args, **kwargs):
        """GET a single comment and it's children"""
        with translate_praw_exceptions(request.user):
            comment = self.get_object()

            # comment.refresh() raises if the comment
            # isn't found
            try:
                comment.refresh()
            except PRAWException:
                raise NotFound()

            users = _lookup_users_for_comments([comment])
            subscriptions = lookup_subscriptions_for_comments([comment], self.request.user)
            serialized_comment_tree = GenericCommentSerializer(
                [comment] + comment.replies.list(),
                context={
                    **self.get_serializer_context(),
                    'users': users,
                    'comment_subscriptions': subscriptions,
                },
                many=True
            ).data
            return Response(serialized_comment_tree)

    def patch(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Update a comment"""
        with translate_praw_exceptions(request.user):
            comment = self.get_object()
            subscriptions = lookup_subscriptions_for_comments([comment], self.request.user)
            serializer = CommentSerializer(
                instance=comment,
                data=request.data,
                context={
                    **self.get_serializer_context(),
                    'comment_subscriptions': subscriptions,
                },
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
