""" Admin for channels """
from django.contrib import admin
from django.contrib.postgres import fields
from django_json_widget.widgets import JSONEditorWidget

from channels.models import (
    Channel,
    ChannelInvitation,
    ChannelMembershipConfig,
    SpamCheckResult,
)
from open_discussions.utils import get_field_names


class ChannelAdmin(admin.ModelAdmin):
    """Customized Channel admin model"""

    model = Channel
    exclude = ("banner", "avatar", "widget_list", "allowed_post_types")
    search_fields = ("name",)
    readonly_fields = ("name",)
    list_filter = ("ga_tracking_id",)

    def has_add_permission(self, request):
        return False


admin.site.register(Channel, ChannelAdmin)


class ChannelInvitationAdmin(admin.ModelAdmin):
    """Customized ChannelInvitation admin model"""

    model = ChannelInvitation
    search_fields = ("email", "user__email", "inviter__email")

    def has_change_permission(self, request, obj=None):
        return False


admin.site.register(ChannelInvitation, ChannelInvitationAdmin)


class ChannelMembershipConfigAdmin(admin.ModelAdmin):
    """Admin for ChannelMembershipConfig"""

    model = ChannelMembershipConfig

    formfield_overrides = {
        fields.JSONField: {
            "widget": JSONEditorWidget(
                options={
                    "mode": "tree",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "email__iendswith": {"type": "string"},
                            "social_auth_provider": {
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "enum": ["saml", "micromasters"],
                                },
                                "minItems": 1,
                            },
                            "moira_lists": {
                                "type": "array",
                                "items": {"type": "string"},
                                "minItems": 0,
                            },
                        },
                        "minProperties": 1,
                        "additionalProperties": False,
                    },
                    "templates": [
                        {
                            "text": "Email suffix",
                            "title": "Email suffix",
                            "field": "email__endswith",
                            "value": "@example.com",
                        },
                        {
                            "text": "Social Auth",
                            "title": "Social Auth",
                            "field": "social_auth_provider",
                            "value": [""],
                        },
                        {
                            "text": "Moira Lists",
                            "title": "Moira Lists",
                            "field": "moira_lists",
                            "value": [""],
                        },
                    ],
                }
            )
        }
    }


admin.site.register(ChannelMembershipConfig, ChannelMembershipConfigAdmin)


class SpamCheckResultAdmin(admin.ModelAdmin):
    """Customized SpamCheckResult admin model"""

    model = SpamCheckResult
    search_fields = ("object_id", "user_ip")
    list_filter = ("content_type", "is_spam")
    list_display = ("content_type", "object_id", "user_ip", "is_spam")
    readonly_fields = get_field_names(SpamCheckResult)

    def has_add_permission(self, request):
        return False


admin.site.register(SpamCheckResult, SpamCheckResultAdmin)
