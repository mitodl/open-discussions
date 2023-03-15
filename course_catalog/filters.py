"""Course Catalog Filters"""
import django_filters

from course_catalog.models import Course


class CourseFilter(django_filters.FilterSet):
    """Course filter"""

    upcoming = django_filters.DateFilter(field_name="start_date", lookup_expr="gt")

    certificates = django_filters.Filter(
        field_name="certificates", lookup_expr="icontains"
    )

    # Need to update for audience

    class Meta:
        model = Course
        fields = ["upcoming", "platform", "audience", "certificates"]
