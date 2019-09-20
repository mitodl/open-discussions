"""
course_catalog serializers
"""
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from course_catalog.constants import PlatformType, ResourceType, OfferedBy
from course_catalog.models import (
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    Bootcamp,
    UserListItem,
    UserList,
    Program,
    ProgramItem,
    FavoriteItem,
    CourseRun,
)
from course_catalog.utils import (
    get_ocw_topic,
    get_year_and_semester,
    get_course_url,
    semester_year_to_date,
)


class GenericForeignKeyFieldSerializer(serializers.ModelSerializer):
    """
    Special field to handle the generic foreign key in ListItem
    """

    def to_representation(self, instance):
        if isinstance(instance, Bootcamp):
            serializer = BootcampSerializer(instance)
        elif isinstance(instance, Course):
            serializer = CourseSerializer(instance)
        else:
            raise Exception("Unexpected type of tagged object")

        return serializer.data


class FavoriteItemContentSerializer(serializers.ModelSerializer):
    """
    Special field to handle the generic foreign key in FavoriteItem
    """

    def to_representation(self, instance):
        # Pass context on to the serializers so that they have access to the user
        context = self.context
        if isinstance(instance, Bootcamp):
            serializer = BootcampSerializer(instance, context=context)
        elif isinstance(instance, Course):
            serializer = CourseSerializer(instance, context=context)
        elif isinstance(instance, UserList):
            serializer = UserListSerializer(instance, context=context)
        elif isinstance(instance, Program):
            serializer = ProgramSerializer(instance, context=context)
        else:
            raise Exception("Unexpected type of tagged object")

        return serializer.data


class FavoriteSerializerMixin(serializers.Serializer):
    """
    Mixin to serializer is_favorite for various models
    """

    is_favorite = serializers.SerializerMethodField()

    def get_is_favorite(self, obj):
        """
        Check if user has a favorite item for object, otherwise return false
        """
        request = self.context.get("request")
        if request and hasattr(request, "user") and isinstance(request.user, User):
            return FavoriteItem.objects.filter(
                user=request.user,
                object_id=obj.id,
                content_type=ContentType.objects.get_for_model(obj),
            ).exists()
        else:
            return False


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
        fields = "__all__"


class BaseCourseSerializer(FavoriteSerializerMixin, serializers.ModelSerializer):
    """
    Serializer with common functions to be used by CourseSerializer and BootcampSerialzer
    """

    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)

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


class CourseRunSerializer(BaseCourseSerializer):
    """
    Serializer for creating CourseRun objects from edx data
    """

    instructors = CourseInstructorSerializer(read_only=True, many=True, allow_null=True)
    prices = CoursePriceSerializer(read_only=True, many=True, allow_null=True)

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
            "course_run_id": data.get("key"),
            "title": data.get("title"),
            "short_description": data.get("short_description"),
            "full_description": data.get("full_description"),
            "level": data.get("level_type"),
            "semester": semester,
            "language": data.get("content_language"),
            "platform": PlatformType.mitx.value,
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
            "offered_by": data.get("offered_by"),
        }
        self.instructors = [
            {
                "first_name": person.get("given_name", person.get("first_name")),
                "last_name": person.get("family_name", person.get("last_name")),
            }
            for person in data.get("staff")
        ]
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
        model = CourseRun
        fields = "__all__"


class CourseSerializer(BaseCourseSerializer):
    """
    Serializer for Course model
    """

    course_runs = CourseRunSerializer(read_only=True, many=True, allow_null=True)
    object_type = serializers.CharField(read_only=True, default="course")

    class Meta:
        model = Course
        fields = "__all__"
        extra_kwargs = {"raw_json": {"write_only": True}}


class OCWSerializer(CourseSerializer):
    """
    Serializer for creating Course objects from ocw data
    """

    def to_internal_value(self, data):
        """
        Custom function to parse data out of the raw ocw json
        """
        topics = []
        for topic_obj in data.get("course_collections"):
            for topic in get_ocw_topic(topic_obj):
                topics.append({"name": topic})
        course_fields = {
            "course_id": data.get("course_id"),
            "title": data.get("title"),
            "short_description": data.get("description"),
            "image_src": data.get("image_src"),
            "image_description": data.get("image_description"),
            "last_modified": data.get("last_modified"),
            "published": data.get("is_published"),
            "raw_json": data.get("raw_json"),
            "url": get_course_url(data.get("uid"), data, PlatformType.ocw.value),
            "offered_by": OfferedBy.ocw.value,
            "platform": PlatformType.ocw.value,
        }
        if "PROD/RES" in data.get("course_prefix"):
            course_fields["learning_resource_type"] = ResourceType.ocw_resource.value

        self.topics = topics
        return super().to_internal_value(course_fields)


class BootcampSerializer(BaseCourseSerializer):
    """
    Serializer for Bootcamp model
    """

    course_runs = CourseRunSerializer(read_only=True, many=True, allow_null=True)
    object_type = serializers.CharField(read_only=True, default="bootcamp")

    def to_internal_value(self, data):
        """
        Custom function to parse data out of the raw bootcamp json
        """
        self.topics = data.pop("topics") if "topics" in data else []
        data["offered_by"] = OfferedBy.bootcamps.value
        return super().to_internal_value(data)

    class Meta:
        model = Bootcamp
        fields = "__all__"


class UserListItemSerializer(serializers.ModelSerializer):
    """
    Serializer for UserListItem model
    """

    content_data = GenericForeignKeyFieldSerializer(source="item")
    content_type = serializers.CharField(source="content_type.name")

    class Meta:
        model = UserListItem
        fields = "__all__"


class UserListSerializer(serializers.ModelSerializer, FavoriteSerializerMixin):
    """
    Serializer for UserList model
    """

    items = UserListItemSerializer(many=True, allow_null=True)
    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)
    object_type = serializers.CharField(read_only=True, default="user_list")

    class Meta:
        model = UserList
        fields = "__all__"


class ProgramItemSerializer(serializers.ModelSerializer, FavoriteSerializerMixin):
    """
    Serializer for ProgramItem model
    """

    content_data = GenericForeignKeyFieldSerializer(source="item")
    content_type = serializers.CharField(source="content_type.name")

    class Meta:
        model = ProgramItem
        fields = "__all__"


class ProgramSerializer(serializers.ModelSerializer, FavoriteSerializerMixin):
    """
    Serializer for Program model
    """

    items = ProgramItemSerializer(many=True, allow_null=True)
    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)
    prices = CoursePriceSerializer(read_only=True, many=True, allow_null=True)
    object_type = serializers.CharField(read_only=True, default="program")

    class Meta:
        model = Program
        fields = "__all__"


class FavoriteItemSerializer(serializers.ModelSerializer):
    """
    Serializer for Favorite Item
    """

    content_data = FavoriteItemContentSerializer(source="item")
    content_type = serializers.CharField(source="content_type.name")

    class Meta:
        model = FavoriteItem
        fields = "__all__"
