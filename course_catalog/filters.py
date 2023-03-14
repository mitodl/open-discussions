"""Course Catalog Filters"""
import django_filters
from course_catalog.models import Course


class CourseFilter(django_filters.FilterSet):
    """Course filter"""

    upcoming = django_filters.DateFilter(
        field_name="start_date", lookup_expr="gt"
    )

    certificate = django_filters.Filter(
        field_name="certificates", lookup_expr="icontains"
    )

    class Meta:
        model = Course
        fields = ("upcoming", "platform", "program_type", "certificate")
