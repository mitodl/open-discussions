""" admin for course catalog """

from django.contrib import admin

from course_catalog.models import Course


class CourseAdmin(admin.ModelAdmin):
    """CourseAdmin"""

    model = Course
    search_fields = ("course_id", "title")


admin.site.register(Course, CourseAdmin)
