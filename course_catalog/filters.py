"""Course Catalog Filters for API"""
from django_filters import CharFilter, DateTimeFilter, Filter, FilterSet
from django.db.models import Q

from course_catalog.constants import PlatformType
from course_catalog.models import Course, PROFESSIONAL_COURSE_PLATFORMS
from open_discussions.utils import now_in_utc


class CourseFilter(FilterSet):
    """Course filter"""
    upcoming = DateTimeFilter(method="filter_upcoming")
    professional_courses = CharFilter(method="filter_audience")
    certificate = CharFilter(method="filter_certificate")

    class Meta:
        model = Course
        fields = ["upcoming", "platform", "certificate", "professional_courses"]

    def filter_upcoming(self, queryset, value):
        if value:
            queryset = queryset.filter(start_date__gte=now_in_utc)
        else:
            queryset = queryset.filter(start_date__lt=now_in_utc)
        return queryset

    def filter_audience(self, queryset, value):
        if value:
            queryset = queryset.filter(platform__in=PROFESSIONAL_COURSE_PLATFORMS)
        else:
            queryset = queryset.filter(platform__not_in=PROFESSIONAL_COURSE_PLATFORMS)
        return queryset


    def filter_certificate(self, queryset, value):
        if value:
            queryset = queryset.filter(Q(platform__in=PROFESSIONAL_COURSE_PLATFORMS) | Q(platform=
                                                    PlatformType.mitx.value))
        else:
            queryset = queryset.filter(Q(platform__not_in=PROFESSIONAL_COURSE_PLATFORMS) | ~Q(platform=
                                                    PlatformType.mitx.value))
        return queryset
