"""Interactions views"""
from django.db.models import Count
from rest_framework import mixins, viewsets
from rest_framework.pagination import LimitOffsetPagination

from interactions.models import ContentTypeInteraction
from interactions.serializers import (
    ContentTypeInteractionSerializer,
    PopularContentSerializer,
)


class DefaultPagination(LimitOffsetPagination):
    """Pagination class for interaction viewsets which gets default_limit and max_limit from settings"""

    default_limit = 10
    max_limit = 100


class ContentTypeInteractionViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Viewset for content type interactions"""

    queryset = ContentTypeInteraction.objects.all()
    serializer_class = ContentTypeInteractionSerializer
    permission_classes = ()


class PopularContentViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """ViewSet that returns popular content based on interactions"""

    queryset = (
        ContentTypeInteraction.objects.values("content_type_id", "content_id")
        .annotate(num_views=Count("content_id"))
        .order_by("-num_views")
    )
    serializer_class = PopularContentSerializer
    pagination_class = DefaultPagination
    permission_classes = ()
