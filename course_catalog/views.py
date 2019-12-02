"""
course_catalog views
"""
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError
from django.db.models import Prefetch, OuterRef, Exists
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response

from course_catalog.constants import ResourceType, PlatformType
from course_catalog.models import (
    Course,
    UserList,
    Program,
    Bootcamp,
    FavoriteItem,
    LearningResourceRun,
    Video,
    CourseTopic,
)
from course_catalog.permissions import HasUserListPermissions
from course_catalog.serializers import (
    CourseSerializer,
    UserListSerializer,
    ProgramSerializer,
    BootcampSerializer,
    FavoriteItemSerializer,
    VideoSerializer,
    CourseTopicSerializer,
)
from open_discussions.permissions import AnonymousAccessReadonlyPermission

# pylint:disable=unused-argument
from search.task_helpers import delete_user_list


@api_view(["GET"])
def ocw_course_report(request):
    """
    Returns a JSON object reporting OCW course sync statistics
    """
    ocw_courses = Course.objects.filter(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
    )
    published_ocw_courses_with_image = ocw_courses.filter(
        published=True, image_src__isnull=False
    ).count()
    unpublished_ocw_courses = ocw_courses.filter(published=False).count()
    ocw_courses_without_image = ocw_courses.filter(image_src="").count()
    ocw_resources = Course.objects.filter(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.ocw_resource.value,
    ).count()
    return Response(
        {
            "total_number_of_ocw_courses": ocw_courses.count(),
            "published_ocw_courses_with_image": published_ocw_courses_with_image,
            "unpublished_ocw_courses": unpublished_ocw_courses,
            "ocw_courses_without_image": ocw_courses_without_image,
            "ocw_resources": ocw_resources,
        }
    )


class DefaultPagination(LimitOffsetPagination):
    """
    Pagination class for course_catalog viewsets which gets default_limit and max_limit from settings
    """

    default_limit = settings.COURSE_API_DEFAULT_LIMIT
    max_limit = settings.COURSE_API_MAX_LIMIT


class FavoriteViewMixin:
    """
    Mixin for viewsets with models that can be favorited
    """

    @action(methods=["POST"], detail=True)
    def favorite(self, request, pk=None):
        """
        Create a favorite item for this object
        """
        obj = self.get_object()
        try:
            FavoriteItem.objects.create(user=request.user, item=obj)
        except IntegrityError:
            pass
        return Response(status=status.HTTP_200_OK)

    @action(methods=["POST"], detail=True)
    def unfavorite(self, request, pk=None):
        """
        Delete a favorite item for this object
        """
        obj = self.get_object()
        favorite_item = FavoriteItem.objects.filter(
            user=request.user,
            object_id=obj.id,
            content_type=ContentType.objects.get_for_model(obj),
        )
        favorite_item.delete()
        return Response(status=status.HTTP_200_OK)


class CourseViewSet(viewsets.ReadOnlyModelViewSet, FavoriteViewMixin):
    """
    Viewset for Courses
    """

    serializer_class = CourseSerializer
    pagination_class = DefaultPagination
    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_queryset(self):
        """Generate a QuerySet for fetching valid courses"""
        return (
            Course.objects.annotate(
                has_runs=Exists(
                    LearningResourceRun.objects.filter(
                        content_type=ContentType.objects.get_for_model(Course),
                        object_id=OuterRef("pk"),
                        published=True,
                    )
                )
            )
            .filter(has_runs=True, published=True)
            .prefetch_related(
                "topics",
                Prefetch(
                    "runs",
                    queryset=LearningResourceRun.objects.prefetch_related(
                        "topics", "prices", "instructors"
                    )
                    .filter(published=True)
                    .order_by("-best_start_date"),
                ),
            )
        )

    @action(methods=["GET"], detail=False)
    def new(self, request):
        """
        Get new courses
        """
        page = self.paginate_queryset(self.get_queryset().order_by("-created_on"))
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(methods=["GET"], detail=False)
    def upcoming(self, request):
        """
        Get upcoming courses
        """
        page = self.paginate_queryset(
            self.get_queryset()
            .filter(runs__start_date__gt=timezone.now())
            .order_by("runs__start_date")
        )
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(methods=["GET"], detail=False)
    def featured(self, request):
        """
        Get featured courses
        """
        page = self.paginate_queryset(self.get_queryset().filter(featured=True))
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class BootcampViewSet(viewsets.ReadOnlyModelViewSet, FavoriteViewMixin):
    """
    Viewset for Bootcamps
    """

    queryset = Bootcamp.objects.prefetch_related(
        "topics",
        Prefetch(
            "runs",
            queryset=LearningResourceRun.objects.prefetch_related(
                "topics", "prices", "instructors"
            ).order_by("-best_start_date"),
        ),
    )
    serializer_class = BootcampSerializer
    pagination_class = DefaultPagination
    permission_classes = (AnonymousAccessReadonlyPermission,)


class LargePagination(LimitOffsetPagination):
    """
    Pagination class for list views for when we have to
    fetch all the results on the frontend :/
    """

    default_limit = 1000
    max_limit = 1000


class UserListViewSet(viewsets.ModelViewSet, FavoriteViewMixin):
    """
    Viewset for User Lists & Learning Paths
    """

    queryset = UserList.objects.prefetch_related("author", "topics", "offered_by")
    serializer_class = UserListSerializer
    pagination_class = LargePagination
    permission_classes = (HasUserListPermissions,)

    def list(self, request, *args, **kwargs):
        """Override default list to only get lists authored by user"""
        if request.user and not request.user.is_anonymous:
            queryset = self.queryset.filter(author=request.user)
        else:
            queryset = UserList.objects.none()

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        delete_user_list(instance)
        instance.delete()


class ProgramViewSet(viewsets.ReadOnlyModelViewSet, FavoriteViewMixin):
    """
    Viewset for Programs
    """

    queryset = Program.objects.all().prefetch_related("items")
    serializer_class = ProgramSerializer
    pagination_class = DefaultPagination
    permission_classes = (AnonymousAccessReadonlyPermission,)


class VideoViewSet(viewsets.ReadOnlyModelViewSet, FavoriteViewMixin):
    """
    Viewset for Videos
    """

    queryset = Video.objects.all().prefetch_related("topics", "offered_by")
    serializer_class = VideoSerializer
    pagination_class = DefaultPagination
    permission_classes = (AnonymousAccessReadonlyPermission,)

    @action(methods=["GET"], detail=False)
    def new(self, request):
        """
        Get newly published videos
        """
        page = self.paginate_queryset(
            self.queryset.filter(published=True).order_by("-last_modified")
        )
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class FavoriteItemViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for favorites
    """

    serializer_class = FavoriteItemSerializer
    pagination_class = LargePagination

    def get_queryset(self):
        return FavoriteItem.objects.select_related("content_type").filter(
            user=self.request.user
        )


class TopicViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for topics
    """

    queryset = CourseTopic.objects.all()
    serializer_class = CourseTopicSerializer
    pagination_class = LargePagination
    permission_classes = (AnonymousAccessReadonlyPermission,)
