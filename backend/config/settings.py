"""Django settings for the Ghana Community Review Platform API."""
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Loads backend/.env into the process environment (values already exported in
# the shell take precedence — load_dotenv never overwrites an existing var).
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "django_filters",
    "corsheaders",
    "core",
    "accounts",
    "reviews",
    "billing",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# PostgreSQL in production via DATABASE_URL; SQLite for zero-config local dev.
# Keep persistent connections on (conn_max_age) — a fresh TLS + auth
# handshake to a remote Postgres host costs over a second, so opening one
# per request makes every page feel slow. If DATABASE_URL points at a
# connection pooler, use its transaction-pooling port (e.g. Supabase's is
# 6543, not the session pooler's 5432) — that mode supports far more
# concurrent connections, so a threaded dev server reusing one persistent
# connection per thread won't exhaust it the way a small session-mode pool
# would.
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=int(os.environ.get("DB_CONN_MAX_AGE", "600")),
    )
}
if DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql":
    # Required when the connection goes through pgbouncer/Supabase in
    # transaction-pooling mode — named server-side cursors don't survive a
    # pooled connection being handed to a different backend mid-transaction.
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Accra"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Cloudflare R2 / AWS S3 media storage (Phase 1 default is local disk).
# Set USE_S3=1 plus the AWS_* variables and install django-storages + boto3.
if os.environ.get("USE_S3") == "1":
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3.S3Storage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL")  # R2 endpoint

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    # The whole platform is behind a login wall. Endpoints that must stay open
    # (login, registration, email verification, payment webhook) opt out with
    # an explicit AllowAny.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.SizeControlledPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": "120/hour"},
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

# Used in verification emails and payment callback links.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Email. Console backend by default (prints emails to the runserver terminal);
# set EMAIL_HOST etc. for a real SMTP provider in production.
EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "1") == "1"
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "no-reply@gcr.local")

# ── Payments (Paystack: cards + MTN/Vodafone/AirtelTigo mobile money) ─────────
# Leave the keys empty for now: the billing API then runs in "sandbox" mode,
# recording payments locally and activating subscriptions/purchases without
# contacting Paystack. Add real keys later and everything goes live.
PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.environ.get("PAYSTACK_PUBLIC_KEY", "")
PAYSTACK_BASE_URL = os.environ.get("PAYSTACK_BASE_URL", "https://api.paystack.co")
PAYMENT_CURRENCY = os.environ.get("PAYMENT_CURRENCY", "GHS")

# ── Sign in with Google ────────────────────────────────────────────────────
# OAuth 2.0 Client ID from console.cloud.google.com (Web application type).
# Leave empty to keep the "Continue with Google" button disabled everywhere.
GOOGLE_OAUTH_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
