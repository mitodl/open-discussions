"""
course_catalog views
"""
import logging
import operator
from hmac import compare_digest

import rapidjson
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError
from django.db.models import Count, Prefetch, Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_extensions.mixins import NestedViewSetMixin

from authentication.decorators import blocked_ip_exempt
from course_catalog.constants import PlatformType, ResourceType, PrivacyLevel
from course_catalog.etl.podcast import generate_aggregate_podcast_rss
from course_catalog.exceptions import WebhookException
from course_catalog.models import (
    Course,
    CourseTopic,
    FavoriteItem,
    LearningResourceOfferor,
    LearningResourceRun,
    Podcast,
    PodcastEpisode,
    Program,
    UserList,
    UserListItem,
    Video,
)
from course_catalog.permissions import (
    HasUserListItemPermissions,
    HasUserListPermissions,
)
from course_catalog.serializers import (
    CourseSerializer,
    CourseTopicSerializer,
    FavoriteItemSerializer,
    PodcastEpisodeSerializer,
    PodcastSerializer,
    ProgramSerializer,
    UserListItemSerializer,
    UserListSerializer,
    VideoSerializer,
)
from course_catalog.tasks import get_ocw_courses, get_ocw_next_courses
from course_catalog.utils import load_course_blocklist
from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    PodcastFeatureFlag,
    ReadOnly,
)

# pylint:disable=unused-argument
from search.task_helpers import delete_course, delete_user_list, upsert_user_list

log = logging.getLogger()


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

    default_limit = 10
    max_limit = 100


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

    def _get_base_queryset(self, *args, **kwargs):
        """Return the base queryset for all actions"""
        user = self.request.user
        return (
            Course.objects.filter(
                *args,
                **kwargs,
                published=True,
                runs__published=True,
                runs__isnull=False,
            )
            .prefetch_related(
                "topics",
                "offered_by",
                Prefetch(
                    "runs",
                    queryset=LearningResourceRun.objects.prefetch_related(
                        "topics", "prices", "instructors", "offered_by"
                    )
                    .defer("raw_json")
                    .filter(published=True)
                    .order_by("-best_start_date"),
                ),
            )
            .defer("raw_json")
            .annotate_is_favorite_for_user(user)
            .prefetch_list_items_for_user(user)
            .distinct()
        )

    def get_queryset(self):
        """Generate a QuerySet for fetching valid courses"""
        return self._get_base_queryset()

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
            self._get_base_queryset(runs__start_date__gt=timezone.now()).order_by(
                "runs__start_date"
            )
        )
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(methods=["GET"], detail=False)
    def featured(self, request):
        """
        Get featured courses
        """
        page = self.paginate_queryset(self._get_base_queryset(featured=True))
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class LargePagination(LimitOffsetPagination):
    """
    Pagination class for list views for when we have to
    fetch all the results on the frontend :/
    """

    default_limit = 1000
    max_limit = 1000


class UserListViewSet(NestedViewSetMixin, viewsets.ModelViewSet, FavoriteViewMixin):
    """
    Viewset for User Lists & Learning Paths
    """

    serializer_class = UserListSerializer
    pagination_class = LargePagination
    permission_classes = (HasUserListPermissions,)

    def get_queryset(self):
        """Return a queryset for this user"""
        user = self.request.user
        return (
            UserList.objects.prefetch_related("author", "topics", "offered_by")
            .annotate(item_count=Count("items"))
            .prefetch_list_items_for_user(user)
            .annotate_is_favorite_for_user(user)
        )

    def list(self, request, *args, **kwargs):
        """Override default list to only get lists authored by user"""
        public = self.request.query_params.get("public", False)
        ordering = self.request.query_params.get("sort", "title")

        if request.user.is_anonymous:
            queryset = UserList.objects.none()
        elif public:
            queryset = self.get_queryset().filter(
                privacy_level=PrivacyLevel.public.value
            )
        else:
            queryset = self.get_queryset().filter(author=request.user)
        queryset = queryset.order_by(ordering)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        delete_user_list(instance)
        instance.delete()


class UserListItemViewSet(NestedViewSetMixin, viewsets.ModelViewSet, FavoriteViewMixin):
    """
    Viewset for User List Items
    """

    queryset = UserListItem.objects.select_related("content_type").order_by("position")
    serializer_class = UserListItemSerializer
    pagination_class = DefaultPagination
    permission_classes = (HasUserListItemPermissions,)

    def create(self, request, *args, **kwargs):
        user_list_id = kwargs["parent_lookup_user_list_id"]
        request.data["user_list"] = user_list_id

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user_list_id = kwargs["parent_lookup_user_list_id"]
        request.data["user_list"] = user_list_id
        return super().update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        instance.delete()
        user_list = instance.user_list
        if user_list.items.count() > 0:
            upsert_user_list(user_list.id)
        else:
            delete_user_list(user_list)


class ProgramViewSet(viewsets.ReadOnlyModelViewSet, FavoriteViewMixin):
    """
    Viewset for Programs
    """

    serializer_class = ProgramSerializer
    pagination_class = DefaultPagination
    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_queryset(self):
        """Return a queryset for this user"""
        user = self.request.user
        return (
            Program.objects.all()
            .prefetch_related("items")
            .prefetch_list_items_for_user(user)
            .annotate_is_favorite_for_user(user)
        )


class VideoViewSet(viewsets.ReadOnlyModelViewSet, FavoriteViewMixin):
    """
    Viewset for Videos
    """

    serializer_class = VideoSerializer
    pagination_class = DefaultPagination
    permission_classes = (AnonymousAccessReadonlyPermission,)

    def get_queryset(self):
        """Return a queryset for this user"""
        user = self.request.user
        return (
            Video.objects.all()
            .prefetch_related("topics", "offered_by")
            .prefetch_list_items_for_user(user)
            .annotate_is_favorite_for_user(user)
        )

    @action(methods=["GET"], detail=False)
    def new(self, request):
        """
        Get newly published videos
        """
        page = self.paginate_queryset(
            self.get_queryset().filter(published=True).order_by("-last_modified")
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


@method_decorator(blocked_ip_exempt, name="dispatch")
class WebhookOCWView(APIView):
    """
    Handle webhooks coming from the OCW bucket
    """

    permission_classes = ()
    authentication_classes = ()

    def handle_exception(self, exc):
        """Raise any exception with request info instead of returning response with error status/message"""
        raise WebhookException(
            f"REST Error ({exc}). BODY: {(self.request.body or '')}, META: {self.request.META}"
        ) from exc

    def post(self, request):
        """Process webhook request"""
        if not compare_digest(
            request.GET.get("webhook_key", ""), settings.OCW_WEBHOOK_KEY
        ):
            raise WebhookException("Incorrect webhook key")
        content = rapidjson.loads(request.body.decode())
        records = content.get("Records")
        if records is not None:
            blocklist = load_course_blocklist()
            for record in content.get("Records"):
                s3_key = record.get("s3", {}).get("object", {}).get("key")
                prefix = s3_key.split("0/1.json")[0]
                get_ocw_courses.apply_async(
                    countdown=settings.OCW_WEBHOOK_DELAY,
                    kwargs={
                        "course_prefixes": [prefix],
                        "blocklist": blocklist,
                        "force_overwrite": False,
                        "upload_to_s3": True,
                    },
                )
        else:
            log.error("No records found in webhook: %s", request.body.decode())
        return Response({})


@method_decorator(blocked_ip_exempt, name="dispatch")
class WebhookOCWNextView(APIView):
    """
    Handle webhooks coming from the OCW Next bucket
    """

    permission_classes = ()
    authentication_classes = ()

    def handle_exception(self, exc):
        """Raise any exception with request info instead of returning response with error status/message"""
        raise WebhookException(
            f"REST Error ({exc}). BODY: {(self.request.body or '')}, META: {self.request.META}"
        ) from exc

    def post(self, request):
        """Process webhook request"""
        content = rapidjson.loads(request.body.decode())

        if not compare_digest(
            content.get("webhook_key", ""), settings.OCW_NEXT_SEARCH_WEBHOOK_KEY
        ):
            raise WebhookException("Incorrect webhook key")

        version = content.get("version")
        prefix = content.get("prefix")
        site_uid = content.get("site_uid")
        unpublished = content.get("unpublished", False)

        if version == "live":
            if prefix is not None:
                # Index the course
                get_ocw_next_courses.delay(url_paths=[prefix], force_overwrite=False)
            elif site_uid is not None and unpublished is True:
                # Remove the course from the search index
                course_run = LearningResourceRun.objects.filter(
                    run_id=site_uid, platform=PlatformType.ocw.value
                ).first()
                if course_run:
                    course = course_run.content_object
                    course.published = False
                    course.save()
                    delete_course(course)

        return Response({})


class PodcastViewSet(viewsets.ReadOnlyModelViewSet, FavoriteViewMixin):
    """
    Viewset for Podcasts
    """

    serializer_class = PodcastSerializer
    permission_classes = (AnonymousAccessReadonlyPermission & PodcastFeatureFlag,)

    def get_queryset(self):
        user = self.request.user
        return (
            Podcast.objects.filter(published=True)
            .prefetch_related(
                Prefetch("offered_by", queryset=LearningResourceOfferor.objects.all()),
                Prefetch("topics", queryset=CourseTopic.objects.all()),
            )
            .annotate(
                episode_count=Count("episodes", filter=Q(episodes__published=True))
            )
            .annotate_is_favorite_for_user(user)
            .prefetch_list_items_for_user(user)
            .order_by("id")
        )


def shared_podcast_episode_query(user):
    """
    Shared query set for PodcastEpisodesViewSet and RecentPodcastEpisodesViewSet
    """

    return (
        PodcastEpisode.objects.filter(published=True, podcast__published=True)
        .prefetch_related(
            Prefetch("offered_by", queryset=LearningResourceOfferor.objects.all()),
            Prefetch("topics", queryset=CourseTopic.objects.all()),
        )
        .annotate_is_favorite_for_user(user)
        .prefetch_list_items_for_user(user)
        .select_related("podcast")
    )


class PodcastEpisodesViewSet(viewsets.ReadOnlyModelViewSet, FavoriteViewMixin):
    """
    Viewset for PodcastEpisodes
    """

    serializer_class = PodcastEpisodeSerializer
    pagination_class = DefaultPagination
    permission_classes = (AnonymousAccessReadonlyPermission & PodcastFeatureFlag,)

    def get_queryset(self):

        user = self.request.user

        return shared_podcast_episode_query(user).order_by("-last_modified", "-id")


class RecentPodcastEpisodesViewSet(PodcastEpisodesViewSet):
    """
    Viewset for most recent PodcastEpisode for each Podcast
    """

    def get_queryset(self):
        user = self.request.user

        latest_episode_by_podcast = (
            shared_podcast_episode_query(user)
            .order_by("podcast_id", "-last_modified", "-id")
            .distinct("podcast_id")
        )

        return sorted(
            latest_episode_by_podcast,
            key=operator.attrgetter("last_modified"),
            reverse=True,
        )


class EpisodesInPodcast(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for listing PodcastEpisodes for a given Podcast primary key
    """

    serializer_class = PodcastEpisodeSerializer
    permission_classes = (ReadOnly & PodcastFeatureFlag,)
    pagination_class = DefaultPagination

    def get_queryset(self):
        return (
            PodcastEpisode.objects.filter(
                published=True, podcast__published=True, podcast=self.kwargs["pk"]
            )
            .order_by("-last_modified", "-id")
            .prefetch_related(
                Prefetch("offered_by", queryset=LearningResourceOfferor.objects.all()),
                Prefetch("topics", queryset=CourseTopic.objects.all()),
            )
            .select_related("podcast")
        )


@cache_page(60 * settings.RSS_FEED_CACHE_MINUTES)
def podcast_rss_feed(request):
    """
    View to display the combined podcast rss file
    """

    rss = generate_aggregate_podcast_rss()
    return HttpResponse(
        rss.prettify(), content_type="application/rss+xml; charset=utf-8"
    )
