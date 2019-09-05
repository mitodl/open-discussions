""" admin for course catalog """

from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from course_catalog.models import (
    Course,
    Bootcamp,
    Program,
    UserList,
    ProgramItem,
    UserListItem,
    CourseRun,
)


class CourseRunAdmin(admin.ModelAdmin):
    """CourseRun Admin"""

    model = CourseRun

    search_fields = ("course_run_id", "title", "course__course_id")
    list_display = ("course_run_id", "title", "best_start_date", "best_end_date")
    list_filter = ("semester", "year")


class CourseRunInline(GenericTabularInline):
    """Inline list items for course runs"""

    model = CourseRun
    extra = 0
    show_change_link = True
    fields = (
        "course_run_id",
        "best_start_date",
        "best_end_date",
        "enrollment_start",
        "enrollment_end",
        "start_date",
        "end_date",
        "semester",
        "year",
    )

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request, obj=None):
        return False


class CourseAdmin(admin.ModelAdmin):
    """Course Admin"""

    model = Course
    search_fields = ("course_id", "title")
    list_display = ("course_id", "title", "platform")
    list_filter = ("platform",)
    inlines = [CourseRunInline]


class BootcampAdmin(admin.ModelAdmin):
    """Bootcamp Admin"""

    model = Bootcamp
    search_fields = ("course_id", "title")
    list_display = ("course_id", "title")
    inlines = [CourseRunInline]


class UserListItemInline(admin.StackedInline):
    """Inline list items for user lists"""

    model = UserListItem
    classes = ["collapse"]

    def has_delete_permission(self, request, obj=None):
        return True


class ProgramItemInline(admin.StackedInline):
    """Inline list items for programs"""

    model = ProgramItem
    classes = ["collapse"]

    def has_delete_permission(self, request, obj=None):
        return True


class ProgramAdmin(admin.ModelAdmin):
    """Program Admin"""

    model = Program
    list_filter = ("offered_by",)
    list_display = ("title", "short_description", "offered_by")
    search_fields = ("title", "short_description")
    inlines = [ProgramItemInline]


class UserListAdmin(admin.ModelAdmin):
    """UserList Admin"""

    model = UserList
    list_filter = ("privacy_level", "list_type")
    list_display = ("title", "short_description", "author", "privacy_level")
    search_fields = ("title", "short_description", "author__username", "author__email")
    inlines = [UserListItemInline]


admin.site.register(Course, CourseAdmin)
admin.site.register(CourseRun, CourseRunAdmin)
admin.site.register(Bootcamp, BootcampAdmin)
admin.site.register(Program, ProgramAdmin)
admin.site.register(UserList, UserListAdmin)
