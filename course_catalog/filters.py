"""Course Catalog Filters for API"""
from django_filters import AllValuesFilter, ChoiceFilter, FilterSet

from course_catalog.models import (
    Course,
    PlatformType,
    PROFESSIONAL_COURSE_PLATFORMS,
)


class CourseFilter(FilterSet):
    """Course filter"""

    audience = ChoiceFilter(method="filter_audience", choices=PlatformType)
    platform = AllValuesFilter()

    class Meta:
        model = Course
        fields = ["audience", "platform"]

    def filter_audience(self, queryset, value):
        if value == "professional":
            queryset = queryset.filter(platform__in=PROFESSIONAL_COURSE_PLATFORMS)
        else:
            queryset = queryset.filter(platform__not_in=PROFESSIONAL_COURSE_PLATFORMS)
        return queryset
