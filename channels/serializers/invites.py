"""Channel invitation serializers"""
from django.db import transaction

from rest_framework import serializers

from channels.models import ChannelInvitation
from channels import tasks


class ChannelInvitationSerializer(serializers.ModelSerializer):
    """Serializer for channel invitations"""

    def create(self, validated_data):
        with transaction.atomic():
            invite, _ = ChannelInvitation.objects.get_or_create(
                email=validated_data["email"],
                channel=self.context["channel"],
                inviter=self.context["inviter"],
            )

            tasks.send_invitation_email.delay(invite.id)

        return invite

    class Meta:
        model = ChannelInvitation
        fields = ("id", "email", "created_on", "updated_on")
        read_only_fields = ("id", "created_on", "updated_on")
