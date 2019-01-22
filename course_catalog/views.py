"""
course_catalog views
"""
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.pagination import LimitOffsetPagination

from course_catalog.models import Course
from course_catalog.serializers import CourseSerializer

# pylint:disable=unused-argument


class CoursePagination(LimitOffsetPagination):
    """
    Pagination class for CourseViewSet which gets default_limit and max_limit from settings
    """

    default_limit = settings.COURSE_API_DEFAULT_LIMIT
    max_limit = settings.COURSE_API_MAX_LIMIT


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for Courses
    """

    queryset = Course.objects.all().prefetch_related("topics", "instructors", "prices")
    serializer_class = CourseSerializer
    pagination_class = CoursePagination

    @action(methods=["GET"], detail=False)
    def new(self, request):
        """
        Get new courses
        """
        page = self.paginate_queryset(self.queryset.order_by("-created_on"))
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(methods=["GET"], detail=False)
    def upcoming(self, request):
        """
        Get upcoming courses
        """
        page = self.paginate_queryset(
            self.queryset.filter(start_date__gt=timezone.now()).order_by("start_date")
        )
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(methods=["GET"], detail=False)
    def featured(self, request):
        """
        Get featured courses
        """
        page = self.paginate_queryset(self.queryset.filter(featured=True))
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
