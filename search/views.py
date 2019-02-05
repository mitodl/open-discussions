"""View for search"""
import logging

from elasticsearch.exceptions import TransportError
from rest_framework.response import Response
from rest_framework.status import HTTP_405_METHOD_NOT_ALLOWED
from rest_framework.views import APIView

from open_discussions import features
from search.api import execute_search, find_related_documents


log = logging.getLogger(__name__)


class ESView(APIView):
    """
    Parent class for views that execute ES searches
    """

    def handle_exception(self, exc):
        if isinstance(exc, TransportError):
            if 400 <= exc.status_code < 500:
                log.exception("Received a 4xx error from Elasticsearch")
                return Response(status=exc.status_code)
        raise exc


class SearchView(ESView):
    """
    View for executing searches
    """

    permission_classes = ()

    def post(self, request, *args, **kwargs):
        """Execute a search. Despite being POST this should not modify any data."""
        if not features.is_enabled(features.SEARCH_UI):
            return Response(status=HTTP_405_METHOD_NOT_ALLOWED)
        response = execute_search(user=request.user, query=request.data)
        return Response(response)


class RelatedPostsView(ESView):
    """
    View for retrieving related posts
    """

    permission_classes = ()

    def post(self, request, *args, **kwargs):
        """Execute a related posts search"""
        if not features.is_enabled(features.RELATED_POSTS_UI):
            return Response(status=HTTP_405_METHOD_NOT_ALLOWED)
        response = find_related_documents(
            user=request.user, post_id=self.kwargs["post_id"]
        )
        return Response(response)
