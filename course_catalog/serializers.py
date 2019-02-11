"""
course_catalog serializers
"""
from rest_framework import serializers
from course_catalog.models import Course, CourseInstructor, CoursePrice, CourseTopic


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


class CourseSerializer(serializers.ModelSerializer):
    """
    Serializer for Course model
    """

    instructors = serializers.SerializerMethodField()
    topics = serializers.SerializerMethodField()
    prices = serializers.SerializerMethodField()

    def get_prices(self, course):
        """
        Get the prices for a course
        """
        return [{"price": p.price, "mode": p.mode} for p in course.prices.all()]

    def get_instructors(self, course):
        """
        Get a list of instructors for the course
        """
        return [" ".join([i.first_name, i.last_name]) for i in course.instructors.all()]

    def get_topics(self, course):
        """
        Get the topic names for a course
        """
        return list(course.topics.values_list("name", flat=True))

    class Meta:
        model = Course
        fields = "__all__"
        extra_kwargs = {"raw_json": {"write_only": True}}
