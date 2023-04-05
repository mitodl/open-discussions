"""Course Catalog Filters for API"""
from django_filters import ChoiceFilter, FilterSet

from course_catalog.constants import OfferedBy
from course_catalog.models import PROFESSIONAL_COURSE_PLATFORMS, Course

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

    class Meta:
        model = Course
        fields = ["audience", "offered_by"]

    def filter_offered_by(self, queryset, _, value):
        """OfferedBy Filter for courses"""
        return queryset.filter(offered_by__name=value)

    def filter_audience(self, queryset, _, value):
        """Audience filter for courses"""
        if value == "professional":
            queryset = queryset.filter(platform__in=PROFESSIONAL_COURSE_PLATFORMS)
        else:
            queryset = queryset.exclude(platform__in=PROFESSIONAL_COURSE_PLATFORMS)
        return queryset
