"""
Django settings for open_discussions.


For more information on this file, see
https://docs.djangoproject.com/en/1.10/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.10/ref/settings/

"""
import datetime
import logging
import os
import platform
from urllib.parse import urljoin, urlparse

import dj_database_url
from celery.schedules import crontab
from django.core.exceptions import ImproperlyConfigured

from open_discussions.envs import (
    get_any,
    get_bool,
    get_int,
    get_string,
    get_list_of_str,
    get_key,
)
from open_discussions.sentry import init_sentry

VERSION = "0.118.0"

ENVIRONMENT = get_string("OPEN_DISCUSSIONS_ENVIRONMENT", "dev")

# initialize Sentry before doing anything else so we capture any config errors
SENTRY_DSN = get_string("SENTRY_DSN", "")
SENTRY_LOG_LEVEL = get_string("SENTRY_LOG_LEVEL", "ERROR")
init_sentry(
    dsn=SENTRY_DSN, environment=ENVIRONMENT, version=VERSION, log_level=SENTRY_LOG_LEVEL
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.8/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_string("SECRET_KEY", "terribly_unsafe_default_secret_key")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_bool("DEBUG", False)

ALLOWED_HOSTS = ["*"]

SECURE_SSL_REDIRECT = get_bool("OPEN_DISCUSSIONS_SECURE_SSL_REDIRECT", True)

SITE_BASE_URL = get_string("OPEN_DISCUSSIONS_BASE_URL", None)
if not SITE_BASE_URL:
    raise ImproperlyConfigured("OPEN_DISCUSSIONS_BASE_URL is not set")


WEBPACK_LOADER = {
    "DEFAULT": {
        "CACHE": not DEBUG,
        "BUNDLE_DIR_NAME": "bundles/",
        "STATS_FILE": os.path.join(BASE_DIR, "webpack-stats.json"),
        "POLL_INTERVAL": 0.1,
        "TIMEOUT": None,
        "IGNORE": [r".+\.hot-update\.+", r".+\.js\.map"],
    }
}


# Application definition

INSTALLED_APPS = (
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
    "social_django",
    "server_status",
    "rest_framework",
    "corsheaders",
    "anymail",
    "compat",
    "hijack",
    "hijack_admin",
    "guardian",
    "django_json_widget",
    # Put our apps after this point
    "open_discussions",
    "authentication",
    "channels",
    "profiles",
    "sites",
    "mail",
    "notifications",
    "search",
    "widgets",
    "course_catalog",
    "interactions",
    "moira_lists",
)

DISABLE_WEBPACK_LOADER_STATS = get_bool("DISABLE_WEBPACK_LOADER_STATS", False)
if not DISABLE_WEBPACK_LOADER_STATS:
    INSTALLED_APPS += ("webpack_loader",)

MIDDLEWARE = (
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "open_discussions.middleware.user_activity.UserActivityMiddleware",
    "open_discussions.middleware.channel_api.ChannelApiMiddleware",
    "authentication.middleware.SocialAuthExceptionRedirectMiddleware",
)

# CORS
CORS_ORIGIN_WHITELIST = get_list_of_str("OPEN_DISCUSSIONS_CORS_ORIGIN_WHITELIST", [])
CORS_ALLOW_CREDENTIALS = True

# enable the nplusone profiler only in debug mode
if DEBUG:
    INSTALLED_APPS += ("nplusone.ext.django",)
    MIDDLEWARE += ("nplusone.ext.django.NPlusOneMiddleware",)

SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"

LOGIN_REDIRECT_URL = "/"
LOGIN_URL = "/login"
LOGIN_ERROR_URL = "/login"
LOGOUT_URL = "/logout"
LOGOUT_REDIRECT_URL = "/"

ROOT_URLCONF = "open_discussions.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR + "/templates/"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ]
        },
    }
]

WSGI_APPLICATION = "open_discussions.wsgi.application"


# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases
# Uses DATABASE_URL to configure with sqlite default:
# For URL structure:
# https://github.com/kennethreitz/dj-database-url
DEFAULT_DATABASE_CONFIG = dj_database_url.parse(
    get_string(
        "DATABASE_URL", "sqlite:///{0}".format(os.path.join(BASE_DIR, "db.sqlite3"))
    )
)
DEFAULT_DATABASE_CONFIG["DISABLE_SERVER_SIDE_CURSORS"] = get_bool(
    "OPEN_DISCUSSIONS_DB_DISABLE_SS_CURSORS", True
)
DEFAULT_DATABASE_CONFIG["CONN_MAX_AGE"] = get_int("OPEN_DISCUSSIONS_DB_CONN_MAX_AGE", 0)

if get_bool("OPEN_DISCUSSIONS_DB_DISABLE_SSL", False):
    DEFAULT_DATABASE_CONFIG["OPTIONS"] = {}
else:
    DEFAULT_DATABASE_CONFIG["OPTIONS"] = {"sslmode": "require"}


DATABASES = {"default": DEFAULT_DATABASE_CONFIG}

# Internationalization
# https://docs.djangoproject.com/en/1.8/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True

# social auth
AUTHENTICATION_BACKENDS = (
    "authentication.backends.micromasters.MicroMastersAuth",
    "social_core.backends.email.EmailAuth",
    "social_core.backends.saml.SAMLAuth",
    # the following needs to stay here to allow login of local users
    "django.contrib.auth.backends.ModelBackend",
    "guardian.backends.ObjectPermissionBackend",
)

SOCIAL_AUTH_STRATEGY = "authentication.strategy.OpenDiscussionsStrategy"

SOCIAL_AUTH_LOGIN_REDIRECT_URL = "login-complete"
SOCIAL_AUTH_LOGIN_ERROR_URL = "login"
SOCIAL_AUTH_ALLOWED_REDIRECT_HOSTS = [urlparse(SITE_BASE_URL).netloc]

# Micromasters backend settings
SOCIAL_AUTH_MICROMASTERS_LOGIN_URL = get_string(
    "SOCIAL_AUTH_MICROMASTERS_LOGIN_URL", None
)

# Email backend settings
SOCIAL_AUTH_EMAIL_FORM_URL = "login"
SOCIAL_AUTH_EMAIL_FORM_HTML = "login.html"


# SAML backend settings
SOCIAL_AUTH_SAML_LOGIN_URL = get_string("SOCIAL_AUTH_SAML_LOGIN_URL", None)

# Only validate emails for the email backend
SOCIAL_AUTH_EMAIL_FORCE_EMAIL_VALIDATION = True

# Configure social_core.pipeline.mail.mail_validation
SOCIAL_AUTH_EMAIL_VALIDATION_FUNCTION = "mail.verification_api.send_verification_email"
SOCIAL_AUTH_EMAIL_VALIDATION_URL = "/"

SOCIAL_AUTH_PIPELINE = (
    # Checks if an admin user attempts to login/register while hijacking another user.
    "authentication.pipeline.user.forbid_hijack",
    # Checks if the user is attempting to log in with an email and has authenticated via SAML,
    # in which case we want to force them to log in via SAML
    "authentication.pipeline.user.require_touchstone_login",
    # Get the information we can about the user and return it in a simple
    # format to create the user instance later. On some cases the details are
    # already part of the auth response from the provider, but sometimes this
    # could hit a provider API.
    "social_core.pipeline.social_auth.social_details",
    # Get the social uid from whichever service we're authing thru. The uid is
    # the unique identifier of the given user in the provider.
    "social_core.pipeline.social_auth.social_uid",
    # Verifies that the current auth process is valid within the current
    # project, this is where emails and domains whitelists are applied (if
    # defined).
    "social_core.pipeline.social_auth.auth_allowed",
    # Checks if the current social-account is already associated in the site.
    "social_core.pipeline.social_auth.social_user",
    # Associates the current social details with another user account with the same email address.
    "social_core.pipeline.social_auth.associate_by_email",
    # validate an incoming email auth request
    "authentication.pipeline.user.validate_email_auth_request",
    # if the user only has micromasters auth but is trying to login via email
    "authentication.pipeline.user.require_micromasters_provider",
    # require a password and profile if they're not set
    "authentication.pipeline.user.validate_password",
    # Send a validation email to the user to verify its email address.
    # Disabled by default.
    "social_core.pipeline.mail.mail_validation",
    # Generate a username for the user
    # NOTE: needs to be right before create_user so nothing overrides the username
    "authentication.pipeline.user.get_username",
    # Create a user account if we haven't found one yet.
    "social_core.pipeline.user.create_user",
    # require a password and profile if they're not set via Email
    "authentication.pipeline.user.require_password_and_profile_via_email",
    # require a profile if they're not set via SAML
    "authentication.pipeline.user.require_profile_update_user_via_saml",
    # Create the record that associates the social account with the user.
    "social_core.pipeline.social_auth.associate_user",
    # Populate the extra_data field in the social record with the values
    # specified by settings (and the default ones like access_token, etc).
    "social_core.pipeline.social_auth.load_extra_data",
    # Update the user record with any changed info from the auth service.
    "social_core.pipeline.user.user_details",
    # Resolve outstanding channel invitations
    "authentication.pipeline.invite.resolve_outstanding_channel_invites",
    # Create the moira list associations for the user if any.
    "authentication.pipeline.user.update_moira_lists",
    # update the user's managed channels
    "authentication.pipeline.user.update_managed_channel_memberships",
)


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.8/howto/static-files/

# Serve static files with dj-static
STATIC_URL = "/static/"
CLOUDFRONT_DIST = get_string("CLOUDFRONT_DIST", None)
if CLOUDFRONT_DIST:
    STATIC_URL = urljoin(
        "https://{dist}.cloudfront.net".format(dist=CLOUDFRONT_DIST), STATIC_URL
    )

STATIC_ROOT = "staticfiles"
STATICFILES_DIRS = (os.path.join(BASE_DIR, "static"),)

# Request files from the webpack dev server
USE_WEBPACK_DEV_SERVER = get_bool("OPEN_DISCUSSIONS_USE_WEBPACK_DEV_SERVER", False)
WEBPACK_DEV_SERVER_HOST = get_string("WEBPACK_DEV_SERVER_HOST", "")
WEBPACK_DEV_SERVER_PORT = get_int("WEBPACK_DEV_SERVER_PORT", 8062)

# Important to define this so DEBUG works properly
INTERNAL_IPS = (get_string("HOST_IP", "127.0.0.1"),)

# Configure e-mail settings
EMAIL_BACKEND = get_string(
    "OPEN_DISCUSSIONS_EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = get_string("OPEN_DISCUSSIONS_EMAIL_HOST", "localhost")
EMAIL_PORT = get_int("OPEN_DISCUSSIONS_EMAIL_PORT", 25)
EMAIL_HOST_USER = get_string("OPEN_DISCUSSIONS_EMAIL_USER", "")
EMAIL_HOST_PASSWORD = get_string("OPEN_DISCUSSIONS_EMAIL_PASSWORD", "")
EMAIL_USE_TLS = get_bool("OPEN_DISCUSSIONS_EMAIL_TLS", False)
EMAIL_SUPPORT = get_string("OPEN_DISCUSSIONS_SUPPORT_EMAIL", "support@example.com")
DEFAULT_FROM_EMAIL = get_string("OPEN_DISCUSSIONS_FROM_EMAIL", "webmaster@localhost")


MAILGUN_SENDER_DOMAIN = get_string("MAILGUN_SENDER_DOMAIN", None)
if not MAILGUN_SENDER_DOMAIN:
    raise ImproperlyConfigured("MAILGUN_SENDER_DOMAIN not set")
MAILGUN_KEY = get_string("MAILGUN_KEY", None)
if not MAILGUN_KEY:
    raise ImproperlyConfigured("MAILGUN_KEY not set")
MAILGUN_RECIPIENT_OVERRIDE = get_string("MAILGUN_RECIPIENT_OVERRIDE", None)
MAILGUN_FROM_EMAIL = get_string("MAILGUN_FROM_EMAIL", "no-reply@example.com")
MAILGUN_BCC_TO_EMAIL = get_string("MAILGUN_BCC_TO_EMAIL", None)

ANYMAIL = {
    "MAILGUN_API_KEY": MAILGUN_KEY,
    "MAILGUN_SENDER_DOMAIN": MAILGUN_SENDER_DOMAIN,
}

# e-mail configurable admins
ADMIN_EMAIL = get_string("OPEN_DISCUSSIONS_ADMIN_EMAIL", "")
if ADMIN_EMAIL != "":
    ADMINS = (("Admins", ADMIN_EMAIL),)
else:
    ADMINS = ()

# Email Notifications config

NOTIFICATION_EMAIL_BACKEND = get_string(
    "OPEN_DISCUSSIONS_NOTIFICATION_EMAIL_BACKEND",
    "anymail.backends.mailgun.EmailBackend",
)
# See https://docs.celeryproject.org/en/latest/reference/celery.app.task.html#celery.app.task.Task.rate_limit
NOTIFICATION_ATTEMPT_RATE_LIMIT = get_string(
    "OPEN_DISCUSSIONS_NOTIFICATION_ATTEMPT_RATE_LIMIT", None  # default is no rate limit
)

NOTIFICATION_ATTEMPT_CHUNK_SIZE = get_int(
    "OPEN_DISCUSSIONS_NOTIFICATION_ATTEMPT_CHUNK_SIZE", 100
)
NOTIFICATION_SEND_CHUNK_SIZE = get_int(
    "OPEN_DISCUSSIONS_NOTIFICATION_SEND_CHUNK_SIZE", 100
)

# SAML settings
SOCIAL_AUTH_SAML_SP_ENTITY_ID = get_string(
    "SOCIAL_AUTH_SAML_SP_ENTITY_ID", SITE_BASE_URL
)
SOCIAL_AUTH_SAML_SP_PUBLIC_CERT = get_string("SOCIAL_AUTH_SAML_SP_PUBLIC_CERT", None)
SOCIAL_AUTH_SAML_SP_PRIVATE_KEY = get_string("SOCIAL_AUTH_SAML_SP_PRIVATE_KEY", None)
SOCIAL_AUTH_SAML_ORG_DISPLAYNAME = get_string(
    "SOCIAL_AUTH_SAML_ORG_DISPLAYNAME", "Open Discussions"
)
SOCIAL_AUTH_SAML_CONTACT_NAME = get_string(
    "SOCIAL_AUTH_SAML_CONTACT_NAME", "Open Discussions Support"
)
SOCIAL_AUTH_SAML_IDP_ENTITY_ID = get_string("SOCIAL_AUTH_SAML_IDP_ENTITY_ID", None)
SOCIAL_AUTH_SAML_IDP_URL = get_string("SOCIAL_AUTH_SAML_IDP_URL", None)
SOCIAL_AUTH_SAML_IDP_X509 = get_string("SOCIAL_AUTH_SAML_IDP_X509", False)
SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_PERM_ID = get_string(
    "SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_PERM_ID", None
)
SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_NAME = get_string(
    "SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_NAME", None
)
SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_EMAIL = get_string(
    "SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_EMAIL", None
)
SOCIAL_AUTH_SAML_SECURITY_ENCRYPTED = get_bool(
    "SOCIAL_AUTH_SAML_SECURITY_ENCRYPTED", False
)

SOCIAL_AUTH_SAML_ORG_INFO = {
    "en-US": {
        "name": urlparse(SITE_BASE_URL).netloc,
        "displayname": SOCIAL_AUTH_SAML_ORG_DISPLAYNAME,
        "url": SITE_BASE_URL,
    }
}
SOCIAL_AUTH_SAML_TECHNICAL_CONTACT = {
    "givenName": SOCIAL_AUTH_SAML_CONTACT_NAME,
    "emailAddress": EMAIL_SUPPORT,
}
SOCIAL_AUTH_SAML_SUPPORT_CONTACT = SOCIAL_AUTH_SAML_TECHNICAL_CONTACT
SOCIAL_AUTH_DEFAULT_IDP_KEY = "default"
SOCIAL_AUTH_SAML_ENABLED_IDPS = {
    SOCIAL_AUTH_DEFAULT_IDP_KEY: {
        "entity_id": SOCIAL_AUTH_SAML_IDP_ENTITY_ID,
        "url": SOCIAL_AUTH_SAML_IDP_URL,
        "attr_user_permanent_id": SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_PERM_ID,
        "attr_username": SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_PERM_ID,
        "attr_email": SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_EMAIL,
        "x509cert": SOCIAL_AUTH_SAML_IDP_X509,
    }
}


SOCIAL_AUTH_SAML_SECURITY_CONFIG = {
    "wantAssertionsEncrypted": SOCIAL_AUTH_SAML_SECURITY_ENCRYPTED,
    "requestedAuthnContext": False,
}


# embed.ly configuration
EMBEDLY_KEY = get_string("EMBEDLY_KEY", None)
EMBEDLY_EMBED_URL = get_string("EMBEDLY_EMBED_URL", "https://api.embed.ly/1/oembed")
EMBEDLY_EXTRACT_URL = get_string("EMBEDLY_EMBED_URL", "https://api.embed.ly/1/extract")

# configuration for CKEditor token endpoint
CKEDITOR_ENVIRONMENT_ID = get_string("CKEDITOR_ENVIRONMENT_ID", None)
CKEDITOR_SECRET_KEY = get_string("CKEDITOR_SECRET_KEY", None)
CKEDITOR_UPLOAD_URL = get_string("CKEDITOR_UPLOAD_URL", None)

# Logging configuration
LOG_LEVEL = get_string("OPEN_DISCUSSIONS_LOG_LEVEL", "INFO")
DJANGO_LOG_LEVEL = get_string("DJANGO_LOG_LEVEL", "INFO")
ES_LOG_LEVEL = get_string("ES_LOG_LEVEL", "INFO")

# For logging to a remote syslog host
LOG_HOST = get_string("OPEN_DISCUSSIONS_LOG_HOST", "localhost")
LOG_HOST_PORT = get_int("OPEN_DISCUSSIONS_LOG_HOST_PORT", 514)

HOSTNAME = platform.node().split(".")[0]

# nplusone profiler logger configuration
NPLUSONE_LOGGER = logging.getLogger("nplusone")
NPLUSONE_LOG_LEVEL = logging.ERROR

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {"require_debug_false": {"()": "django.utils.log.RequireDebugFalse"}},
    "formatters": {
        "verbose": {
            "format": (
                "[%(asctime)s] %(levelname)s %(process)d [%(name)s] "
                "%(filename)s:%(lineno)d - "
                "[{hostname}] - %(message)s"
            ).format(hostname=HOSTNAME),
            "datefmt": "%Y-%m-%d %H:%M:%S",
        }
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "syslog": {
            "level": LOG_LEVEL,
            "class": "logging.handlers.SysLogHandler",
            "facility": "local7",
            "formatter": "verbose",
            "address": (LOG_HOST, LOG_HOST_PORT),
        },
        "mail_admins": {
            "level": "ERROR",
            "filters": ["require_debug_false"],
            "class": "django.utils.log.AdminEmailHandler",
        },
    },
    "loggers": {
        "django": {
            "propagate": True,
            "level": DJANGO_LOG_LEVEL,
            "handlers": ["console", "syslog"],
        },
        "django.request": {
            "handlers": ["mail_admins"],
            "level": DJANGO_LOG_LEVEL,
            "propagate": True,
        },
        "elasticsearch": {"level": ES_LOG_LEVEL},
        "nplusone": {"handlers": ["console"], "level": "ERROR"},
        "boto3": {"handlers": ["console"], "level": "ERROR"},
    },
    "root": {"handlers": ["console", "syslog"], "level": LOG_LEVEL},
}

STATUS_TOKEN = get_string("STATUS_TOKEN", "")
HEALTH_CHECK = ["CELERY", "REDIS", "POSTGRES", "ELASTIC_SEARCH"]

GA_TRACKING_ID = get_string("GA_TRACKING_ID", "")
REACT_GA_DEBUG = get_bool("REACT_GA_DEBUG", False)

RECAPTCHA_SITE_KEY = get_string("RECAPTCHA_SITE_KEY", "")
RECAPTCHA_SECRET_KEY = get_string("RECAPTCHA_SECRET_KEY", "")

MEDIA_ROOT = get_string("MEDIA_ROOT", "/var/media/")
MEDIA_URL = "/media/"
OPEN_DISCUSSIONS_USE_S3 = get_bool("OPEN_DISCUSSIONS_USE_S3", False)
AWS_ACCESS_KEY_ID = get_string("AWS_ACCESS_KEY_ID", False)
AWS_SECRET_ACCESS_KEY = get_string("AWS_SECRET_ACCESS_KEY", False)
AWS_STORAGE_BUCKET_NAME = get_string("AWS_STORAGE_BUCKET_NAME", False)
AWS_QUERYSTRING_AUTH = get_string("AWS_QUERYSTRING_AUTH", False)
# Provide nice validation of the configuration
if OPEN_DISCUSSIONS_USE_S3 and (
    not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_STORAGE_BUCKET_NAME
):
    raise ImproperlyConfigured(
        "You have enabled S3 support, but are missing one of "
        "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or "
        "AWS_STORAGE_BUCKET_NAME"
    )
if OPEN_DISCUSSIONS_USE_S3:
    # Configure Django Storages to use Cloudfront distribution for S3 assets
    if CLOUDFRONT_DIST:
        AWS_S3_CUSTOM_DOMAIN = "{dist}.cloudfront.net".format(dist=CLOUDFRONT_DIST)
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto.S3BotoStorage"

# Celery
USE_CELERY = True
CELERY_BROKER_URL = get_string("CELERY_BROKER_URL", get_string("REDISCLOUD_URL", None))
CELERY_RESULT_BACKEND = get_string(
    "CELERY_RESULT_BACKEND", get_string("REDISCLOUD_URL", None)
)
CELERY_TASK_ALWAYS_EAGER = get_bool("CELERY_TASK_ALWAYS_EAGER", False)
CELERY_TASK_EAGER_PROPAGATES = get_bool("CELERY_TASK_EAGER_PROPAGATES", True)

CELERY_BEAT_SCHEDULE = {
    "evict-expired-access-tokens-every-1-hrs": {
        "task": "channels.tasks.evict_expired_access_tokens",
        "schedule": crontab(minute=0, hour="*"),
    },
    "send-unsent-emails-every-1-mins": {
        "task": "notifications.tasks.send_unsent_email_notifications",
        "schedule": crontab(minute="*"),
    },
    "send-frontpage-digests-every-1-days": {
        "task": "notifications.tasks.send_daily_frontpage_digests",
        "schedule": crontab(minute=0, hour=14),  # 10am EST
    },
    "send-frontpage-digests-every-1-weeks": {
        "task": "notifications.tasks.send_weekly_frontpage_digests",
        "schedule": crontab(minute=0, hour=14, day_of_week=2),  # 10am EST on tuesdays
    },
    "update_edx-courses-every-1-days": {
        "task": "course_catalog.tasks.get_mitx_data",
        "schedule": crontab(minute=30, hour=13),  # 9:30am EST
    },
    "update_ocw-courses-every-1-days": {
        "task": "course_catalog.tasks.get_ocw_data",
        "schedule": crontab(minute=30, hour=14),  # 10:30am EST
    },
    "update_bootcamp-courses-every-1-days": {
        "task": "course_catalog.tasks.get_bootcamp_data",
        "schedule": crontab(minute=30, hour=15),  # 11:30am EST
    },
    "update-micromasters-courses-every-1-days": {
        "task": "course_catalog.tasks.get_micromasters_data",
        "schedule": crontab(minute=30, hour=16),  # 12:30pm EST
    },
    "update-xpro-courses-every-1-days": {
        "task": "course_catalog.tasks.get_xpro_data",
        "schedule": crontab(minute=30, hour=17),  # 1:30pm EST
    },
    "update-xpro-files-every-1-days": {
        "task": "course_catalog.tasks.import_all_xpro_files",
        "schedule": crontab(minute=0, hour=18),  # 2:00pm EST
    },
    "update-oll-courses-every-1-days": {
        "task": "course_catalog.tasks.get_oll_data",
        "schedule": crontab(minute=30, hour=18),  # 2:30pm EST
    },
    "update-see-courses-every-1-days": {
        "task": "course_catalog.tasks.get_see_data",
        "schedule": crontab(minute=00, hour=19),  # 3:00pm EST
    },
    "update-mitpe-courses-every-1-days": {
        "task": "course_catalog.tasks.get_mitpe_data",
        "schedule": crontab(minute=30, hour=19),  # 3:30pm EST
    },
    "update-csail-courses-every-1-days": {
        "task": "course_catalog.tasks.get_csail_data",
        "schedule": crontab(minute=00, hour=20),  # 4:00pm EST
    },
    "update-youtube-videos": {
        "task": "course_catalog.tasks.get_youtube_data",
        "schedule": get_int(
            "YOUTUBE_FETCH_SCHEDULE_SECONDS", 60 * 30
        ),  # default is every 30 minutes
    },
    "update-youtube-transcripts": {
        "task": "course_catalog.tasks.get_youtube_transcripts",
        "schedule": get_int(
            "YOUTUBE_FETCH_TRANSCRIPT_SCHEDULE_SECONDS", 60 * 60 * 12
        ),  # default is 12 hours
    },
    "update-managed-channel-memberships": {
        "task": "channels.tasks.update_memberships_for_managed_channels",
        "schedule": crontab(minute=30, hour=10),  # 6:30am EST
    },
}

CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = "UTC"


# django cache back-ends
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "local-in-memory-cache",
    },
    "external_assets": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "external_asset_cache",
    },
    "redis": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": CELERY_BROKER_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    },
}


# Elasticsearch
ELASTICSEARCH_DEFAULT_PAGE_SIZE = get_int("ELASTICSEARCH_DEFAULT_PAGE_SIZE", 6)
ELASTICSEARCH_URL = get_string("ELASTICSEARCH_URL", None)
if not ELASTICSEARCH_URL:
    raise ImproperlyConfigured("Missing ELASTICSEARCH_URL")
if get_string("HEROKU_PARENT_APP_NAME", None) is not None:
    ELASTICSEARCH_INDEX = get_string("HEROKU_APP_NAME", None)
else:
    ELASTICSEARCH_INDEX = get_string("ELASTICSEARCH_INDEX", None)
if not ELASTICSEARCH_INDEX:
    raise ImproperlyConfigured("Missing ELASTICSEARCH_INDEX")
ELASTICSEARCH_HTTP_AUTH = get_string("ELASTICSEARCH_HTTP_AUTH", None)
ELASTICSEARCH_INDEXING_CHUNK_SIZE = get_int("ELASTICSEARCH_INDEXING_CHUNK_SIZE", 100)
ELASTICSEARCH_MIN_QUERY_SIZE = get_int("ELASTICSEARCH_MIN_QUERY_SIZE", 2)
ELASTICSEARCH_MAX_SUGGEST_HITS = get_int("ELASTICSEARCH_MAX_SUGGEST_HITS", 1)
ELASTICSEARCH_MAX_SUGGEST_RESULTS = get_int("ELASTICSEARCH_MAX_SUGGEST_RESULTS", 1)
INDEXING_API_USERNAME = get_string("INDEXING_API_USERNAME", None)
if not INDEXING_API_USERNAME:
    raise ImproperlyConfigured("Missing setting INDEXING_API_USERNAME")
INDEXING_ERROR_RETRIES = get_int("INDEXING_ERROR_RETRIES", 1)

# reddit-specific settings
OPEN_DISCUSSIONS_REDDIT_CLIENT_ID = get_string(
    "OPEN_DISCUSSIONS_REDDIT_CLIENT_ID", None
)
OPEN_DISCUSSIONS_REDDIT_SECRET = get_string("OPEN_DISCUSSIONS_REDDIT_SECRET", None)
OPEN_DISCUSSIONS_REDDIT_URL = get_string("OPEN_DISCUSSIONS_REDDIT_URL", "")
OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL = get_bool(
    "OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL", True
)
OPEN_DISCUSSIONS_REDDIT_ACCESS_TOKEN = get_string(
    "OPEN_DISCUSSIONS_REDDIT_ACCESS_TOKEN", "INSECURE"
)
OPEN_DISCUSSIONS_REDDIT_COMMENTS_LIMIT = get_int(
    "OPEN_DISCUSSIONS_REDDIT_COMMENTS_LIMIT", 50
)

# JWT authentication settings
OPEN_DISCUSSIONS_JWT_SECRET = get_string(
    "OPEN_DISCUSSIONS_JWT_SECRET", "terribly_unsafe_default_jwt_secret_key"
)

OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = get_int("OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT", 25)
OPEN_DISCUSSIONS_MAX_COMMENT_DEPTH = get_int("OPEN_DISCUSSIONS_MAX_COMMENT_DEPTH", 6)

OPEN_DISCUSSIONS_COOKIE_NAME = get_string("OPEN_DISCUSSIONS_COOKIE_NAME", None)
if not OPEN_DISCUSSIONS_COOKIE_NAME:
    raise ImproperlyConfigured("OPEN_DISCUSSIONS_COOKIE_NAME is not set")

OPEN_DISCUSSIONS_COOKIE_DOMAIN = get_string("OPEN_DISCUSSIONS_COOKIE_DOMAIN", None)
if not OPEN_DISCUSSIONS_COOKIE_DOMAIN:
    raise ImproperlyConfigured("OPEN_DISCUSSIONS_COOKIE_DOMAIN is not set")

OPEN_DISCUSSIONS_DEFAULT_SITE_KEY = get_string(
    "OPEN_DISCUSSIONS_DEFAULT_SITE_KEY", None
)

if not OPEN_DISCUSSIONS_DEFAULT_SITE_KEY:
    raise ImproperlyConfigured("OPEN_DISCUSSIONS_DEFAULT_SITE_KEY is not set")

OPEN_DISCUSSIONS_UNSUBSCRIBE_TOKEN_MAX_AGE_SECONDS = get_int(
    "OPEN_DISCUSSIONS_UNSUBSCRIBE_TOKEN_MAX_AGE_SECONDS", 60 * 60 * 24 * 7  # 7 days
)

JWT_AUTH = {
    "JWT_SECRET_KEY": OPEN_DISCUSSIONS_JWT_SECRET,
    "JWT_VERIFY": True,
    "JWT_VERIFY_EXPIRATION": True,
    "JWT_EXPIRATION_DELTA": datetime.timedelta(seconds=60 * 60),
    "JWT_ALLOW_REFRESH": True,
    "JWT_REFRESH_EXPIRATION_DELTA": datetime.timedelta(days=7),
    "JWT_AUTH_COOKIE": OPEN_DISCUSSIONS_COOKIE_NAME,
    "JWT_AUTH_HEADER_PREFIX": "Bearer",
    # custom username lookup to handle python-social-auth authentication
    "JWT_PAYLOAD_GET_USERNAME_HANDLER": "authentication.utils.jwt_get_username_from_payload_handler",
}


OPEN_DISCUSSIONS_FRONTPAGE_DIGEST_MAX_POSTS = get_int(
    "OPEN_DISCUSSIONS_FRONTPAGE_DIGEST_MAX_POSTS", 5
)

OPEN_DISCUSSIONS_DEFAULT_CHANNEL_BACKPOPULATE_BATCH_SIZE = get_int(
    "OPEN_DISCUSSIONS_DEFAULT_CHANNEL_BACKPOPULATE_BATCH_SIZE", 1000
)

OPEN_DISCUSSIONS_RELATED_POST_COUNT = get_int("OPEN_DISCUSSIONS_RELATED_POST_COUNT", 4)

# Similar resources settings
OPEN_DISCUSSIONS_SIMILAR_RESOURCES_COUNT = get_int(
    "OPEN_DISCUSSIONS_SIMILAR_RESOURCES_COUNT", 3
)
OPEN_RESOURCES_MIN_DOC_FREQ = get_int("OPEN_RESOURCES_MIN_DOC_FREQ", 1)
OPEN_RESOURCES_MIN_TERM_FREQ = get_int("OPEN_RESOURCES_MIN_TERM_FREQ", 1)

# Only repair the first page worth of posts
OPEN_DISCUSSIONS_HOT_POST_REPAIR_LIMIT = get_int(
    "OPEN_DISCUSSIONS_HOT_POST_REPAIR_LIMIT", OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT
)
OPEN_DISCUSSIONS_HOT_POST_REPAIR_DELAY = get_int(
    "OPEN_DISCUSSIONS_HOT_POST_REPAIR_DELAY", 30
)


# features flags
def get_all_config_keys():
    """Returns all the configuration keys from both environment and configuration files"""
    return list(os.environ.keys())


OPEN_DISCUSSIONS_FEATURES_PREFIX = get_string(
    "OPEN_DISCUSSIONS_FEATURES_PREFIX", "FEATURE_"
)
OPEN_DISCUSSIONS_FEATURES_DEFAULT = get_bool("OPEN_DISCUSSIONS_FEATURES_DEFAULT", False)
FEATURES = {
    key[len(OPEN_DISCUSSIONS_FEATURES_PREFIX) :]: get_any(key, None)
    for key in get_all_config_keys()
    if key.startswith(OPEN_DISCUSSIONS_FEATURES_PREFIX)
}

MIDDLEWARE_FEATURE_FLAG_QS_PREFIX = get_string(
    "MIDDLEWARE_FEATURE_FLAG_QS_PREFIX", None
)
MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME = get_string(
    "MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME", "OPEN_DISCUSSIONS_FEATURE_FLAGS"
)
MIDDLEWARE_FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS = get_int(
    "MIDDLEWARE_FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS", 60 * 60
)

if MIDDLEWARE_FEATURE_FLAG_QS_PREFIX:
    MIDDLEWARE = MIDDLEWARE + (
        "open_discussions.middleware.feature_flags.QueryStringFeatureFlagMiddleware",
        "open_discussions.middleware.feature_flags.CookieFeatureFlagMiddleware",
    )


# django debug toolbar only in debug mode
if DEBUG:
    INSTALLED_APPS += ("debug_toolbar",)
    # it needs to be enabled before other middlewares
    MIDDLEWARE = ("debug_toolbar.middleware.DebugToolbarMiddleware",) + MIDDLEWARE


REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework.authentication.SessionAuthentication",
        "open_discussions.authentication.IgnoreExpiredJwtAuthentication",
    ),
    "EXCEPTION_HANDLER": "open_discussions.exceptions.api_exception_handler",
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

USE_X_FORWARDED_PORT = get_bool("USE_X_FORWARDED_PORT", False)
USE_X_FORWARDED_HOST = get_bool("USE_X_FORWARDED_HOST", False)

# Relative URL to be used by Djoser for the link in the password reset email
# (see: http://djoser.readthedocs.io/en/stable/settings.html#password-reset-confirm-url)
PASSWORD_RESET_CONFIRM_URL = "password_reset/confirm/{uid}/{token}/"

# Djoser library settings (see: http://djoser.readthedocs.io/en/stable/settings.html)
DJOSER = {
    "PASSWORD_RESET_CONFIRM_URL": PASSWORD_RESET_CONFIRM_URL,
    "SET_PASSWORD_RETYPE": False,
    "LOGOUT_ON_PASSWORD_CHANGE": False,
    "PASSWORD_RESET_CONFIRM_RETYPE": True,
    "PASSWORD_RESET_SHOW_EMAIL_NOT_FOUND": True,
    "EMAIL": {"password_reset": "authentication.views.CustomPasswordResetEmail"},
}

# Hijack
HIJACK_ALLOW_GET_REQUESTS = True
HIJACK_LOGOUT_REDIRECT_URL = "/admin/auth/user"

# Guardian
# disable the anonymous user creation
ANONYMOUS_USER_NAME = None

# Algolia Places API
ALGOLIA_APP_ID = get_string("ALGOLIA_APP_ID", None)
ALGOLIA_API_KEY = get_string("ALGOLIA_API_KEY", None)


# EDX API Credentials
EDX_API_URL = get_string("EDX_API_URL", None)
EDX_API_ACCESS_TOKEN_URL = get_string("EDX_API_ACCESS_TOKEN_URL", None)
EDX_API_CLIENT_ID = get_string("EDX_API_CLIENT_ID", None)
EDX_API_CLIENT_SECRET = get_string("EDX_API_CLIENT_SECRET", None)

# S3 Bucket info for OCW Plone CMS exports
OCW_CONTENT_BUCKET_NAME = get_string("OCW_CONTENT_BUCKET_NAME", None)
OCW_CONTENT_ACCESS_KEY = get_string("OCW_CONTENT_ACCESS_KEY", None)
OCW_CONTENT_SECRET_ACCESS_KEY = get_string("OCW_CONTENT_SECRET_ACCESS_KEY", None)

# S3 Bucket info for exporting OCW Plone media files
OCW_LEARNING_COURSE_BUCKET_NAME = get_string("OCW_LEARNING_COURSE_BUCKET_NAME", None)
OCW_LEARNING_COURSE_ACCESS_KEY = get_string("OCW_LEARNING_COURSE_ACCESS_KEY", None)
OCW_LEARNING_COURSE_SECRET_ACCESS_KEY = get_string(
    "OCW_LEARNING_COURSE_SECRET_ACCESS_KEY", None
)
OCW_UPLOAD_IMAGE_ONLY = get_bool("OCW_UPLOAD_IMAGE_ONLY", False)
OCW_ITERATOR_CHUNK_SIZE = get_int("OCW_ITERATOR_CHUNK_SIZE", 1000)
OCW_WEBHOOK_DELAY = get_int("OCW_WEBHOOK_DELAY", 120)
OCW_WEBHOOK_KEY = get_string("OCW_WEBHOOK_KEY", None)
MAX_S3_GET_ITERATIONS = get_int("MAX_S3_GET_ITERATIONS", 3)

# S3 Bucket info for exporting xPRO OLX
XPRO_LEARNING_COURSE_BUCKET_NAME = get_string("XPRO_LEARNING_COURSE_BUCKET_NAME", None)
XPRO_LEARNING_COURSE_ACCESS_KEY = get_string("XPRO_LEARNING_COURSE_ACCESS_KEY", None)
XPRO_LEARNING_COURSE_SECRET_ACCESS_KEY = get_string(
    "XPRO_LEARNING_COURSE_SECRET_ACCESS_KEY", None
)
XPRO_ITERATOR_CHUNK_SIZE = get_int("XPRO_ITERATOR_CHUNK_SIZE", 20)

# Base URL's for courses
OCW_BASE_URL = get_string("OCW_BASE_URL", "http://ocw.mit.edu/")
MITX_BASE_URL = get_string("MITX_BASE_URL", "https://www.edx.org/course/")
MITX_ALT_URL = get_string("MITX_ALT_URL", "https://courses.edx.org/courses/")
BLACKLISTED_COURSES_URL = get_string(
    "BLACKLISTED_COURSES_URL",
    "https://raw.githubusercontent.com/mitodl/open-resource-blacklists/master/courses.txt",
)

DUPLICATE_COURSES_URL = get_string("DUPLICATE_COURSES_URL", None)

# Base URL for bootcamps data
BOOTCAMPS_URL = get_string(
    "BOOTCAMPS_URL",
    "https://raw.githubusercontent.com/mitodl/bootcamps.json/master/bootcamps.json",
)
MICROMASTERS_CATALOG_API_URL = get_string("MICROMASTERS_CATALOG_API_URL", None)

XPRO_CATALOG_API_URL = get_string("XPRO_CATALOG_API_URL", None)
XPRO_COURSES_API_URL = get_string("XPRO_COURSES_API_URL", None)

OLL_API_URL = get_string("OLL_API_URL", None)
OLL_API_ACCESS_TOKEN_URL = get_string("OLL_API_ACCESS_TOKEN_URL", None)
OLL_API_CLIENT_ID = get_string("OLL_API_CLIENT_ID", None)
OLL_API_CLIENT_SECRET = get_string("OLL_API_CLIENT_SECRET", None)
OLL_BASE_URL = get_string("OLL_BASE_URL", None)
OLL_ALT_URL = get_string("OLL_ALT_URL", None)

SEE_BASE_URL = get_string("SEE_BASE_URL", None)
MITPE_BASE_URL = get_string("MITPE_BASE_URL", None)
CSAIL_BASE_URL = get_string("CSAIL_BASE_URL", None)


# Widgets
WIDGETS_RSS_CACHE_TTL = get_int("WIDGETS_RSS_CACHE_TTL", 15 * 60)

# livestream API credentials
LIVESTREAM_SECRET_KEY = get_string("LIVESTREAM_SECRET_KEY", None)
LIVESTREAM_ACCOUNT_ID = get_string("LIVESTREAM_ACCOUNT_ID", None)

# course catalog video etl settings
OPEN_VIDEO_DATA_BRANCH = get_string("OPEN_VIDEO_DATA_BRANCH", "master")
OPEN_VIDEO_USER_LIST_OWNER = get_string("OPEN_VIDEO_USER_LIST_OWNER", None)
OPEN_VIDEO_MAX_TOPICS = get_int("OPEN_VIDEO_MAX_TOPICS", 3)
OPEN_VIDEO_MIN_TERM_FREQ = get_int("OPEN_VIDEO_MIN_TERM_FREQ", 1)
OPEN_VIDEO_MIN_DOC_FREQ = get_int("OPEN_VIDEO_MIN_DOC_FREQ", 15)

YOUTUBE_DEVELOPER_KEY = get_string("YOUTUBE_DEVELOPER_KEY", None)
YOUTUBE_FETCH_TRANSCRIPT_SLEEP_SECONDS = get_int(
    "YOUTUBE_FETCH_TRANSCRIPT_SLEEP_SECONDS", 5
)

# Tika security
TIKA_ACCESS_TOKEN = get_string("TIKA_ACCESS_TOKEN", None)


# x509 certificate for moira
MIT_WS_CERTIFICATE = get_key("MIT_WS_CERTIFICATE", "")
MIT_WS_PRIVATE_KEY = get_key("MIT_WS_PRIVATE_KEY", "")

# x509 filenames
MIT_WS_CERTIFICATE_FILE = os.path.join(STATIC_ROOT, "mit_x509.cert")
MIT_WS_PRIVATE_KEY_FILE = os.path.join(STATIC_ROOT, "mit_x509.key")


def setup_x509():
    """ write the moira x509 certification & key to files"""
    from open_discussions.utils import write_x509_files

    write_x509_files()


setup_x509()
