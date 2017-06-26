"""
Django settings for mit_open.


For more information on this file, see
https://docs.djangoproject.com/en/1.10/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.10/ref/settings/

"""
import ast
import logging
import os
import platform

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
import yaml

VERSION = "0.0.0"

CONFIG_PATHS = [
    os.environ.get('MIT_OPEN_CONFIG', ''),
    os.path.join(os.getcwd(), 'mit_open.yml'),
    os.path.join(os.path.expanduser('~'), 'mit_open.yml'),
    '/etc/mit_open.yml',
]


def load_fallback():
    """Load optional yaml config"""
    fallback_config = {}
    config_file_path = None
    for config_path in CONFIG_PATHS:
        if os.path.isfile(config_path):
            config_file_path = config_path
            break
    if config_file_path is not None:
        with open(config_file_path) as config_file:
            fallback_config = yaml.safe_load(config_file)
    return fallback_config

FALLBACK_CONFIG = load_fallback()


def get_var(name, default):
    """Return the settings in a precedence way with default."""
    try:
        value = os.environ.get(name, FALLBACK_CONFIG.get(name, default))
        return ast.literal_eval(value)
    except (SyntaxError, ValueError):
        return value


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.8/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = get_var(
    'SECRET_KEY',
    'terribly_unsafe_default_secret_key'
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_var('DEBUG', False)

if DEBUG:
    # Disabling the protection added in 1.10.3 against a DNS rebinding vulnerability:
    # https://docs.djangoproject.com/en/1.10/releases/1.10.3/#dns-rebinding-vulnerability-when-debug-true
    # Because we never debug against production data, we are not vulnerable
    # to this problem.
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = get_var('ALLOWED_HOSTS', [])

SECURE_SSL_REDIRECT = get_var('MIT_OPEN_SECURE_SSL_REDIRECT', True)


WEBPACK_LOADER = {
    'DEFAULT': {
        'CACHE': not DEBUG,
        'BUNDLE_DIR_NAME': 'bundles/',
        'STATS_FILE': os.path.join(BASE_DIR, 'webpack-stats.json'),
        'POLL_INTERVAL': 0.1,
        'TIMEOUT': None,
        'IGNORE': [
            r'.+\.hot-update\.+',
            r'.+\.js\.map'
        ]
    }
}


# Application definition

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'server_status',
    'raven.contrib.django.raven_compat',
    # Put our apps after this point
    'mit_open',
)

DISABLE_WEBPACK_LOADER_STATS = get_var("DISABLE_WEBPACK_LOADER_STATS", False)
if not DISABLE_WEBPACK_LOADER_STATS:
    INSTALLED_APPS += ('webpack_loader',)

MIDDLEWARE_CLASSES = (
    'raven.contrib.django.raven_compat.middleware.SentryResponseErrorIdMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
)

# enable the nplusone profiler only in debug mode
if DEBUG:
    INSTALLED_APPS += (
        'nplusone.ext.django',
    )
    MIDDLEWARE_CLASSES += (
        'nplusone.ext.django.NPlusOneMiddleware',
    )

SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'

LOGIN_REDIRECT_URL = '/'
LOGIN_URL = '/'
LOGIN_ERROR_URL = '/'

ROOT_URLCONF = 'mit_open.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR + '/templates/'
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'mit_open.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases
# Uses DATABASE_URL to configure with sqlite default:
# For URL structure:
# https://github.com/kennethreitz/dj-database-url
DEFAULT_DATABASE_CONFIG = dj_database_url.parse(
    get_var(
        'DATABASE_URL',
        'sqlite:///{0}'.format(os.path.join(BASE_DIR, 'db.sqlite3'))
    )
)
DEFAULT_DATABASE_CONFIG['CONN_MAX_AGE'] = int(get_var('MIT_OPEN_DB_CONN_MAX_AGE', 0))

if get_var('MIT_OPEN_DB_DISABLE_SSL', False):
    DEFAULT_DATABASE_CONFIG['OPTIONS'] = {}
else:
    DEFAULT_DATABASE_CONFIG['OPTIONS'] = {'sslmode': 'require'}

DATABASES = {
    'default': DEFAULT_DATABASE_CONFIG
}

# Internationalization
# https://docs.djangoproject.com/en/1.8/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.8/howto/static-files/

# Serve static files with dj-static
STATIC_URL = '/static/'
STATIC_ROOT = 'staticfiles'
STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'static'),
)

# Request files from the webpack dev server
USE_WEBPACK_DEV_SERVER = get_var('MIT_OPEN_USE_WEBPACK_DEV_SERVER', False)
WEBPACK_DEV_SERVER_HOST = get_var('WEBPACK_DEV_SERVER_HOST', '')
WEBPACK_DEV_SERVER_PORT = get_var('WEBPACK_DEV_SERVER_PORT', '8062')

# Important to define this so DEBUG works properly
INTERNAL_IPS = (get_var('HOST_IP', '127.0.0.1'), )

# Configure e-mail settings
EMAIL_BACKEND = get_var('MIT_OPEN_EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = get_var('MIT_OPEN_EMAIL_HOST', 'localhost')
EMAIL_PORT = get_var('MIT_OPEN_EMAIL_PORT', 25)
EMAIL_HOST_USER = get_var('MIT_OPEN_EMAIL_USER', '')
EMAIL_HOST_PASSWORD = get_var('MIT_OPEN_EMAIL_PASSWORD', '')
EMAIL_USE_TLS = get_var('MIT_OPEN_EMAIL_TLS', False)
EMAIL_SUPPORT = get_var('MIT_OPEN_SUPPORT_EMAIL', 'support@example.com')
DEFAULT_FROM_EMAIL = get_var('MIT_OPEN_FROM_EMAIL', 'webmaster@localhost')

MAILGUN_URL = get_var('MAILGUN_URL', '')
MAILGUN_KEY = get_var('MAILGUN_KEY', None)
MAILGUN_BATCH_CHUNK_SIZE = get_var('MAILGUN_BATCH_CHUNK_SIZE', 1000)
MAILGUN_RECIPIENT_OVERRIDE = get_var('MAILGUN_RECIPIENT_OVERRIDE', None)
MAILGUN_FROM_EMAIL = get_var('MAILGUN_FROM_EMAIL', 'no-reply@example.com')
MAILGUN_BCC_TO_EMAIL = get_var('MAILGUN_BCC_TO_EMAIL', 'no-reply@example.com')


# e-mail configurable admins
ADMIN_EMAIL = get_var('MIT_OPEN_ADMIN_EMAIL', '')
if ADMIN_EMAIL != '':
    ADMINS = (('Admins', ADMIN_EMAIL),)
else:
    ADMINS = ()

# Logging configuration
LOG_LEVEL = get_var('MIT_OPEN_LOG_LEVEL', 'INFO')
DJANGO_LOG_LEVEL = get_var('DJANGO_LOG_LEVEL', 'INFO')

# For logging to a remote syslog host
LOG_HOST = get_var('MIT_OPEN_LOG_HOST', 'localhost')
LOG_HOST_PORT = get_var('MIT_OPEN_LOG_HOST_PORT', 514)

HOSTNAME = platform.node().split('.')[0]
DEFAULT_LOG_STANZA = {
    'handlers': ['console', 'syslog'],
    'level': LOG_LEVEL,
}

# nplusone profiler logger configuration
NPLUSONE_LOGGER = logging.getLogger('nplusone')
NPLUSONE_LOG_LEVEL = logging.ERROR

LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        }
    },
    'formatters': {
        'verbose': {
            'format': (
                '[%(asctime)s] %(levelname)s %(process)d [%(name)s] '
                '%(filename)s:%(lineno)d - '
                '[{hostname}] - %(message)s'
            ).format(hostname=HOSTNAME),
            'datefmt': '%Y-%m-%d %H:%M:%S'
        }
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
        'syslog': {
            'level': LOG_LEVEL,
            'class': 'logging.handlers.SysLogHandler',
            'facility': 'local7',
            'formatter': 'verbose',
            'address': (LOG_HOST, LOG_HOST_PORT)
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'sentry': {
            'level': 'ERROR',
            'class': 'raven.contrib.django.raven_compat.handlers.SentryHandler',
            'formatter': 'verbose'
        },
    },
    'loggers': {
        'root': DEFAULT_LOG_STANZA,
        'mit_open': DEFAULT_LOG_STANZA,
        'django': {
            'propagate': True,
            'level': DJANGO_LOG_LEVEL,
            'handlers': ['console', 'syslog'],
        },
        'django.request': {
            'handlers': ['mail_admins'],
            'level': DJANGO_LOG_LEVEL,
            'propagate': True,
        },
        'urllib3': {
            'level': 'INFO',
        },
        'raven': {
            'level': 'DEBUG',
            'handlers': []
        },
        'nplusone': {
            'handlers': ['console'],
            'level': 'ERROR',
        }
    },
}

# Sentry
ENVIRONMENT = get_var('MIT_OPEN_ENVIRONMENT', 'dev')
SENTRY_CLIENT = 'raven.contrib.django.raven_compat.DjangoClient'
RAVEN_CONFIG = {
    'dsn': get_var('SENTRY_DSN', ''),
    'environment': ENVIRONMENT,
    'release': VERSION
}

# to run the app locally on mac you need to bypass syslog
if get_var('MIT_OPEN_BYPASS_SYSLOG', False):
    LOGGING['handlers'].pop('syslog')
    LOGGING['loggers']['root']['handlers'] = ['console']
    LOGGING['loggers']['ui']['handlers'] = ['console']
    LOGGING['loggers']['django']['handlers'] = ['console']

# server-status
STATUS_TOKEN = get_var("STATUS_TOKEN", "")
HEALTH_CHECK = ['CELERY', 'REDIS', 'POSTGRES']

ADWORDS_CONVERSION_ID = get_var("ADWORDS_CONVERSION_ID", "")
GA_TRACKING_ID = get_var("GA_TRACKING_ID", "")
REACT_GA_DEBUG = get_var("REACT_GA_DEBUG", False)

MEDIA_ROOT = get_var('MEDIA_ROOT', '/var/media/')
MEDIA_URL = '/media/'
MIT_OPEN_USE_S3 = get_var('MIT_OPEN_USE_S3', False)
AWS_ACCESS_KEY_ID = get_var('AWS_ACCESS_KEY_ID', False)
AWS_SECRET_ACCESS_KEY = get_var('AWS_SECRET_ACCESS_KEY', False)
AWS_STORAGE_BUCKET_NAME = get_var('AWS_STORAGE_BUCKET_NAME', False)
AWS_QUERYSTRING_AUTH = get_var('AWS_QUERYSTRING_AUTH', False)
# Provide nice validation of the configuration
if (
        MIT_OPEN_USE_S3 and
        (not AWS_ACCESS_KEY_ID or
         not AWS_SECRET_ACCESS_KEY or
         not AWS_STORAGE_BUCKET_NAME)
):
    raise ImproperlyConfigured(
        'You have enabled S3 support, but are missing one of '
        'AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or '
        'AWS_STORAGE_BUCKET_NAME'
    )
if MIT_OPEN_USE_S3:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto.S3BotoStorage'
else:
    # by default use django.core.files.storage.FileSystemStorage with
    # overwrite feature
    DEFAULT_FILE_STORAGE = 'storages.backends.overwrite.OverwriteStorage'

# Celery
USE_CELERY = True
CELERY_BROKER_URL = get_var("CELERY_BROKER_URL", get_var("REDISCLOUD_URL", None))
CELERY_RESULT_BACKEND = get_var(
    "CELERY_RESULT_BACKEND", get_var("REDISCLOUD_URL", None)
)
CELERY_TASK_ALWAYS_EAGER = get_var("CELERY_TASK_ALWAYS_EAGER", False)
CELERY_TASK_EAGER_PROPAGATES = get_var("CELERY_TASK_EAGER_PROPAGATES", True)

CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'UTC'


# django cache back-ends
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'local-in-memory-cache',
    },
    'redis': {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": CELERY_BROKER_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient"
        },
    },
}

# reddit-specific settings
MIT_OPEN_REDDIT_ANONYMOUS_CLIENT_ID = get_var('MIT_OPEN_REDDIT_ANONYMOUS_CLIENT_ID', None)
MIT_OPEN_REDDIT_ANONYMOUS_SECRET = get_var('MIT_OPEN_REDDIT_ANONYMOUS_SECRET', None)
MIT_OPEN_REDDIT_ANONYMOUS_USERNAME = get_var('MIT_OPEN_REDDIT_ANONYMOUS_USERNAME', None)
MIT_OPEN_REDDIT_ANONYMOUS_PASSWORD = get_var('MIT_OPEN_REDDIT_ANONYMOUS_PASSWORD', None)
MIT_OPEN_REDDIT_AUTHENTICATED_CLIENT_ID = get_var('MIT_OPEN_REDDIT_AUTHENTICATED_CLIENT_ID', None)
MIT_OPEN_REDDIT_AUTHENTICATED_SECRET = get_var('MIT_OPEN_REDDIT_AUTHENTICATED_SECRET', None)
MIT_OPEN_REDDIT_URL = get_var('MIT_OPEN_REDDIT_URL', '')
MIT_OPEN_REDDIT_VALIDATE_SSL = get_var('MIT_OPEN_REDDIT_VALIDATE_SSL', True)


# features flags
def get_all_config_keys():
    """Returns all the configuration keys from both environment and configuration files"""
    return list(set(os.environ.keys()).union(set(FALLBACK_CONFIG.keys())))

MIT_OPEN_FEATURES_PREFIX = get_var('MIT_OPEN_FEATURES_PREFIX', 'FEATURE_')
FEATURES = {
    key[len(MIT_OPEN_FEATURES_PREFIX):]: get_var(key, None) for key
    in get_all_config_keys() if key.startswith(MIT_OPEN_FEATURES_PREFIX)
}

MIDDLEWARE_FEATURE_FLAG_QS_PREFIX = get_var("MIDDLEWARE_FEATURE_FLAG_QS_PREFIX", None)
MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME = get_var('MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME', 'MIT_OPEN_FEATURE_FLAGS')
MIDDLEWARE_FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS = get_var('MIDDLEWARE_FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS', 60 * 60)

if MIDDLEWARE_FEATURE_FLAG_QS_PREFIX:
    MIDDLEWARE_CLASSES = MIDDLEWARE_CLASSES + (
        'mit_open.middleware.QueryStringFeatureFlagMiddleware',
        'mit_open.middleware.CookieFeatureFlagMiddleware',
    )


# django debug toolbar only in debug mode
if DEBUG:
    INSTALLED_APPS += ('debug_toolbar', )
    # it needs to be enabled before other middlewares
    MIDDLEWARE_CLASSES = (
        'debug_toolbar.middleware.DebugToolbarMiddleware',
    ) + MIDDLEWARE_CLASSES
