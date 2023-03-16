"""Course Catalog Filters for API"""
from django.db.models import Max
from django_filters import AllValuesFilter, ChoiceFilter, FilterSet

from course_catalog.models import (
    Course,
    PROFESSIONAL_COURSE_PLATFORMS,
)


class CourseFilter(FilterSet):
    """Course filter"""

    audience = ChoiceFilter(
        label="Audience",
        method="filter_audience",
        field_name="platform",
        lookup_expr="in",
        choices=(("professional", "professional"), ("open", "open")),
    )
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

    def filter_certificate(self, queryset, _, value):
        if value:
            qs1 = (
                queryset.filter(
                    runs__availability__in=["Current", "Upcoming", "Starting Soon"]
                )
                .filter(platform="mtx")
                .annotate(max_start_date=Max("runs__start_date"))
            )
            qs2 = queryset.filter(platform__in=PROFESSIONAL_COURSE_PLATFORMS).annotate(
                max_start_date=Max("runs__start_date")
            )
            queryset = qs1.union(qs2)
        else:
            qs1 = (
                queryset.filter(
                    runs__availability__not_in=["Current", "Upcoming", "Starting Soon"]
                )
                .filter(platform="mtx")
                .annotate(max_start_date=Max("runs__start_date"))
            )
            qs2 = queryset.filter(platform__in=PROFESSIONAL_COURSE_PLATFORMS).annotate(
                max_start_date=Max("runs__start_date")
            )
            queryset = qs1.union(qs2)
        return queryset
