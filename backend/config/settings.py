import os
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load local Neon configuration (.env.local has priority, then .env)
env_local = BASE_DIR.parent / '.env.local'
env_file = BASE_DIR.parent / '.env'
if env_local.exists():
    load_dotenv(env_local)
if env_file.exists():
    load_dotenv(env_file)

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-mintly-finance-super-secret-key-prod-2026-secure'
)

DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 'yes')

raw_hosts = os.environ.get('ALLOWED_HOSTS', '*' if DEBUG else 'localhost,127.0.0.1,.onrender.com')
ALLOWED_HOSTS = [h.strip() for h in raw_hosts.split(',') if h.strip()]
render_host = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if render_host and render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_host)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',

    # Local apps
    'apps.users.apps.UsersConfig',
    'apps.budgets.apps.BudgetsConfig',
    'apps.categories.apps.CategoriesConfig',
    'apps.transactions.apps.TransactionsConfig',
    'apps.analytics.apps.AnalyticsConfig',
    'apps.notifications.apps.NotificationsConfig',
    'apps.storage.apps.StorageConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database configuration: support PostgreSQL through DATABASE_URL, fallback to SQLite
# Per Neon Best Practices:
# - Schema migrations / DDL: Direct (non-pooled) connection string (DATABASE_URL_UNPOOLED)
# - Web application serving: Pooled connection string (DATABASE_URL) with CONN_MAX_AGE=0
is_test = 'test' in sys.argv
is_migration_command = any(arg in sys.argv for arg in ['migrate', 'makemigrations', 'showmigrations', 'sqlmigrate'])
unpooled_url = os.environ.get('DATABASE_URL_UNPOOLED')
pooled_url = os.environ.get('DATABASE_URL')

if is_test:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
elif is_migration_command and unpooled_url:
    DATABASE_URL = unpooled_url
else:
    DATABASE_URL = pooled_url or unpooled_url

if not is_test:
    if DATABASE_URL and DATABASE_URL.startswith(('postgres://', 'postgresql://')):
        parsed_db = urlparse(DATABASE_URL)
        options = {}
        query_params = parse_qs(parsed_db.query)
        if 'sslmode' in query_params:
            options['sslmode'] = query_params['sslmode'][0]
        elif parsed_db.hostname not in ('localhost', '127.0.0.1', 'db'):
            options['sslmode'] = 'require'

        # Neon PgBouncer recommendation: default CONN_MAX_AGE to 0 when using pooler
        default_conn_age = '0' if 'pooler' in (parsed_db.hostname or '') else '60'
        conn_max_age = int(os.environ.get('DB_CONN_MAX_AGE', default_conn_age))

        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': parsed_db.path[1:],
                'USER': parsed_db.username,
                'PASSWORD': parsed_db.password,
                'HOST': parsed_db.hostname,
                'PORT': parsed_db.port or '5432',
                'OPTIONS': options,
                'CONN_MAX_AGE': conn_max_age,
            }
        }
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '300/minute',
        'auth': '10/minute',
    },
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

# CORS & CSRF settings
cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS')
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = [orig.strip() for orig in cors_origins_env.split(',') if orig.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
elif DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]

CORS_ALLOW_CREDENTIALS = True

csrf_origins_env = os.environ.get('CSRF_TRUSTED_ORIGINS')
if csrf_origins_env:
    CSRF_TRUSTED_ORIGINS = [orig.strip() for orig in csrf_origins_env.split(',') if orig.strip()]
elif not DEBUG:
    CSRF_TRUSTED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]

# Production Security Headers
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'True').lower() in ('true', '1')
    CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'True').lower() in ('true', '1')
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    if os.environ.get('SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1'):
        SECURE_SSL_REDIRECT = True
        SECURE_HSTS_SECONDS = 31536000
        SECURE_HSTS_INCLUDE_SUBDOMAINS = True
        SECURE_HSTS_PRELOAD = True

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Web Push VAPID configuration
VAPID_PUBLIC_KEY = os.environ.get(
    'VAPID_PUBLIC_KEY',
    'BA-1zgg-difTLX7c1f-7Q9pEDCIAqcuqK1eZWleFLV5uoELp4pxjaK3gojfea1q_rV2-hglypZavWpfphYC6qJ0'
)
VAPID_PRIVATE_KEY = os.environ.get(
    'VAPID_PRIVATE_KEY',
    'default_private_key_pem'
)
VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'mailto:notifications@mintly.app')

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Upstash QStash Configuration (for scheduled notifications on serverless / Render)
QSTASH_CURRENT_SIGNING_KEY = os.environ.get('QSTASH_CURRENT_SIGNING_KEY', '')
QSTASH_NEXT_SIGNING_KEY = os.environ.get('QSTASH_NEXT_SIGNING_KEY', '')
QSTASH_TOKEN = os.environ.get('QSTASH_TOKEN', '')

# Neon Object Storage (S3-compatible) Configuration
AWS_ENDPOINT_URL_S3 = os.environ.get('AWS_ENDPOINT_URL_S3', '')
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID', '')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
AWS_REGION = os.environ.get('AWS_REGION', 'ap-southeast-1')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', 'assets')
NEON_OBJECT_STORAGE_ENABLED = bool(AWS_ENDPOINT_URL_S3 and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY)
