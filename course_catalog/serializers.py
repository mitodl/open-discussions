"""
course_catalog serializers
"""
from rest_framework import serializers

from course_catalog.constants import PlatformType, AvailabilityType, ResourceType
from course_catalog.models import (
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    Bootcamp,
)
from course_catalog.serializer_helpers import (
    get_ocw_topic,
    get_year_and_semester,
    get_course_url,
)


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


class CourseRelatedFieldSerializer(serializers.ModelSerializer):
    """
    Serializer with common functions to be used by CourseSerializer and BootcampSerialzer
    """

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

    def handle_many_to_many(self, course):
        """
        Handle the creation and assignment of topics, instructors, and prices
        """
        topics = self.topics if hasattr(self, "topics") else []
        instructors = self.instructors if hasattr(self, "instructors") else []
        prices = self.prices if hasattr(self, "prices") else []
        course.topics.clear()
        for topic in topics:
            course_topic, _ = CourseTopic.objects.get_or_create(**topic)
            course.topics.add(course_topic)

        # Clear out the instructors and re-add them
        course.instructors.clear()
        # In the samples it looks like instructors is never populated and staff is
        for instructor in instructors:
            course_instructor, _ = CourseInstructor.objects.get_or_create(**instructor)
            course.instructors.add(course_instructor)

        # Clear out the prices and re-add them
        course.prices.clear()
        for price in prices:
            course_price, _ = CoursePrice.objects.get_or_create(**price)
            course.prices.add(course_price)


class CourseSerializer(CourseRelatedFieldSerializer):
    """
    Serializer for Course model
    """

    instructors = CourseInstructorSerializer(read_only=True, many=True, allow_null=True)
    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)
    prices = CoursePriceSerializer(read_only=True, many=True, allow_null=True)

    class Meta:
        model = Course
        fields = "__all__"
        extra_kwargs = {"raw_json": {"write_only": True}}


class EDXSerializer(CourseSerializer):
    """
    Serializer for creating Course objects from edx data
    """

    def to_internal_value(self, data):
        """
        Custom function to parse data out of the raw edx json
        """
        year, semester = get_year_and_semester(data)
        course_fields = {
            "course_id": data.get("key"),
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
            "url": get_course_url(
                data.get("key"), data.get("raw_json"), PlatformType.mitx.value
            ),
            "availability": data.get("availability"),
        }
        self.topics = [
            {"name": subject.get("name")}
            for subject in data.get("raw_json").get("subjects")
        ]
        self.instructors = [
            {
                "first_name": person.get("given_name"),
                "last_name": person.get("family_name"),
            }
            for person in data.get("staff")
        ]
        self.prices = [
            {
                "price": seat.get("price"),
                "mode": seat.get("type"),
                "upgrade_deadline": seat.get("upgrade_deadline"),
            }
            for seat in data.get("seats")
        ]
        return super().to_internal_value(course_fields)


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
            "course_id": data.get("uid"),
            "title": data.get("title"),
            "short_description": data.get("description"),
            "level": data.get("course_level"),
            "semester": data.get("from_semester"),
            "language": data.get("language"),
            "platform": PlatformType.ocw.value,
            "year": data.get("from_year"),
            "image_src": data.get("image_src"),
            "image_description": data.get("image_description"),
            "last_modified": data.get("last_modified"),
            "published": data.get("is_published"),
            "raw_json": data.get("raw_json"),
            "url": get_course_url(data.get("uid"), data, PlatformType.ocw.value),
            "availability": AvailabilityType.current.value,
        }
        if "PROD/RES" in data.get("course_prefix"):
            course_fields["learning_resource_type"] = ResourceType.ocw_resource.value

        self.topics = topics
        self.instructors = [
            {
                "first_name": instructor.get("first_name"),
                "last_name": instructor.get("last_name"),
            }
            for instructor in data.get("instructors")
        ]
        self.prices = [{"price": "0.00", "mode": "audit", "upgrade_deadline": None}]

        return super().to_internal_value(course_fields)


class BootcampSerializer(CourseRelatedFieldSerializer):
    """
    Serializer for Bootcamp model
    """

    instructors = CourseInstructorSerializer(read_only=True, many=True, allow_null=True)
    topics = CourseTopicSerializer(read_only=True, many=True, allow_null=True)
    prices = CoursePriceSerializer(read_only=True, many=True, allow_null=True)

    def to_internal_value(self, data):
        """
        Custom function to parse data out of the raw bootcamp json
        """
        self.topics = data.pop("topics") if "topics" in data else []
        self.instructors = data.pop("instructors") if "instructors" in data else []
        self.prices = data.pop("prices") if "prices" in data else []
        return super().to_internal_value(data)

    class Meta:
        model = Bootcamp
        fields = "__all__"
