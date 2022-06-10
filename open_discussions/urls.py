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

from open_discussions.views import index, saml_metadata, channel_redirect, channel_post

# Post slugs can contain unicode characters, so a letter-matching pattern like [A-Za-z] doesn't work.
# "[^\W]" Matches any character that is NOT a non-alphanumeric character, including underscores.
# "[^\W]" will match all numbers, underscores, and letters, unicode or otherwise. To accept dashes
# as well, that character is added to the pattern via an alternation (|).
POST_SLUG_PATTERN = "([^\\W]|-)+"

handler400 = "open_discussions.views.handle_400"
handler403 = "open_discussions.views.handle_403"
handler404 = "open_discussions.views.handle_404"

urlpatterns = [
    url(r"^admin/", admin.site.urls),
    url(r"^status/", include("server_status.urls")),
    url(r"", include("authentication.urls")),
    url(r"", include("social_django.urls", namespace="social")),
    url(r"", include("channels.urls")),
    url(r"", include("field_channels.urls")),
    url(r"", include("profiles.urls")),
    url(r"", include("mail.urls")),
    url(r"", include("notifications.urls")),
    url(r"", include("embedly.urls")),
    url(r"", include("search.urls")),
    url(r"", include("ckeditor.urls")),
    url(r"", include("widgets.urls")),
    url(r"", include("course_catalog.urls")),
    url(r"", include("livestream.urls")),
    url(r"", include("interactions.urls")),
    url(r"^api/token/refresh/", refresh_jwt_token),
    # React App
    url(r"^$", index, name="open_discussions-index"),
    url(r"^auth_required/$", index),
    url(r"^content_policy/$", index),
    url(
        r"^c/(?P<channel_name>[A-Za-z0-9_]+)/(?P<post_id>[A-Za-z0-9_]+)/"
        r"(?P<post_slug>{post_slug_pattern})/comment/(?P<comment_id>[A-Za-z0-9_]+)/?$".format(
            post_slug_pattern=POST_SLUG_PATTERN
        ),
        channel_post,
        name="channel-post-comment",
    ),
    url(
        r"^c/(?P<channel_name>[A-Za-z0-9_]+)/(?P<post_id>[A-Za-z0-9_]+)/(?P<post_slug>{post_slug_pattern})/?$".format(
            post_slug_pattern=POST_SLUG_PATTERN
        ),
        channel_post,
        name="channel-post",
    ),
    url(r"^c/(?P<channel_name>[A-Za-z0-9_]+)/$", index, name="channel"),
    url(
        r"^manage/c/edit/(?P<channel_name>[A-Za-z0-9_]+)/basic/$",
        index,
        name="manage-channel",
    ),
    url(r"^settings/(?P<token>[^/]+)/$", index, name="settings-anon"),
    url(r"^c/", index),
    url(r"^channel/", channel_redirect),
    url(r"^manage/", index),
    url(r"^create_post/", index),
    url(r"^settings/", index),
    url(r"^saml/metadata/", saml_metadata, name="saml-metadata"),
    url(r"^profile/(?P<username>[A-Za-z0-9_]+)/", index, name="profile"),
    url(r"^login/", index, name="login"),
    url(r"^signup/", index, name="signup"),
    url(r"^signup/confirm/$", index, name="register-confirm"),
    url(r"^account/inactive/$", index, name="account-inactive"),
    url(r"^password_reset/", index, name="password-reset"),
    url(
        r"^password_reset/confirm/(?P<uid>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$",
        index,
        name="password-reset-confirm",
    ),
    url(r"^privacy-statement/", index, name="privacy-statement"),
    url(r"^search/", index, name="site-search"),
    url(r"^courses/", index, name="courses"),
    url(r"^learn/", index, name="learn"),
    url(r"^podcasts/", index, name="podcasts"),
    url(r"^terms-and-conditions/", index, name="terms-and-conditions"),
    # Hijack
    url(r"^hijack/", include("hijack.urls", namespace="hijack")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    import debug_toolbar  # pylint: disable=wrong-import-position, wrong-import-order

    urlpatterns += [url(r"^__debug__/", include(debug_toolbar.urls))]
