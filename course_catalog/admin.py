""" admin for course catalog """

from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from course_catalog.models import (
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    Enrollment,
    LearningResourceRun,
    Podcast,
    PodcastEpisode,
    Program,
    ProgramItem,
    StaffList,
    StaffListItem,
    UserList,
    UserListItem,
)


class CourseInstructorAdmin(admin.ModelAdmin):
    """Instructor Admin"""

    model = CourseInstructor
    search_fields = ("full_name", "first_name", "last_name")


class CoursePriceAdmin(admin.ModelAdmin):
    """Price Admin"""

    model = CoursePrice
    search_fields = ("price",)
    list_filter = ("mode",)


class CourseTopicAdmin(admin.ModelAdmin):
    """Topic Admin"""

    model = CourseTopic
    search_fields = ("name",)


class LearningResourceRunAdmin(admin.ModelAdmin):
    """LearningResourceRun Admin"""

    model = LearningResourceRun

    search_fields = ("run_id", "title", "course__course_id")
    list_display = ("run_id", "title", "best_start_date", "best_end_date")
    list_filter = ("semester", "year")
    exclude = ("course",)
    autocomplete_fields = ("prices", "instructors", "topics")


class LearningResourceRunInline(GenericTabularInline):
    """Inline list items for course runs"""

    model = LearningResourceRun
    extra = 0
    show_change_link = True
    fields = (
        "run_id",
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
    inlines = [LearningResourceRunInline]
    autocomplete_fields = ("topics",)


class StaffListItemInline(admin.StackedInline):
    """Inline list items for staff lists"""

    model = StaffListItem
    classes = ["collapse"]

    def has_delete_permission(self, request, obj=None):
        return True


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
    list_display = ("title", "short_description")
    search_fields = ("title", "short_description")
    autocomplete_fields = ("topics",)
    inlines = [ProgramItemInline, LearningResourceRunInline]


class StaffListAdmin(admin.ModelAdmin):
    """StaffList Admin"""

    model = StaffList
    list_filter = ("privacy_level", "list_type")
    list_display = ("title", "short_description", "author", "privacy_level")
    search_fields = ("title", "short_description", "author__username", "author__email")
    inlines = [StaffListItemInline]


class UserListAdmin(admin.ModelAdmin):
    """UserList Admin"""

    model = UserList
    list_filter = ("privacy_level", "list_type")
    list_display = ("title", "short_description", "author", "privacy_level")
    search_fields = ("title", "short_description", "author__username", "author__email")
    inlines = [UserListItemInline]


class PodcastAdmin(admin.ModelAdmin):
    """PodcastAdmin"""

    model = Podcast
    search_fields = ("full_description",)


class PodcastEpisodeAdmin(admin.ModelAdmin):
    """PodcastEpisodeAdmin"""

    model = PodcastEpisode
    search_fields = ("full_description",)


class EnrollmentAdmin(admin.ModelAdmin):
    """Enrollment Admin"""

    def run_id(self, obj):
        """run_id as string"""
        if obj.run:
            return f"{obj.run.run_id}"
        else:
            return ""

    def course_id(self, obj):
        """course_id as string"""
        if obj.course:
            return f"{obj.course.course_id}"
        else:
            return ""

    model = Enrollment
    search_fields = (
        "course__course_id",
        "course__title",
        "enrollments_table_run_id",
        "run__run_id",
        "run__slug",
        "run__title",
        "user__email",
        "user__username",
    )
    list_display = (
        "enrollments_table_run_id",
        "user",
        "enrollment_timestamp",
        "run_id",
        "course_id",
    )
    autocomplete_fields = ("run", "user")


admin.site.register(CourseTopic, CourseTopicAdmin)
admin.site.register(CoursePrice, CoursePriceAdmin)
admin.site.register(CourseInstructor, CourseInstructorAdmin)
admin.site.register(Course, CourseAdmin)
admin.site.register(LearningResourceRun, LearningResourceRunAdmin)
admin.site.register(Program, ProgramAdmin)
admin.site.register(StaffList, StaffListAdmin)
admin.site.register(UserList, UserListAdmin)
admin.site.register(Podcast, PodcastAdmin)
admin.site.register(PodcastEpisode, PodcastEpisodeAdmin)
admin.site.register(Enrollment, EnrollmentAdmin)
