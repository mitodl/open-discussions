"""Course Catalog Filters for API"""
from django_filters import BooleanFilter, ChoiceFilter, FilterSet
from django.db.models import Q

from course_catalog.constants import AvailabilityType, OfferedBy, PlatformType
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
    withcertificate = BooleanFilter(
        method="filter_withcertificate", field_name="withcertificate"
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

    def filter_withcertificate(self, queryset, _, value):
        """Certificate filter for courses"""
        if value == "":
            return queryset
        else:
            professional_queryset = queryset.filter(platform__in=PROFESSIONAL_COURSE_PLATFORMS)
            mitx_queryset = queryset.filter(platform__in=[PlatformType.mitx.value,
                                                          PlatformType.mitxonline.value]).exclude(
                runs__availability=AvailabilityType.archived.value)
            withcertificate_queryset = professional_queryset.union(mitx_queryset)
            if value:
                return withcertificate_queryset
            else:
                return queryset.difference(withcertificate_queryset)
