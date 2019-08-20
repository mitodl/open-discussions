"""Serializers for elasticsearch data"""
import logging

from prawcore import NotFound
from rest_framework import serializers

from channels.constants import POST_TYPE, COMMENT_TYPE
from channels.models import Comment, Post
from course_catalog.models import Course, CourseRun, Bootcamp, Program, UserList
from profiles.api import get_channels, get_channel_join_dates
from profiles.models import Profile
from profiles.utils import image_uri
from search.api import (
    gen_post_id,
    gen_comment_id,
    gen_profile_id,
    gen_course_id,
    gen_bootcamp_id,
    gen_user_list_id,
    gen_program_id,
)
from search.constants import (
    PROFILE_TYPE,
    COURSE_TYPE,
    BOOTCAMP_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
)
from open_discussions.utils import filter_dict_keys, filter_dict_with_renamed_keys

log = logging.getLogger()


class ESModelSerializer(serializers.ModelSerializer):
    """
    Base ElasticSearch serializer for model-based objects
    """

    object_type = None

    def to_representation(self, instance):
        """Serializes the instance"""
        ret = super().to_representation(instance)
        ret["object_type"] = self.object_type
        return ret


class ESProxySerializer:
    """
    Serializer class for Elasticsearch objects that proxy to another serializer for serialization

    Attributes:
        object_type (str): String indicating the type of reddit/django object
        use_keys (list[str]):
            A list of keys from the base serializer results to use in the final serialized object
        rename_keys (dict(str, str)):
            A dict representing keys from the base serializer results that should be renamed for
            the final serialized object
    """

    object_type = None
    use_keys = []
    rename_keys = {}

    @property
    def base_serializer(self):
        """DRF Serializer class to use for the base serialization functionality"""
        raise NotImplementedError

    def postprocess_fields(
        self, discussions_obj, serialized_data
    ):  # pylint: disable=unused-argument
        """Returns a dict of additional or altered fields for the final serialized object"""
        return {}

    def serialize(self, discussions_obj):
        """
        Serializes a reddit or django model object by modifying the results from a base serializer class
        """
        base_serialized = self.base_serializer(discussions_obj).data
        serialized = {
            **filter_dict_keys(base_serialized, self.use_keys),
            **filter_dict_with_renamed_keys(base_serialized, self.rename_keys),
            "object_type": self.object_type,
        }
        return {**serialized, **self.postprocess_fields(discussions_obj, serialized)}


class ESProfileSerializer(ESProxySerializer):
    """
    Elasticsearch serializer class for profiles
    """

    object_type = PROFILE_TYPE
    use_keys = []
    rename_keys = {
        "username": "author_id",
        "name": "author_name",
        "bio": "author_bio",
        "headline": "author_headline",
        "profile_image_medium": "author_avatar_medium",
        "profile_image_small": "author_avatar_small",
    }

    @property
    def base_serializer(self):
        from profiles.serializers import ProfileSerializer

        return ProfileSerializer

    def postprocess_fields(self, discussions_obj, serialized_data):
        join_data = get_channel_join_dates(discussions_obj.user)
        return {
            "author_channel_membership": sorted(get_channels(discussions_obj.user)),
            "author_channel_join_data": [
                {"name": name, "joined": created_on} for name, created_on in join_data
            ],
        }


class ESPostSerializer(ESModelSerializer):
    """Elasticsearch serializer class for posts"""

    object_type = POST_TYPE

    post_id = serializers.CharField(read_only=True)
    post_title = serializers.CharField(source="title", read_only=True)
    post_link_url = serializers.CharField(source="url", read_only=True)
    post_link_thumbnail = serializers.CharField(source="thumbnail_url", read_only=True)
    post_slug = serializers.CharField(source="slug", read_only=True)
    plain_text = serializers.CharField(read_only=True)

    author_avatar_small = serializers.SerializerMethodField()
    author_id = serializers.CharField(
        source="author.username", read_only=True, default=None
    )
    author_name = serializers.CharField(
        source="author.profile.name", read_only=True, default=None
    )
    author_headline = serializers.CharField(
        source="author.profile.headline", read_only=True, default=None
    )

    channel_name = serializers.CharField(source="channel.name", read_only=True)
    channel_title = serializers.CharField(source="channel.title", read_only=True)
    channel_type = serializers.CharField(source="channel.channel_type", read_only=True)

    article_content = serializers.JSONField(
        source="article.content", default=None, read_only=True
    )

    created = serializers.DateTimeField(source="created_on", read_only=True)

    def get_author_avatar_small(self, instance):
        """Returns the small profile image of the author"""
        profile = (
            instance.author.profile
            if instance.author and instance.author.profile
            else None
        )
        return image_uri(profile)

    class Meta:
        model = Post
        fields = (
            "post_type",
            "post_slug",
            "post_id",
            "post_title",
            "post_link_url",
            "post_link_thumbnail",
            "author_avatar_small",
            "author_id",
            "author_name",
            "author_headline",
            "channel_name",
            "channel_title",
            "channel_type",
            "article_content",
            "plain_text",
            "text",
            "score",
            "num_comments",
            "removed",
            "deleted",
            "created",
        )
        read_only_fields = (
            "post_type",
            "text",
            "score",
            "num_comments",
            "created",
            "removed",
            "deleted",
        )


class ESCommentSerializer(ESModelSerializer):
    """Elasticsearch serializer class for comments"""

    object_type = COMMENT_TYPE

    post_id = serializers.CharField(source="post.post_id", read_only=True)
    post_title = serializers.CharField(source="post.title", read_only=True)
    post_slug = serializers.CharField(source="post.slug", read_only=True)

    comment_id = serializers.CharField(read_only=True)
    parent_comment_id = serializers.CharField(source="parent_id", read_only=True)

    author_avatar_small = serializers.SerializerMethodField()
    author_id = serializers.CharField(
        source="author.username", read_only=True, default=None
    )
    author_name = serializers.CharField(
        source="author.profile.name", read_only=True, default=None
    )
    author_headline = serializers.CharField(
        source="author.profile.headline", read_only=True, default=None
    )

    channel_name = serializers.CharField(source="post.channel.name", read_only=True)
    channel_title = serializers.CharField(source="post.channel.title", read_only=True)
    channel_type = serializers.CharField(
        source="post.channel.channel_type", read_only=True
    )

    created = serializers.DateTimeField(source="created_on", read_only=True)

    def get_author_avatar_small(self, instance):
        """Returns the small profile image of the author"""
        profile = (
            instance.author.profile
            if instance.author and instance.author.profile
            else None
        )
        return image_uri(profile)

    class Meta:
        model = Comment
        fields = (
            "post_title",
            "post_id",
            "post_slug",
            "comment_id",
            "parent_comment_id",
            "author_avatar_small",
            "author_id",
            "author_name",
            "author_headline",
            "channel_name",
            "channel_title",
            "channel_type",
            "text",
            "score",
            "removed",
            "deleted",
            "created",
        )
        read_only_fields = ("text", "score", "created", "removed", "deleted")


class ESCourseRunSerializer(serializers.ModelSerializer):
    """
    Elasticsearch serializer class for course runs
    """

    prices = serializers.SerializerMethodField()
    instructors = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    def get_prices(self, course_run):
        """
        Get the prices for a course run
        """
        return list(course_run.prices.values("price", "mode"))

    def get_instructors(self, course_run):
        """
        Get a list of instructor names for the course run
        """
        return [
            " ".join([i.first_name, i.last_name]) for i in course_run.instructors.all()
        ]

    def get_availability(self, course_run):
        """
        Get the availability for a course run
        """
        if course_run.availability:
            return course_run.availability.title()
        return None

    class Meta:
        model = CourseRun
        fields = [
            "id",
            "course_run_id",
            "short_description",
            "full_description",
            "language",
            "semester",
            "year",
            "level",
            "start_date",
            "end_date",
            "enrollment_start",
            "enrollment_end",
            "title",
            "image_src",
            "prices",
            "instructors",
            "published",
            "availability",
            "offered_by",
        ]

        read_only_fields = fields


class ESCourseSerializer(ESModelSerializer):
    """
    Elasticsearch serializer class for courses
    """

    object_type = COURSE_TYPE

    topics = serializers.SerializerMethodField()
    course_runs = serializers.SerializerMethodField()

    def get_course_runs(self, instance):
        """
        Get the course runs in reverse chronological order
        """
        course_runs = instance.course_runs.all().order_by(
            "-enrollment_start", "-start_date", "-year"
        )
        return ESCourseRunSerializer(course_runs, many=True).data

    def get_topics(self, course):
        """
        Get the topic names for a course
        """
        return [topic.name for topic in course.topics.all()]

    class Meta:
        model = Course
        fields = [
            "id",
            "course_id",
            "short_description",
            "full_description",
            "platform",
            "title",
            "image_src",
            "topics",
            "published",
            "offered_by",
            "course_runs",
        ]

        read_only_fields = fields


class ESBootcampSerializer(ESCourseSerializer):
    """
    Elasticsearch serializer class for bootcamps
    """

    object_type = BOOTCAMP_TYPE

    course_runs = ESCourseRunSerializer(many=True)

    class Meta:
        model = Bootcamp
        fields = [
            "id",
            "course_id",
            "short_description",
            "full_description",
            "title",
            "image_src",
            "topics",
            "published",
            "offered_by",
            "course_runs",
        ]

        read_only_fields = fields


class ESProgramSerializer(ESModelSerializer):
    """
    Elasticsearch serializer class for programs
    """

    object_type = PROGRAM_TYPE

    topics = serializers.SerializerMethodField()

    def get_topics(self, program):
        """
        Get the topic names for a program
        """
        return [topic.name for topic in program.topics.all()]

    class Meta:
        model = Program
        fields = [
            "id",
            "short_description",
            "title",
            "image_src",
            "topics",
            "offered_by",
        ]

        read_only_fields = fields


class ESUserListSerializer(ESModelSerializer):
    """
    Elasticsearch serializer class for user_lists
    """

    object_type = USER_LIST_TYPE

    topics = serializers.SerializerMethodField()

    def get_topics(self, user_list):
        """
        Get the topic names for a user_list
        """
        return [topic.name for topic in user_list.topics.all()]

    class Meta:
        model = UserList
        fields = [
            "id",
            "short_description",
            "title",
            "image_src",
            "topics",
            "author",
            "list_type",
            "privacy_level",
        ]

        read_only_fields = fields


def serialize_bulk_posts(post_ids):
    """
    Index a list of Post.ids

    Args:
        post_ids (list of int): a list of Post.id values to serialize

    Yields:
        iter of dict: yields an iterable of serialized posts
    """
    for post in Post.objects.filter(id__in=post_ids).prefetch_related(
        "article", "link_meta", "author", "author__profile"
    ):
        yield serialize_post_for_bulk(post)


def serialize_bulk_comments(comment_ids):
    """
    Index a list of Comment.ids

    Args:
        comment_ids (list of int): a list of Comment.ids to serialize

    Yields:
        iter of dict: yields an iterable of serialized comments
    """
    for comment in Comment.objects.filter(id__in=comment_ids).prefetch_related(
        "post", "author", "author__profile"
    ):
        yield serialize_comment_for_bulk(comment)


def serialize_bulk_profiles(ids):
    """
    Serialize profiles for bulk indexing

    Args:
        ids(list of int): List of profile id's

    Yields:
        iter of dict: yields an iterable of serialized profiles
    """
    for profile in Profile.objects.filter(id__in=ids).prefetch_related("user"):
        yield serialize_profile_for_bulk(profile)


def serialize_profile_for_bulk(profile_obj):
    """
    Serialize a profile for bulk API request

    Args:
        profile_obj (Profile): A user profile

    Returns:
        dict: the serialized profile
    """
    return {
        "_id": gen_profile_id(profile_obj.user.username),
        **ESProfileSerializer().serialize(profile_obj),
    }


def serialize_post_for_bulk(post_obj):
    """
    Serialize a reddit Submission for a bulk API request

    Args:
        post (channels.models.Post): A Post object

    Returns:
        dict: the serialized post
    """
    try:
        return {
            "_id": gen_post_id(post_obj.post_id),
            **ESPostSerializer(instance=post_obj).data,
        }
    except NotFound:
        log.exception("Reddit post not found: %s", post_obj.id)
        raise


def serialize_comment_for_bulk(comment_obj):
    """
    Serialize a comment for a bulk API request

    Args:
        comment_obj (channels.models.Comment): A Comment object

    Returns:
        dict: the serialized comment
    """
    try:
        return {
            "_id": gen_comment_id(comment_obj.comment_id),
            **ESCommentSerializer(instance=comment_obj).data,
        }
    except NotFound:
        log.exception("Reddit comment not found: %s", comment_obj.id)
        raise


def serialize_bulk_courses(ids):
    """
    Serialize courses for bulk indexing

    Args:
        ids(list of int): List of course id's
    """
    for course in Course.objects.filter(id__in=ids).prefetch_related(
        "topics", "course_runs"
    ):
        yield serialize_course_for_bulk(course)


def serialize_course_for_bulk(course_obj):
    """
    Serialize a course for bulk API request

    Args:
        course_obj (Course): A course
    """
    return {
        "_id": gen_course_id(course_obj.course_id),
        **ESCourseSerializer(course_obj).data,
    }


def serialize_bulk_bootcamps(ids):
    """
    Serialize bootcamps for bulk indexing

    Args:
        ids(list of int): List of bootcamp id's
    """
    for bootcamp in Bootcamp.objects.filter(id__in=ids).prefetch_related(
        "course_runs", "topics"
    ):
        yield serialize_bootcamp_for_bulk(bootcamp)


def serialize_bootcamp_for_bulk(bootcamp_obj):
    """
    Serialize a bootcamp for bulk API request

    Args:
        bootcamp_obj (Bootcamp): A bootcamp
    """
    return {
        "_id": gen_bootcamp_id(bootcamp_obj.course_id),
        **ESBootcampSerializer(bootcamp_obj).data,
    }


def serialize_bulk_programs(ids):
    """
    Serialize programs for bulk indexing

    Args:
        ids(list of int): List of program id's
    """
    for program in Program.objects.filter(id__in=ids).prefetch_related("topics"):
        yield serialize_program_for_bulk(program)


def serialize_program_for_bulk(program_obj):
    """
    Serialize a program for bulk API request

    Args:
        program_obj (Program): A program
    """
    return {"_id": gen_program_id(program_obj), **ESProgramSerializer(program_obj).data}


def serialize_bulk_user_lists(ids):
    """
    Serialize user_lists for bulk indexing

    Args:
        ids(list of int): List of user_list id's
    """
    for user_list in UserList.objects.filter(id__in=ids).prefetch_related("topics"):
        yield serialize_user_list_for_bulk(user_list)


def serialize_user_list_for_bulk(user_list_obj):
    """
    Serialize a user_list for bulk API request

    Args:
        user_list_obj (UserList): A user_list
    """
    return {
        "_id": gen_user_list_id(user_list_obj),
        **ESUserListSerializer(user_list_obj).data,
    }
