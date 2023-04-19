"""Course Catalog Filters for API"""
from django_filters import ChoiceFilter, FilterSet
from drf_spectacular.plumbing import build_choice_description_list
from drf_spectacular.utils import extend_schema_field

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
    offered_by = extend_schema_field(
        {
            "type": "string",
            "enum": [x for x, _ in OFFERED_BY_CHOICES],
            "description": f"offered_by \n {build_choice_description_list(OFFERED_BY_CHOICES)}",
        }
    )(
        ChoiceFilter(
            method="filter_offered_by",
            choices=OFFERED_BY_CHOICES,
            field_name="offered_by",
        )
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
