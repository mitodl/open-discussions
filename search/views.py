"""View for search"""
import logging

from elasticsearch.exceptions import TransportError
from rest_framework.response import Response
from rest_framework.status import HTTP_405_METHOD_NOT_ALLOWED
from rest_framework.views import APIView

from open_discussions import features
from search.api import execute_search


log = logging.getLogger(__name__)


class SearchView(APIView):
    """
    View for executing searches
    """

    permission_classes = ()

    def post(self, request, *args, **kwargs):
        """Execute a search. Despite being POST this should not modify any data."""

        if not features.is_enabled(features.SEARCH_UI):
            return Response(status=HTTP_405_METHOD_NOT_ALLOWED)

        try:
            response = execute_search(user=request.user, query=request.data)
        except TransportError as ex:
            if 400 <= ex.status_code < 500:
                log.exception("Received a 4xx error from Elasticsearch")
                return Response(status=ex.status_code)
            else:
                raise
        return Response([hit["_source"] for hit in response["hits"]["hits"]])
