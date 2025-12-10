"""Interactions serializers"""
from itertools import groupby
from operator import itemgetter

from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from course_catalog.models import Course, Program
from course_catalog.serializers import GenericForeignKeyFieldSerializer
from interactions.models import ContentTypeInteraction


class ContentTypeInteractionSerializer(serializers.ModelSerializer):
    """Serializer for ContentTypeInteraction"""

    content_type = serializers.SlugRelatedField(
        slug_field="model",
        queryset=ContentType.objects.filter(
            model__in=(
                "course",
                "userlist",
                "program",
                "video",
                "podcast",
                "podcastepisode",
            )
        ),
    )

    def validate(self, attrs):
        """Validate the resource exists"""
        content_type = attrs["content_type"]
        content_id = attrs["content_id"]

        model_class = content_type.model_class()

        if not model_class.objects.filter(id=content_id).exists():
            raise ValidationError(
                {"content_id": "Invalid content_id for that resource_type"}
            )

        return attrs

    class Meta:
        model = ContentTypeInteraction
        fields = ("interaction_type", "content_type", "content_id")


get_content_type_id = itemgetter("content_type_id")


class PopularContentListSerializer(serializers.ListSerializer):
    """ListSerializer for popular content"""

    def to_representation(self, data):
        user = self.context["request"].user

        # group the data by content_type_id
        items_by_content_type_id = {
            key: list(value)
            for key, value in groupby(
                sorted(data, key=get_content_type_id), get_content_type_id
            )
        }

        content_types_by_id = ContentType.objects.in_bulk(
            items_by_content_type_id.keys()
        )

        # fetch the items by content type to avoid N+1 lookups
        fetched_items = {}

        for content_type_id, items in items_by_content_type_id.items():
            content_type = content_types_by_id[content_type_id]
            content_ids = [item["content_id"] for item in items]
            content_model = content_type.model_class()

            query = (
                content_model.objects.filter(id__in=content_ids)
                .prefetch_related("offered_by")
                .annotate_is_favorite_for_user(user)
                .prefetch_list_items_for_user(user)
            )

            if content_model in (Course, Program):
                query = query.prefetch_related(
                    "topics",
                    "runs__instructors",
                    "runs__prices",
                    "runs__offered_by",
                    "runs__topics",
                )

            if content_model == Course:
                query = query.defer("raw_json")

            if content_model in (Course, Program):
                query = query.defer("runs__raw_json")

            # key items off the type and item id
            for item in query:
                fetched_items[(content_type_id, item.id)] = item

        item_keys = [(item["content_type_id"], item["content_id"]) for item in data]

        # return the items in the correct order
        # we'll use the GenericForeignKeyFieldSerializer from course_catalog
        # since those will be the only favorited items for now
        return [
            GenericForeignKeyFieldSerializer(
                instance=fetched_items[item_key], context=self.context
            ).data
            for item_key in item_keys
            if item_key in fetched_items
        ]


class PopularContentSerializer(serializers.Serializer):
    """Popular content serializer"""

    # this serializer is only for the read-only list() action,
    # so it only ever uses list_serializer_class
    class Meta:
        list_serializer_class = PopularContentListSerializer
