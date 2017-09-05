"""Subscribe models"""
from django.db import models
from django.conf import settings


class UnSubscribeStatus(models.Model):
    """Subscribe model"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL)
    is_unsubscribe = models.BooleanField(default=False)
    channel_name = models.TextField(blank=False, null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
