"""Course Catalog Filters for API"""
from django.db.models import Max
from django_filters import BooleanFilter, ChoiceFilter, FilterSet

from course_catalog.constants import OfferedBy
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
    certificated = BooleanFilter(method="filter_certificated", field_name="certificated")

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

    def filter_certificated(self, queryset, _, value):
        """Certificate filter for courses"""
        if value == "":
            return queryset
        else:
            qs1 = queryset.filter(runs__availability__in=["Current", "Upcoming", "Starting Soon"],
                                  platform='mtx').annotate(max_start_date=Max('runs__start_date'))
            qs2 = queryset.filter(runs__availability__in=["Current", "Upcoming", "Starting Soon"],
                                  platform__in=PROFESSIONAL_COURSE_PLATFORMS).annotate(
                max_start_date=Max('runs__start_date'))
            union_queryset = qs1.union(qs2).order_by('-max_start_date')
            if value:
                return union_queryset
            else:
                return queryset.difference(union_queryset)
