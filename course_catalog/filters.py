"""Course Catalog Filters for API"""
from django_filters import AllValuesFilter, Filter, FilterSet

from course_catalog.models import (
    Course,
    PROFESSIONAL_COURSE_PLATFORMS,
)


class CourseFilter(FilterSet):
    """Course filter"""

    audience = Filter(method="filter_audience", field_name="platform", lookup_expr="in")
    platform = AllValuesFilter()

    class Meta:
        model = Course
        fields = ["audience", "platform"]

    def filter_audience(self, queryset, _, value):
        """Audience filter for courses"""
        if value == "professional":
            queryset = queryset.filter(platform__in=PROFESSIONAL_COURSE_PLATFORMS)
        else:
            queryset = queryset.exclude(platform__in=PROFESSIONAL_COURSE_PLATFORMS)
        return queryset
