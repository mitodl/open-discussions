"""Course Catalog Filters for API"""
from django_filters import ChoiceFilter, FilterSet

from course_catalog.constants import OfferedBy, AvailabilityType
from course_catalog.models import (
    Course,
    PROFESSIONAL_COURSE_PLATFORMS,
)

OFFERED_BY_CHOICES = tuple([(ob.value, ob.value) for ob in OfferedBy])


class CourseFilter(FilterSet):
    """Course filter"""

    audience = ChoiceFilter(
        label="Audience",
        method="filter_audience",
        field_name="platform",
        lookup_expr="in",
        choices=(("professional", "professional"), ("open", "open")),
    )
    offered_by = ChoiceFilter(
        method="filter_offered_by", choices=OFFERED_BY_CHOICES, field_name="offered_by"
    )
    availability = ChoiceFilter(
        method="filter_availability", field_name="availability", choices=((AvailabilityType.upcoming.value,
                                                                           AvailabilityType.upcoming.value),)
    )

    class Meta:
        model = Course
        fields = ["audience", "offered_by", "availability"]

    def filter_offered_by(self, queryset, _, value):
        """OfferedBy Filter for courses"""
        return queryset.filter(offered_by__name=value)

    def filter_audience(self, queryset, _, value):
        """Audience filter for course"""
        if value == "professional":
            queryset = queryset.filter(platform__in=PROFESSIONAL_COURSE_PLATFORMS)
        else:
            queryset = queryset.exclude(platform__in=PROFESSIONAL_COURSE_PLATFORMS)
        return queryset

    def filter_availability(self, queryset, _, value):
        """Availability filter for courses"""
        return queryset.filter(runs__availability=value)
