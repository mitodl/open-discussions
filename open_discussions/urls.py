"""project URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.8/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Add an import:  from blog import urls as blog_urls
    2. Add a URL to urlpatterns:  url(r'^blog/', include(blog_urls))
"""
from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.contrib import admin
from rest_framework_jwt.views import refresh_jwt_token

from open_discussions.views import index

urlpatterns = [
    url(r'^admin/', admin.site.urls),
    url(r'^status/', include('server_status.urls')),
    url(r'', include('authentication.urls')),
    url(r'', include('social_django.urls', namespace='social')),
    url(r'', include('channels.urls')),
    url(r'', include('profiles.urls')),
    url(r'', include('notifications.urls')),
    url(r'', include('embedly.urls')),
    url(r'^api/token/refresh/', refresh_jwt_token),

    # React App
    url(r'^$', index, name='open_discussions-index'),
    url(r'^auth_required/$', index),
    url(r'^content_policy/$', index),
    url(  # so that we can use reverse() to link to this
        r'^channel/(?P<channel_name>[A-Za-z0-9_]+)/(?P<post_id>[A-Za-z0-9_]+)/comment/(?P<comment_id>[A-Za-z0-9_]+)/$',
        index,
        name='channel-post-comment',
    ),
    url(  # so that we can use reverse() to link to this
        r'^channel/(?P<channel_name>[A-Za-z0-9_]+)/(?P<post_id>[A-Za-z0-9_]+)/$',
        index,
        name='channel-post',
    ),
    url(  # so that we can use reverse() to link to this
        r'^channel/(?P<channel_name>[A-Za-z0-9_]+)/$',
        index,
        name='channel',
    ),
    url(r'^settings/(?P<token>[^/]+)/$', index, name='settings-anon'),
    url(r'^channel/', index),
    url(r'^manage/', index),
    url(r'^create_post/', index),
    url(r'^moderation/', index),
    url(r'^settings/', index),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    import debug_toolbar  # pylint: disable=wrong-import-position, wrong-import-order
    urlpatterns += [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ]
