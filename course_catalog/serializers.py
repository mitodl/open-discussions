"""
course_catalog serializers
"""
from urllib.parse import urljoin

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError as CoreValidationError
from django.core.validators import URLValidator
from django.db import transaction
from django.db.models import F, Max, prefetch_related_objects
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from course_catalog.constants import (
    PlatformType,
    PrivacyLevel,
    ResourceType,
    StaffListType,
    UserListType,
)
from course_catalog.models import (
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    FavoriteItem,
    LearningResourceRun,
    Podcast,
    PodcastEpisode,
    Program,
    ProgramItem,
    StaffList,
    StaffListItem,
    UserList,
    UserListItem,
    Video,
)
from course_catalog.utils import (
    get_course_url,
    get_ocw_department_list,
    get_ocw_topics,
    get_year_and_semester,
    parse_instructors,
    semester_year_to_date,
)
from moira_lists.moira_api import is_public_list_editor
from open_discussions.serializers import WriteableSerializerMethodField
from search.task_helpers import delete_user_list, upsert_user_list

COMMON_IGNORED_FIELDS = ("created_on", "updated_on")


class GenericForeignKeyFieldSerializer(serializers.Serializer):
    """
    Special field to handle the generic foreign key in FavoriteItem and ListItem
    """

    def to_representation(self, instance):
        # Pass context on to the serializers so that they have access to the user
        context = self.context
        if isinstance(instance, Course):
            serializer = CourseSerializer(instance, context=context)
        elif isinstance(instance, StaffList):
            serializer = StaffListSerializer(instance, context=context)
        elif isinstance(instance, UserList):
            serializer = UserListSerializer(instance, context=context)
        elif isinstance(instance, Program):
            serializer = ProgramSerializer(instance, context=context)
        elif isinstance(instance, Video):
            serializer = VideoSerializer(instance, context=context)
        elif isinstance(instance, Podcast):
            serializer = PodcastSerializer(instance, context=context)
        elif isinstance(instance, PodcastEpisode):
            serializer = PodcastEpisodeSerializer(instance, context=context)
        else:
            raise Exception("Unexpected type of tagged object")
        return serializer.data


class FavoriteSerializerMixin(serializers.Serializer):
    """
    Mixin to serializer is_favorite for various models
    """

    is_favorite = serializers.BooleanField(read_only=True)


class MicroUserListItemSerializer(serializers.ModelSerializer):
    """
    Serializer for UserListItem containing only the item id and userlist id.
    """

    item_id = serializers.IntegerField(source="id")
    list_id = serializers.IntegerField(source="user_list_id")
    object_id = serializers.IntegerField()
    content_type = serializers.CharField(source="content_type.name")

    class Meta:
        model = UserListItem
        fields = ("item_id", "list_id", "object_id", "content_type")


class ListsSerializerMixin(serializers.Serializer):
    """
    Mixin to serialize lists for various models
    """

    lists = MicroUserListItemSerializer(source="list_items", read_only=True, many=True)


class CourseInstructorSerializer(serializers.ModelSerializer):
    """
    Serializer for CourseInstructor model
    """

    class Meta:
        model = CourseInstructor
        fields = "__all__"


class CoursePriceSerializer(serializers.ModelSerializer):
    """
    Serializer for CoursePrice model
    """

    class Meta:
        model = CoursePrice
        fields = "__all__"


class CourseTopicSerializer(serializers.ModelSerializer):
    """
    Serializer for CourseTopic model
    """

    class Meta:
        model = CourseTopic
        fields = ["id", "name"]


class LearningResourceOfferorField(serializers.Field):
    """Serializer for LearningResourceOfferor"""

    def to_representation(self, value):
        """Serializes offered_by as a list of OfferedBy names"""
        return [offeror.name for offeror in value.all()]


class BaseCourseSerializer(
    FavoriteSerializerMixin, ListsSerializerMixin, serializers.ModelSerializer
):
    """
    Serializer with common functions to be used by CourseSerializer
    """

    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)
    offered_by = LearningResourceOfferorField(read_only=True, allow_null=True)

    def create(self, validated_data):
        """
        Custom create since serializers don't do writable nested serializers by default
        """
        course = super().create(validated_data)
        self.handle_many_to_many(course)
        return course

    def update(self, instance, validated_data):
        """
        Custom update since serializers don't do writable nested serializers by default
        """
        course = super().update(instance, validated_data)
        self.handle_many_to_many(course)
        return course

    def handle_many_to_many(self, resource):
        """
        Handle the creation and assignment of topics, instructors, and prices
        """
        topics = self.topics if hasattr(self, "topics") else []
        resource.topics.clear()
        for topic in topics:
            course_topic, _ = CourseTopic.objects.get_or_create(**topic)
            resource.topics.add(course_topic)

    def validate(self, attrs):
        """
        Verify that image_src is either a valid url or a valid relative url
        """
        if attrs.get("image_src"):
            url_validator = URLValidator()

            try:
                url_validator(attrs["image_src"])
            except CoreValidationError:
                try:
                    url_validator(urljoin("http://www.base.com/", attrs["image_src"]))
                except CoreValidationError:
                    raise ValidationError(
                        "image_src is not a valid absolute or relative url"
                    )


class LearningResourceRunSerializer(BaseCourseSerializer):
    """
    Serializer for creating LearningResourceRun objects from edx data
    """

    instructors = CourseInstructorSerializer(read_only=True, many=True, allow_null=True)
    prices = CoursePriceSerializer(read_only=True, many=True, allow_null=True)

    def validate(self, attrs):
        """
        Verify the run doesn't exist if we're creating a new one
        """
        super().validate(attrs)

        run_id = attrs["run_id"]
        platform = attrs["platform"]
        if (
            self.instance is None
            and LearningResourceRun.objects.filter(
                platform=platform, run_id=run_id
            ).exists()
        ):
            raise serializers.ValidationError("LearningResourceRun already exists")
        return attrs

    def handle_many_to_many(self, resource):
        """
        Handle the creation and assignment of instructors and prices
        """
        super().handle_many_to_many(resource)

        instructors = self.instructors if hasattr(self, "instructors") else []
        prices = self.prices if hasattr(self, "prices") else []
        # Clear out the instructors and re-add them
        resource.instructors.clear()
        # In the samples it looks like instructors is never populated and staff is
        for instructor in instructors:
            course_instructor, _ = CourseInstructor.objects.get_or_create(**instructor)
            resource.instructors.add(course_instructor)

        # Clear out the prices and re-add them
        resource.prices.clear()
        for price in prices:
            course_price, _ = CoursePrice.objects.get_or_create(**price)
            resource.prices.add(course_price)

    def to_internal_value(self, data):
        """
        Custom function to parse data out of the raw edx json
        """
        year, semester = get_year_and_semester(data)
        course_fields = {
            "content_type": data.get("content_type"),
            "object_id": data.get("object_id"),
            "run_id": data.get("key"),
            "title": data.get("title"),
            "short_description": data.get("short_description"),
            "full_description": data.get("full_description"),
            "level": data.get("level_type"),
            "semester": semester,
            "language": data.get("content_language"),
            "year": year,
            "start_date": data.get("start"),
            "end_date": data.get("end"),
            "enrollment_start": data.get("enrollment_start"),
            "enrollment_end": data.get("enrollment_end"),
            "best_start_date": data.get("enrollment_start")
            or data.get("start")
            or semester_year_to_date(semester, year),
            "best_end_date": data.get("enrollment_end")
            or data.get("end")
            or semester_year_to_date(semester, year, ending=True),
            "image_src": (
                (data.get("image") or {}).get("src")
                or (data.get("course_image") or {}).get("src")
            ),
            "image_description": (
                (data.get("image") or {}).get("description")
                or (data.get("course_image") or {}).get("description")
            ),
            "last_modified": data.get("max_modified"),
            "raw_json": data.get("raw_json"),
            "url": data.get("url"),
            "availability": data.get("availability"),
            "platform": data.get("platform"),
            "slug": data.get("slug"),
        }
        is_published = data.get("is_published")
        if is_published is not None:
            course_fields["published"] = is_published

        self.instructors = parse_instructors(data.get("staff"))

        self.prices = [
            {
                "price": seat.get("price"),
                "mode": seat.get("type", seat.get("mode")),
                "upgrade_deadline": seat.get("upgrade_deadline"),
            }
            for seat in data.get("seats")
        ]
        return super().to_internal_value(course_fields)

    class Meta:
        model = LearningResourceRun
        fields = "__all__"
        extra_kwargs = {"raw_json": {"write_only": True}}


class LearningResourceRunMixin(serializers.Serializer):
    """
    Mixin to serialize LearningResourceRuns for various models
    """

    runs = LearningResourceRunSerializer(read_only=True, many=True, allow_null=True)


class CourseSerializer(BaseCourseSerializer, LearningResourceRunMixin):
    """
    Serializer for Course model
    """

    object_type = serializers.CharField(read_only=True, default="course")
    audience = serializers.ReadOnlyField()
    certification = serializers.ReadOnlyField()
    department_slug = serializers.ReadOnlyField()

    def validate(self, attrs):
        """
        Verify the Course doesn't exist if we're creating a new one
        """
        super().validate(attrs)

        course_id = attrs["course_id"]
        platform = attrs["platform"]
        if (
            self.instance is None
            and Course.objects.filter(platform=platform, course_id=course_id).exists()
        ):
            raise serializers.ValidationError("Course already exists")
        return attrs

    class Meta:
        model = Course
        exclude = COMMON_IGNORED_FIELDS
        extra_kwargs = {
            "raw_json": {"write_only": True},
            "full_description": {"write_only": True},
            "department_slug": {"read_only": True},
        }


class OCWSerializer(CourseSerializer):
    """
    Serializer for creating Course objects from ocw data
    """

    def to_internal_value(self, data):
        """
        Custom function to parse data out of the raw ocw json
        """
        topics = [
            {"name": topic_name}
            for topic_name in get_ocw_topics(data.get("course_collections"))
        ]

        course_feature_tags = [
            tag["course_feature_tag"] for tag in data.get("course_feature_tags", [])
        ]

        extra_course_numbers = [
            extra_course_number_json.get("linked_course_number_col")
            for extra_course_number_json in (data.get("extra_course_number") or [])
            if extra_course_number_json.get("linked_course_number_col")
        ]

        course_fields = {
            "course_id": f"{data.get('uid')}+{data.get('course_id')}",
            "title": data.get("title"),
            "short_description": data.get("description"),
            "image_src": data.get("image_src"),
            "image_description": data.get("image_description"),
            "last_modified": data.get("last_modified"),
            "published": data.get("is_published"),
            "course_feature_tags": course_feature_tags,
            "url": get_course_url(data.get("uid"), data, PlatformType.ocw.value),
            "platform": PlatformType.ocw.value,
            "department": get_ocw_department_list(data),
            "extra_course_numbers": extra_course_numbers,
        }
        if "PROD/RES" in data.get("course_prefix"):
            course_fields["learning_resource_type"] = ResourceType.ocw_resource.value

        self.topics = topics
        return super().to_internal_value(course_fields)


class OCWNextSerializer(CourseSerializer):
    """
    Serializer for creating Course objects from ocw next data
    """

    def to_internal_value(self, data):
        """
        Custom function to parse data out of the raw ocw json
        """

        topics = [
            topic for topic_sublist in data.get("topics", []) for topic in topic_sublist
        ]

        topics = list(set(topics))

        topics = [{"name": topic_name} for topic_name in topics]

        extra_course_numbers = data.get("extra_course_numbers", None)

        if extra_course_numbers:
            extra_course_numbers = extra_course_numbers.split(", ")
        else:
            extra_course_numbers = []

        if data.get("primary_course_number"):
            course_id = f"{data.get('uid')}+{data.get('primary_course_number')}"
        else:
            course_id = None

        course_fields = {
            "course_id": course_id,
            "title": data.get("course_title"),
            "short_description": data.get("course_description"),
            "image_src": data.get("image_src"),
            "image_description": data.get("course_image_metadata", {}).get(
                "description"
            ),
            "last_modified": data.get("last_modified"),
            "published": True,
            "ocw_next_course": True,
            "course_feature_tags": data.get("learning_resource_types", []),
            "platform": PlatformType.ocw.value,
            "department": data.get("department_numbers", []),
            "extra_course_numbers": extra_course_numbers,
        }

        self.topics = topics
        return super().to_internal_value(course_fields)


class ListItemListSerializer(serializers.ListSerializer):
    """
    This class exists to handle the limitation that prefetch_related
    cannot correctly handle GenericRelation for multiple content types

    Instead, it groups each of the items in a collection by content type
    and then batch fetches related data for each of those.
    """

    def to_representation(self, data):
        """Prefetch related data before serializing"""
        # NOTE: due to the fact that some of these prefetches are many-to-many relations
        #       be aware that the objects on the left had side of a prefetch
        #       assignment must all be the same object type because the prefetch
        #       must hit a single table
        #
        # As an example:
        #   'runs__instructors' works on a list of objects of mixed types
        #   because 'runs' are all of the same type and hence hit the same join table
        #
        #   'content_type' does not work on a list of mixed types because it
        #   needs to hit a different join table for each type

        def _items_for_classes(*classes):
            """Returns a list of items that matches a list of classes by content_type"""
            return [
                item.item for item in data if item.content_type.model_class() in classes
            ]

        prefetch_related_objects(
            _items_for_classes(Course, Program),
            "runs__instructors",
            "runs__prices",
            "runs__offered_by",
            "runs__topics",
        )

        for cls in (Course, Program):
            prefetch_related_objects(_items_for_classes(cls), "offered_by")

        return super().to_representation(data)


class BaseListItemSerializer(serializers.Serializer):
    """
    Base class for list items
    """

    content_data = GenericForeignKeyFieldSerializer(read_only=True, source="item")
    content_type = serializers.CharField(source="content_type.name")

    def validate(self, attrs):
        content_type = attrs.get("content_type", {}).get("name", None)
        object_id = attrs.get("object_id")

        if content_type:
            if content_type not in [
                "course",
                "program",
                "video",
                "podcast",
                "podcastepisode",
            ]:
                raise ValidationError("Incorrect object type {}".format(content_type))
            if (
                content_type == "course"
                and not Course.objects.filter(id=object_id).exists()
            ):
                raise ValidationError("Course does not exist")
            if (
                content_type == "program"
                and not Program.objects.filter(id=object_id).exists()
            ):
                raise ValidationError("Program does not exist")
            if (
                content_type == "video"
                and not Video.objects.filter(id=object_id).exists()
            ):
                raise ValidationError("Video does not exist")
            if (
                content_type == "podcast"
                and not Podcast.objects.filter(id=object_id).exists()
            ):
                raise ValidationError("Podcast does not exist")
            if (
                content_type == "podcastepisode"
                and not PodcastEpisode.objects.filter(id=object_id).exists()
            ):
                raise ValidationError("Podcast Episode does not exist")
        return attrs


class UserListItemSerializer(
    serializers.ModelSerializer, BaseListItemSerializer, FavoriteSerializerMixin
):
    """
    Serializer for UserListItem model, includes content_data
    """

    def update_index(self, user_list):
        """
        If this serializer was instantiated from the UserListItemView, then update the search index

        Args:
            user_list (UserList): the UserList object to update in the search index.

        """
        view = self.context.get("view", None)
        if view is not None and view.kwargs.get("parent_lookup_user_list_id", None):
            # this was sent via userlistitems API, so update the search index
            upsert_user_list(user_list.id)

    def create(self, validated_data):
        user_list = validated_data["user_list"]
        items = UserListItem.objects.filter(user_list=user_list)
        position = (
            items.aggregate(Max("position"))["position__max"] or items.count()
        ) + 1
        item, _ = UserListItem.objects.get_or_create(
            user_list=validated_data["user_list"],
            content_type=ContentType.objects.get(
                model=validated_data["content_type"]["name"]
            ),
            object_id=validated_data["object_id"],
            defaults={"position": position},
        )
        self.update_index(item.user_list)
        return item

    def update(self, instance, validated_data):
        position = validated_data["position"]
        # to perform an update on position we atomically:
        # 1) move everything between the old position and the new position towards the old position by 1
        # 2) move the item into its new position
        # this operation gets slower the further the item is moved, but it is sufficient for now
        with transaction.atomic():
            if position > instance.position:
                # move items between the old and new positions up, inclusive of the new position
                UserListItem.objects.filter(
                    position__lte=position, position__gt=instance.position
                ).update(position=F("position") - 1)
            else:
                # move items between the old and new positions down, inclusive of the new position
                UserListItem.objects.filter(
                    position__lt=instance.position, position__gte=position
                ).update(position=F("position") + 1)
            # now move the item into place
            instance.position = position
            instance.save()

        self.update_index(instance.user_list)
        return instance

    class Meta:
        model = UserListItem
        extra_kwargs = {"position": {"required": False}}
        exclude = ("created_on", "updated_on")
        list_serializer_class = ListItemListSerializer


class BaseListSerializer(serializers.Serializer):
    """
    Base serializer for user lists and staff lists
    """

    item_count = serializers.SerializerMethodField()
    topics = WriteableSerializerMethodField()
    author_name = serializers.SerializerMethodField()
    object_type = serializers.CharField(read_only=True, source="list_type")
    image_src = serializers.SerializerMethodField()
    audience = serializers.ReadOnlyField()
    certification = serializers.ReadOnlyField()

    def get_author_name(self, instance):
        """get author name for userlist"""
        return instance.author.profile.name

    def get_item_count(self, instance):
        """Return the number of items in the list"""
        return getattr(instance, "item_count", None) or instance.items.count()

    def get_image_src(self, instance):
        """Return the user list's image or the image of the first item"""
        if instance.image_src:
            return instance.image_src.url

        # image_src is either a URLField or a ImageField
        list_item = instance.items.order_by("position").first()
        if list_item:
            image_src = list_item.item.image_src
            if image_src:
                return image_src if isinstance(image_src, str) else image_src.url
        return None

    def validate_topics(self, topics):
        """Validator for topics"""
        if len(topics) > 0:
            if isinstance(topics[0], dict):
                topics = [topic["id"] for topic in topics]
            try:
                valid_topic_ids = set(
                    CourseTopic.objects.filter(id__in=topics).values_list(
                        "id", flat=True
                    )
                )
            except ValueError:
                raise ValidationError("Topic ids must be integers")
            missing = set(topics).difference(valid_topic_ids)
            if missing:
                raise ValidationError(f"Invalid topic ids: {missing}")
        return {"topics": topics}

    def get_topics(self, instance):
        """Returns the list of topics"""
        return [CourseTopicSerializer(topic).data for topic in instance.topics.all()]


class UserListSerializer(
    serializers.ModelSerializer,
    BaseListSerializer,
    FavoriteSerializerMixin,
    ListsSerializerMixin,
):
    """
    Simplified serializer for UserList model.
    """

    def validate_list_type(self, list_type):
        """
        Validator for list_type.
        """
        if not list_type or list_type not in [
            listtype.value for listtype in UserListType
        ]:
            raise ValidationError("Missing/incorrect list type information")
        return list_type

    def validate_privacy_level(self, privacy_level):
        """
        Validator for privacy_level
        """
        request = self.context.get("request")
        if request and hasattr(request, "user") and isinstance(request.user, User):
            if (
                privacy_level == PrivacyLevel.public.value
                and not is_public_list_editor(request.user)
            ):
                raise ValidationError("Invalid permissions for public lists")
        return privacy_level

    def create(self, validated_data):
        """Ensure that the list is created by the requesting user"""
        request = self.context.get("request")
        if request and hasattr(request, "user") and isinstance(request.user, User):
            validated_data["author"] = request.user
            topics_data = validated_data.pop("topics", [])
            with transaction.atomic():
                userlist = super().create(validated_data)
                userlist.topics.set(CourseTopic.objects.filter(id__in=topics_data))
            return userlist

    def update(self, instance, validated_data):
        """Ensure that the list is authored by the requesting user before modifying"""
        request = self.context.get("request")
        if request and hasattr(request, "user") and isinstance(request.user, User):
            validated_data["author"] = request.user
            topics_data = validated_data.pop("topics", None)
            with transaction.atomic():
                userlist = super().update(instance, validated_data)
                if topics_data is not None:
                    userlist.topics.set(CourseTopic.objects.filter(id__in=topics_data))
                if instance.items.exists():
                    upsert_user_list(userlist.id)
                else:
                    delete_user_list(userlist)
                return userlist

    class Meta:
        model = UserList
        exclude = COMMON_IGNORED_FIELDS
        read_only_fields = ["author", "items", "author_name"]


class StaffListSerializer(
    serializers.ModelSerializer,
    BaseListSerializer,
    FavoriteSerializerMixin,
    ListsSerializerMixin,
):
    """Serlalizer for StaffList model"""

    def validate_privacy_level(self, privacy_level):
        """
        Validator for privacy_level, should always be True
        """
        return privacy_level

    def validate_list_type(self, list_type):
        """
        Validator for list_type.
        """
        if not list_type or list_type not in [
            listtype.value for listtype in StaffListType
        ]:
            raise ValidationError("Missing/incorrect list type information")
        return list_type

    def create(self, validated_data):
        """Ensure that the list is created by the requesting user, and set topics"""
        request = self.context.get("request")
        if request and hasattr(request, "user") and isinstance(request.user, User):
            validated_data["author"] = request.user
            topics_data = validated_data.pop("topics", [])
            with transaction.atomic():
                stafflist = super().create(validated_data)
                stafflist.topics.set(CourseTopic.objects.filter(id__in=topics_data))
            return stafflist

    def update(self, instance, validated_data):
        """Set stafflist topics and update the model object"""
        request = self.context.get("request")
        if request and hasattr(request, "user") and isinstance(request.user, User):
            topics_data = validated_data.pop("topics", None)
            with transaction.atomic():
                stafflist = super().update(instance, validated_data)
                if topics_data is not None:
                    stafflist.topics.set(CourseTopic.objects.filter(id__in=topics_data))
                return stafflist

    class Meta:
        model = StaffList
        exclude = COMMON_IGNORED_FIELDS
        read_only_fields = ["author", "items", "author_name"]


class StaffListItemSerializer(BaseListItemSerializer, serializers.ModelSerializer):
    """
    Serializer for StaffListItem model, includes content_data
    """

    def create(self, validated_data):
        staff_list = validated_data["staff_list"]
        items = StaffListItem.objects.filter(staff_list=staff_list)
        position = (
            items.aggregate(Max("position"))["position__max"] or items.count()
        ) + 1
        item, _ = StaffListItem.objects.get_or_create(
            staff_list=validated_data["staff_list"],
            content_type=ContentType.objects.get(
                model=validated_data["content_type"]["name"]
            ),
            object_id=validated_data["object_id"],
            defaults={"position": position},
        )
        return item

    def update(self, instance, validated_data):
        position = validated_data["position"]
        # to perform an update on position we atomically:
        # 1) move everything between the old position and the new position towards the old position by 1
        # 2) move the item into its new position
        # this operation gets slower the further the item is moved, but it is sufficient for now
        with transaction.atomic():
            if position > instance.position:
                # move items between the old and new positions up, inclusive of the new position
                StaffListItem.objects.filter(
                    position__lte=position, position__gt=instance.position
                ).update(position=F("position") - 1)
            else:
                # move items between the old and new positions down, inclusive of the new position
                StaffListItem.objects.filter(
                    position__lt=instance.position, position__gte=position
                ).update(position=F("position") + 1)
            # now move the item into place
            instance.position = position
            instance.save()

        return instance

    class Meta:
        model = StaffListItem
        extra_kwargs = {"position": {"required": False}}
        exclude = ("created_on", "updated_on")
        list_serializer_class = ListItemListSerializer


class ProgramItemSerializer(serializers.ModelSerializer, FavoriteSerializerMixin):
    """
    Serializer for ProgramItem model
    """

    content_data = GenericForeignKeyFieldSerializer(source="item")
    content_type = serializers.CharField(source="content_type.name")

    class Meta:
        model = ProgramItem
        exclude = ("created_on", "updated_on")


class ProgramSerializer(
    serializers.ModelSerializer,
    FavoriteSerializerMixin,
    ListsSerializerMixin,
    LearningResourceRunMixin,
):
    """
    Serializer for Program model, minus runs
    """

    items = ProgramItemSerializer(many=True, allow_null=True)
    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)
    offered_by = LearningResourceOfferorField(read_only=True, allow_null=True)
    object_type = serializers.CharField(read_only=True, default="program")
    audience = serializers.ReadOnlyField()
    certification = serializers.ReadOnlyField()

    class Meta:
        model = Program
        exclude = COMMON_IGNORED_FIELDS


class VideoSerializer(
    serializers.ModelSerializer, FavoriteSerializerMixin, ListsSerializerMixin
):
    """
    Serializer for Video model, with runs
    """

    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)
    offered_by = LearningResourceOfferorField(read_only=True, allow_null=True)
    object_type = serializers.CharField(read_only=True, default="video")
    audience = serializers.ReadOnlyField()
    certification = serializers.ReadOnlyField()

    class Meta:
        model = Video
        exclude = ("transcript", "raw_data", "full_description", *COMMON_IGNORED_FIELDS)


class FavoriteItemSerializer(serializers.ModelSerializer):
    """
    Serializer for Favorite Item
    """

    content_data = GenericForeignKeyFieldSerializer(source="item")
    content_type = serializers.CharField(source="content_type.name")

    def to_representation(self, instance):
        """put `is_favorite` in to the content data"""
        data = super().to_representation(instance)
        data["content_data"]["is_favorite"] = True
        return data

    class Meta:
        model = FavoriteItem
        fields = "__all__"


class PodcastEpisodeSerializer(
    serializers.ModelSerializer, FavoriteSerializerMixin, ListsSerializerMixin
):
    """
    Serializer for PodcastEpisode
    """

    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)
    offered_by = LearningResourceOfferorField(read_only=True, allow_null=True)
    object_type = serializers.CharField(read_only=True, default="podcastepisode")
    podcast_title = serializers.SerializerMethodField()
    audience = serializers.ReadOnlyField()
    certification = serializers.ReadOnlyField()

    def get_podcast_title(self, instance):
        """get the podcast title"""
        return instance.podcast.title

    class Meta:
        model = PodcastEpisode
        exclude = ("created_on", "updated_on", "rss")


class PodcastSerializer(
    serializers.ModelSerializer, FavoriteSerializerMixin, ListsSerializerMixin
):
    """
    Serializer for Podcasts
    """

    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)
    offered_by = LearningResourceOfferorField(read_only=True, allow_null=True)
    episode_count = serializers.IntegerField(read_only=True)
    object_type = serializers.CharField(read_only=True, default="podcast")
    platform = serializers.ReadOnlyField()
    audience = serializers.ReadOnlyField()
    certification = serializers.ReadOnlyField()
    apple_podcasts_url = serializers.ReadOnlyField()
    google_podcasts_url = serializers.ReadOnlyField()
    rss_url = serializers.ReadOnlyField()

    class Meta:
        model = Podcast
        exclude = COMMON_IGNORED_FIELDS
