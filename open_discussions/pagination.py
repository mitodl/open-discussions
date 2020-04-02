"""DRF pagination"""
from rest_framework.pagination import LimitOffsetPagination


class DefaultPagination(LimitOffsetPagination):
    """
    Pagination class for viewsets which gets default_limit and max_limit from settings
    """

    default_limit = 10
    max_limit = 100
