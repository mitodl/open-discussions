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
    LearningResourceRun,
    CoursePrice,
    CourseInstructor,
    CourseTopic,
    Podcast,
    PodcastEpisode,
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


class BootcampAdmin(admin.ModelAdmin):
    """Bootcamp Admin"""

    model = Bootcamp
    search_fields = ("course_id", "title")
    list_display = ("course_id", "title")
    autocomplete_fields = ("topics",)
    inlines = [LearningResourceRunInline]


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


admin.site.register(CourseTopic, CourseTopicAdmin)
admin.site.register(CoursePrice, CoursePriceAdmin)
admin.site.register(CourseInstructor, CourseInstructorAdmin)
admin.site.register(Course, CourseAdmin)
admin.site.register(LearningResourceRun, LearningResourceRunAdmin)
admin.site.register(Bootcamp, BootcampAdmin)
admin.site.register(Program, ProgramAdmin)
admin.site.register(UserList, UserListAdmin)
admin.site.register(Podcast, PodcastAdmin)
admin.site.register(PodcastEpisode, PodcastEpisodeAdmin)
