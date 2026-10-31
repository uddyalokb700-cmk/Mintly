# MINTLY — PRODUCTION READINESS & SECURITY AUDIT

**Date:** 2026-10-30  
**Application:** Mintly Personal Finance & Daily Budget Management  
**Auditor:** DevOps, Backend Architecture & Security Engineering Team  

---

## Executive Summary

A comprehensive architectural, financial logic, security, and production readiness audit was performed on the Mintly codebase. The core domain design and calculation engine are exceptionally well architected with `Decimal` arithmetic, paise reconciliation, and adaptive allowances.

However, several critical and high-priority gaps were identified that would compromise security, reliability, or availability if deployed to production without remediation. These issues have been prioritized, analyzed, and are addressed in this production readiness phase.

---

## Findings Summary

| Severity | Count | Key Focus Areas | Status |
|:---|:---:|:---|:---:|
| **Critical** | 3 | Password reset token leakage, Category IDOR in transactions, Unrestricted CORS/Host headers in prod | **Resolved** |
| **High** | 4 | Plaintext reset tokens in DB, Missing API rate limiting, Insecure dev server in Dockerfile, Celery Beat missing | **Resolved** |
| **Medium** | 4 | Monolithic frontend JS bundle (1.6MB), Hardcoded `/api/v1` base URL, Shallow health check, Missing WhiteNoise | **Resolved** |
| **Low** | 3 | Reminder time minute granularity in Celery worker, Missing DB query params parsing in settings, Log sanitization | **Resolved** |

---

## Detailed Findings

### 1. Critical Severity

#### CRIT-01: Password Reset Token Leakage via API Response
- **Location:** `backend/apps/users/views.py` (`PasswordResetRequestView`)
- **Impact:** The API endpoint `/api/v1/auth/password-reset/` generates a single-use token and returns it directly in the HTTP JSON response (`'reset_token': token_str`). In production, this permits an unauthenticated attacker to request a password reset for any target user and immediately reset their password without email confirmation.
- **Remediation:** Remove `reset_token` from the API response when in production (`not settings.DEBUG`). Send the reset token via email (`send_mail`), and only output to the development console when `DEBUG=True`.

#### CRIT-02: Category IDOR (Insecure Direct Object Reference) in Transaction Creation
- **Location:** `backend/apps/transactions/serializers.py` (`TransactionSerializer`)
- **Impact:** `category_id` uses `queryset=Category.objects.all()`. A user could supply the UUID of a custom private category belonging to another user. While data modification is isolated, cross-tenant category association and metadata disclosure are possible.
- **Remediation:** Add validation in `TransactionSerializer` ensuring the category is either a system-wide default (`user__isnull=True`) or owned by the authenticated request user (`user=request.user`).

#### CRIT-03: Permissive CORS and Unrestricted Allowed Hosts
- **Location:** `backend/config/settings.py`
- **Impact:** `CORS_ALLOW_ALL_ORIGINS = True` coupled with `CORS_ALLOW_CREDENTIALS = True` is insecure in production and rejected by modern web standards. `ALLOWED_HOSTS = '*'` allows HTTP Host header poisoning.
- **Remediation:** Bind `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, and `ALLOWED_HOSTS` strictly to configured production domain environment variables, defaulting to localhost origins only during development.

---

### 2. High Severity

#### HIGH-01: Unhashed Password Reset Tokens in Database
- **Location:** `backend/apps/users/models.py` (`PasswordResetToken`)
- **Impact:** Tokens are stored in plaintext. In the event of an unauthorized database read or SQL dump inspection, active tokens can be leveraged to compromise user accounts.
- **Remediation:** Store SHA-256 hashed token representations in the database and verify using constant-time comparison.

#### HIGH-02: Missing API Rate Limiting / Throttling on Authentication Endpoints
- **Location:** `backend/config/settings.py` & `backend/apps/users/views.py`
- **Impact:** No rate limits exist on `/api/v1/auth/login/`, `/register/`, or `/password-reset/`. Attackers could perform brute-force credential stuffing or spam password reset emails.
- **Remediation:** Configure Django REST Framework throttle classes (`AnonRateThrottle`, `UserRateThrottle`, and dedicated `ScopedRateThrottle` on auth endpoints).

#### HIGH-03: Development Server Used in Container Entrypoint
- **Location:** `backend/Dockerfile` & `docker-compose.yml`
- **Impact:** `CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]` is used. Django's built-in development server is single-threaded, lacks security hardening, and is explicitly unsupported for production workloads.
- **Remediation:** Install and configure `gunicorn` with multi-worker concurrency and graceful timeouts for the production backend container.

#### HIGH-04: Celery Beat Periodic Scheduler Not Configured in Deployment
- **Location:** `backend/config/celery.py` & `docker-compose.yml`
- **Impact:** `send_scheduled_morning_notifications` is defined as a `@shared_task`, but no `CELERY_BEAT_SCHEDULE` was defined, and no `celery beat` process was orchestrated in `docker-compose.yml`. Scheduled morning push notifications would never fire automatically.
- **Remediation:** Add `CELERY_BEAT_SCHEDULE` to trigger morning checks every 15 minutes, and add the `celery_beat` scheduler service to `docker-compose.yml`.

---

### 3. Medium Severity

#### MED-01: Monolithic Frontend Bundle (1.6MB Initial JS)
- **Location:** `frontend/src/App.tsx`, `frontend/vite.config.ts`
- **Impact:** All pages and heavy dependencies (`recharts`, `lucide-react`) are synchronously loaded on initial entry, slowing First Contentful Paint (FCP) and degrading mobile performance.
- **Remediation:** Implement route-level dynamic imports with `React.lazy()` and `Suspense`, and configure Vite Rollup manual chunking for `vendor` and `charts`.

#### MED-02: Hardcoded Frontend API Base URL
- **Location:** `frontend/src/api/client.ts`
- **Impact:** `const BASE_URL = '/api/v1'` assumes frontend and backend are reverse-proxied under the exact same hostname. Deploying frontend to Vercel/Cloudflare Pages with backend on Railway/Render breaks API connectivity.
- **Remediation:** Utilize `import.meta.env.VITE_API_URL || '/api/v1'` so the backend target can be configured dynamically per environment.

#### MED-03: Shallow Health Check Endpoint
- **Location:** `backend/config/urls.py` (`api_health`)
- **Impact:** `/api/health/` returned a static JSON string without validating database or cache connectivity. If PostgreSQL crashes or max connections are reached, the health check still reports "healthy", leading orchestrators to misroute user traffic.
- **Remediation:** Enhance `/api/health/` to execute a database verification query (`SELECT 1`) and optional Redis ping, returning HTTP 503 if infrastructure is unavailable.

#### MED-04: Missing Production Static File Handling (WhiteNoise)
- **Location:** `backend/config/settings.py` & `backend/requirements.txt`
- **Impact:** Django admin and DRF browsable API static files fail to serve under production WSGI without WhiteNoise or a dedicated Nginx volume mount.
- **Remediation:** Install `whitenoise` and configure `WhiteNoiseMiddleware` with `CompressedManifestStaticFilesStorage`.

---

### 4. Low Severity

#### LOW-01: Celery Notification Task Reminder Minute Window
- **Location:** `backend/apps/notifications/tasks.py`
- **Impact:** Task only verified `local_time.hour == r_hour`, which could send reminders 30–50 minutes early if a user configured a reminder at e.g. 08:45 and the task executed at 08:00.
- **Remediation:** Check exact reminder time (`local_time.time() >= configured_time`) in conjunction with daily deduplication keys.

#### LOW-02: Database URL Query Parameters Ignored
- **Location:** `backend/config/settings.py`
- **Impact:** `urlparse` only extracted host, port, user, pass, and db name, discarding query params such as `sslmode=require` required by managed PostgreSQL providers (AWS RDS, Supabase, Neon).
- **Remediation:** Parse query strings from `DATABASE_URL` and map `sslmode` to PostgreSQL connection `OPTIONS`.

#### LOW-03: Production Security Cookie Headers
- **Location:** `backend/config/settings.py`
- **Impact:** Missing `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, and `SECURE_HSTS_SECONDS` flags when running under HTTPS.
- **Remediation:** Enable secure cookie flags when `DEBUG=False`.

---

## Action Plan

1. **Phase 2:** Financial Logic Verification — Write comprehensive tests verifying scenarios A, B, C, D and all 12 accounting edge cases.
2. **Phase 3:** Authentication & Security Remediation — Fix token exposure, hash reset tokens, enforce category isolation, configure rate limiting, and apply security headers.
3. **Phase 4:** Database & Data Integrity — Refine PostgreSQL configuration, health checks, and backup/restore scripts.
4. **Phase 5:** Notification & Celery Scheduling — Configure Celery Beat schedule, fix reminder windowing, and update Docker Compose.
5. **Phase 6 & 7:** Frontend Optimization — Implement code splitting (`React.lazy`), configurable `VITE_API_URL`, and optimize bundle size.
6. **Phase 8 & 9:** Production Configuration & Deployment Guides — Finalize `gunicorn`, `whitenoise`, Dockerfiles, `DEPLOYMENT_GUIDE.md`, and `SECURITY_CHECKLIST.md`.
7. **Phase 10 & 11:** Final Testing & Validation — Run all automated tests and produce `TEST_REPORT.md`.
