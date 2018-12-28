"""
Serializers for report REST APIs
"""

from praw.models import Comment
from praw.models.reddit.submission import Submission
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from channels.proxies import proxy_post
from channels.serializers.comments import CommentSerializer
from channels.serializers.posts import PostSerializer


class ReportSerializer(serializers.Serializer):
    """Serializer for reporting posts and comments"""

    post_id = serializers.CharField(required=False)
    comment_id = serializers.CharField(required=False)
    reason = serializers.CharField(max_length=100)

    def validate(self, attrs):
        """Validate data"""
        if "post_id" not in attrs and "comment_id" not in attrs:
            raise ValidationError(
                "You must provide one of either 'post_id' or 'comment_id'"
            )
        elif "post_id" in attrs and "comment_id" in attrs:
            raise ValidationError(
                "You must provide only one of either 'post_id' or 'comment_id', not both"
            )

        return attrs

    def create(self, validated_data):
        """Create a new report"""
        api = self.context["channel_api"]
        post_id = validated_data.get("post_id", None)
        comment_id = validated_data.get("comment_id", None)
        reason = validated_data["reason"]
        result = {"reason": reason}
        if post_id:
            api.report_post(post_id, reason)
            result["post_id"] = post_id
        else:
            api.report_comment(comment_id, reason)
            result["comment_id"] = comment_id
        return result


class ReportedContentSerializer(serializers.Serializer):
    """
    Serializer for reported content
    """

    comment = serializers.SerializerMethodField()
    post = serializers.SerializerMethodField()
    reasons = serializers.SerializerMethodField()

    def get_comment(self, instance):
        """Returns the comment if this report was for one"""
        if isinstance(instance, Comment):
            return CommentSerializer(instance, context=self.context).data

        return None

    def get_post(self, instance):
        """Returns the post if this report was for one"""
        if isinstance(instance, Submission):
            return PostSerializer(proxy_post(instance), context=self.context).data

        return None

    def get_reasons(self, instance):
        """
        Returns the reasons that have been reported so far

        Returns:
            list of str: list of reasons a post/comment has been reported for
        """
        return sorted(
            {report[0] for report in instance.user_reports + instance.mod_reports}
        )
