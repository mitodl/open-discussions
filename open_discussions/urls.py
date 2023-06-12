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
from django.urls import include, re_path
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
    re_path(r"^admin/", admin.site.urls),
    re_path(r"", include("authentication.urls")),
    re_path(r"", include("social_django.urls", namespace="social")),
    re_path(r"", include("channels.urls")),
    re_path(r"", include("channels_fields.urls")),
    re_path(r"", include("infinite_example.urls"), name="infinite_example"),
    re_path(r"", include("profiles.urls")),
    re_path(r"", include("mail.urls")),
    re_path(r"", include("notifications.urls")),
    re_path(r"", include("embedly.urls")),
    re_path(r"", include("search.urls")),
    re_path(r"", include("ckeditor.urls")),
    re_path(r"", include("widgets.urls")),
    re_path(r"", include("course_catalog.urls")),
    re_path(r"", include("livestream.urls")),
    re_path(r"", include("interactions.urls")),
    re_path(r"^api/token/refresh/", refresh_jwt_token),
    # React App
    re_path(r"^$", index, name="open_discussions-index"),
    re_path(r"^auth_required/$", index),
    re_path(r"^content_policy/$", index),
    re_path(
        r"^c/(?P<channel_name>[A-Za-z0-9_]+)/(?P<post_id>[A-Za-z0-9_]+)/"
        r"(?P<post_slug>{post_slug_pattern})/comment/(?P<comment_id>[A-Za-z0-9_]+)/?$".format(
            post_slug_pattern=POST_SLUG_PATTERN
        ),
        channel_post,
        name="channel-post-comment",
    ),
    re_path(
        r"^c/(?P<channel_name>[A-Za-z0-9_]+)/(?P<post_id>[A-Za-z0-9_]+)/(?P<post_slug>{post_slug_pattern})/?$".format(
            post_slug_pattern=POST_SLUG_PATTERN
        ),
        channel_post,
        name="channel-post",
    ),
    re_path(r"^c/(?P<channel_name>[A-Za-z0-9_]+)/$", index, name="channel"),
    re_path(
        r"^manage/c/edit/(?P<channel_name>[A-Za-z0-9_]+)/basic/$",
        index,
        name="manage-channel",
    ),
    re_path(r"^settings/(?P<token>[^/]+)/$", index, name="settings-anon"),
    re_path(r"^c/", index),
    re_path(r"^channel/", channel_redirect),
    re_path(r"^manage/", index),
    re_path(r"^create_post/", index),
    re_path(r"^settings/", index),
    re_path(r"^saml/metadata/", saml_metadata, name="saml-metadata"),
    re_path(r"^profile/(?P<username>[A-Za-z0-9_]+)/", index, name="profile"),
    re_path(r"^login/", index, name="login"),
    re_path(r"^signup/", index, name="signup"),
    re_path(r"^signup/confirm/$", index, name="register-confirm"),
    re_path(r"^account/inactive/$", index, name="account-inactive"),
    re_path(r"^password_reset/", index, name="password-reset"),
    re_path(
        r"^password_reset/confirm/(?P<uid>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,36})/$",
        index,
        name="password-reset-confirm",
    ),
    re_path(r"^privacy-statement/", index, name="privacy-statement"),
    re_path(r"^search/", index, name="site-search"),
    re_path(r"^courses/", index, name="courses"),
    re_path(r"^learn/", index, name="learn"),
    re_path(r"^fields/", index, name="fields"),
    re_path(r"^podcasts/", index, name="podcasts"),
    re_path(r"^terms-and-conditions/", index, name="terms-and-conditions"),
    # Hijack
    re_path(r"^hijack/", include("hijack.urls", namespace="hijack")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    import debug_toolbar  # pylint: disable=wrong-import-position, wrong-import-order

    urlpatterns += [re_path(r"^__debug__/", include(debug_toolbar.urls))]
