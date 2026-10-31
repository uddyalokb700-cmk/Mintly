# MINTLY — PRODUCTION SECURITY AUDIT & VERIFICATION CHECKLIST

**Application:** Mintly Personal Finance  
**Classification:** Financial & Budget Management System  
**Review Standard:** OWASP Top 10 API Security / ISO-27001 Application Controls  
**Status:** **AUDITED & HARDENED FOR PRODUCTION**

---

## 1. Authentication & Credential Security

| Check | Specification | Implemented In | Status |
|:---|:---|:---|:---:|
| **Password Hashing** | PBKDF2 with SHA-256 iteration stretching (Django default with minimum 8 characters, common passwords check, and complexity validators) | `backend/config/settings.py` (`AUTH_PASSWORD_VALIDATORS`) | **PASS** |
| **Token Invalidation on Logout** | Auth token deleted from database upon calling `/api/v1/auth/logout/` | `backend/apps/users/views.py` (`LogoutView`) | **PASS** |
| **Password Reset Token Hashing** | Reset tokens stored as SHA-256 hashes in database (`mintly_password_reset_tokens`). Attackers cannot obtain tokens from DB dumps. | `backend/apps/users/views.py` (`PasswordResetRequestView`, `PasswordResetConfirmView`) | **PASS** |
| **Zero Token Exposure in Prod** | Reset token is NEVER returned in HTTP responses when `DEBUG=False` | `backend/apps/users/views.py` (`PasswordResetRequestView`) | **PASS** |
| **Token Invalidation on Reset** | Single-use flag (`is_used=True`) and deletion of all existing user auth tokens upon password reset | `backend/apps/users/views.py` (`PasswordResetConfirmView`) | **PASS** |
| **Brute-Force Rate Limiting** | Throttling on `/register/`, `/login/`, `/password-reset/` (10 requests/min per IP) | `backend/config/settings.py` (`ScopedRateThrottle`) | **PASS** |
| **User Enumeration Defense** | Password reset endpoint returns identical success message whether email exists or not | `backend/apps/users/views.py` (`PasswordResetRequestView`) | **PASS** |

---

## 2. Authorization & Tenant Data Isolation (IDOR Defense)

A user must never access, view, modify, or link another user's financial entities.

| Resource | Isolation Mechanism | Verification Test | Status |
|:---|:---|:---|:---:|
| **Budgets** | All queries filtered by `request.user`. User B cannot read or alter User A's budget. | `tests.test_api_auth_permissions.test_15_prevention_of_cross_user_data_access` | **PASS** |
| **Transactions** | Strict lookup via `generics.get_object_or_404(Transaction, pk=pk, user=request.user)` | `tests.test_api_auth_permissions.test_15_prevention_of_cross_user_data_access` | **PASS** |
| **Categories (IDOR)** | Custom categories owned by another user cannot be linked in `TransactionSerializer` | `tests.test_api_auth_permissions.test_19_cross_user_custom_category_idor_prevention` | **PASS** |
| **Notification Preferences** | Preferences filtered strictly by `request.user` | `tests.test_api_auth_permissions.test_16_notification_preference_enforcement` | **PASS** |
| **Push Subscriptions** | Endpoints and push credentials isolated by foreign key to `request.user` | `tests.test_api_auth_permissions.test_18_graceful_handling_of_failed_push_delivery` | **PASS** |
| **Analytics Overview** | Aggregate calculations strictly encompass authenticated user's records | `tests.test_complete_lifecycle.test_complete_mintly_user_lifecycle` | **PASS** |

---

## 3. Network & Transport Security

| Control | Implementation | Verification | Status |
|:---|:---|:---|:---:|
| **HTTPS Enforcement** | `SECURE_SSL_REDIRECT = True` redirects all HTTP traffic to HTTPS | `backend/config/settings.py` | **PASS** |
| **HSTS (HTTP Strict Transport Security)** | `SECURE_HSTS_SECONDS = 31536000` with subdomains and preload | `backend/config/settings.py` | **PASS** |
| **Strict CORS** | `CORS_ALLOW_ALL_ORIGINS = False` in production. Only explicit frontend domains in `CORS_ALLOWED_ORIGINS` allowed. | `backend/config/settings.py` | **PASS** |
| **Host Header Protection** | `ALLOWED_HOSTS` rejects unapproved hostnames, preventing cache and password reset poisoning | `backend/config/settings.py` | **PASS** |
| **Secure Cookies** | `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True` | `backend/config/settings.py` | **PASS** |
| **Clickjacking Defense** | `X_FRAME_OPTIONS = 'DENY'` prevents iframe embedding | `backend/config/settings.py` | **PASS** |
| **MIME Sniffing Prevention** | `SECURE_CONTENT_TYPE_NOSNIFF = True` | `backend/config/settings.py` | **PASS** |
| **XSS Protection Filter** | `SECURE_BROWSER_XSS_FILTER = True` | `backend/config/settings.py` | **PASS** |

---

## 4. Financial Calculations & Data Integrity

| Check | Specification | Verification Test | Status |
|:---|:---|:---|:---:|
| **Decimal Precision** | All monetary amounts stored as `DecimalField(max_digits=12, decimal_places=2)`. Floating-point arithmetic completely avoided. | `tests.test_budget_engine.test_03_floating_point_inaccuracy_prevention` | **PASS** |
| **Paise Reconciliation** | Fractional daily allowances rounded down to exact paise; remainder pooled into final day | `tests.test_budget_engine.test_11_daily_allowance_penny_precision_reconciliation` | **PASS** |
| **Calendar Month Boundaries** | Accurate leap year handling (February 29 vs 28) and 30/31-day months | `tests.test_budget_engine.test_02_february_leap_year_handling` | **PASS** |
| **No Double Counting** | Refunds and additional incomes tracked independently without distorting base income | `tests.test_budget_engine.test_12_refund_and_income_handling_without_double_counting` | **PASS** |
| **Historical Preservation** | Historical budget periods remain frozen and unaltered by subsequent budget updates | `tests.test_budget_engine.test_13_budget_changes_preserve_historical_records` | **PASS** |

---

## 5. Secrets & Configuration Hygiene

- [x] **No hardcoded secrets:** `DJANGO_SECRET_KEY`, `DATABASE_URL`, and `VAPID_PRIVATE_KEY` loaded via environment variables.
- [x] **Gitignore coverage:** `.env`, `.env.local`, `db.sqlite3`, `staticfiles/`, `backups/`, `*.sql.gz` ignored.
- [x] **Production WSGI Server:** Gunicorn used instead of `runserver`.
- [x] **Database connection pooling:** `CONN_MAX_AGE = 600` configured for PostgreSQL.
- [x] **Database Health Probing:** `/api/health/` verifies live database execution (`SELECT 1`).
- [x] **Static Asset Protection:** WhiteNoise configured with immutable compressed asset caching.
