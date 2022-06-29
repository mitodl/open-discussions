"""URL configuration for infinite_example"""
from django.conf.urls import url
from infinite_example.views import index
from django.conf import settings

print("ENABLE_INFINITE_CORRIDOR")
print(settings.ENABLE_INFINITE_CORRIDOR)

urlpatterns = [url(r"^infinite", index)] if settings.ENABLE_INFINITE_CORRIDOR else []
