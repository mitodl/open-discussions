""" admin for course catalog """

from django.contrib import admin

from course_catalog.models import (
    Course,
    Bootcamp,
    Program,
    UserList,
    ProgramItem,
    UserListItem,
)


class CourseAdmin(admin.ModelAdmin):
    """Course Admin"""

    model = Course
    search_fields = ("course_id", "title")


class BootcampAdmin(admin.ModelAdmin):
    """Bootcamp Admin"""

    model = Bootcamp
    search_fields = ("course_id", "title")


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
    inlines = [ProgramItemInline]


class UserListAdmin(admin.ModelAdmin):
    """UserList Admin"""

    model = UserList
    inlines = [UserListItemInline]


admin.site.register(Course, CourseAdmin)
admin.site.register(Bootcamp, BootcampAdmin)
admin.site.register(Program, ProgramAdmin)
admin.site.register(UserList, UserListAdmin)
