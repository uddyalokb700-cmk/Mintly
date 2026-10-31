# MINTLY — PRODUCTION DEPLOYMENT & OPERATIONS GUIDE

This guide provides end-to-end instructions for deploying the **Mintly Personal Finance** application into real-world production environments using the free-tier cloud architecture:

- **Source Control:** GitHub
- **Frontend Hosting:** Vercel (Edge CDN)
- **Backend API Hosting:** Render (Django Web Service with Gunicorn & WhiteNoise)
- **Database:** Neon (Serverless PostgreSQL with connection pooling)
- **Background Scheduler:** Upstash QStash (Serverless cron webhooks)

---

## 1. Architecture Overview

```
┌─────────────────────────┐           HTTPS            ┌──────────────────────────────────────────────┐
│  React (Vite) Frontend  ├───────────────────────────►│            Render Django Web Service         │
│  Hosted on Vercel       │                            │          Gunicorn (Port $PORT) + WhiteNoise  │
└─────────────────────────┘                            └──────────────┬───────────────────────────────┘
                                                                      │
                      ┌───────────────────────────────────────────────┴───────────────────────────────┐
                      │                                                                               │
                      ▼                                                                               ▼
       ┌───────────────────────────────┐                                               ┌───────────────────────────────┐
       │   Neon Serverless PostgreSQL  │                                               │         Upstash QStash        │
       │    PgBouncer Pooler + SSL     │                                               │    Cron Webhook (Every 15m)   │
       │   Decimal-Safe Financial Data │                                               │ Cryptographic HMAC Signatures │
       └───────────────────────────────┘                                               └───────────────────────────────┘
```

### Why Upstash QStash on Free-Tier Render?
Render's free tier provides Web Services that spin down after 15 minutes of inactivity and **does not provide separate persistent Celery workers or native cron jobs**. Upstash QStash resolves this by sending a signed, scheduled HTTP request every 15 minutes to `/api/v1/notifications/qstash/process/`. This wakes up the service, validates the signature, and evaluates all users' morning reminder preferences idempotently.

---

## 2. Step-by-Step Free-Tier Deployment Instructions

### STEP 1: Provision Managed PostgreSQL on Neon
1. Sign up or log into [Neon Console](https://console.neon.tech/).
2. Create a new project named **mintly-prod**.
3. Select your preferred region (e.g., `AWS us-east-2` or `eu-central-1`).
4. On the Neon dashboard, navigate to **Connection Details**.
5. Select **Connection pooling** (uses PgBouncer on port 5432).
6. Copy the connection string. It will look like:
   ```
   postgres://alex:AbCdEf123456@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
7. *(Optional)* Verify connectivity from your terminal:
   ```bash
   psql "postgres://alex:AbCdEf123456@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require" -c "SELECT version();"
   ```

---

### STEP 2: Configure Upstash QStash for Scheduled Reminders
1. Sign up or log into [Upstash Console](https://console.upstash.com/).
2. Click on **QStash** in the top navigation.
3. In QStash settings, locate your signing keys:
   - **`QSTASH_CURRENT_SIGNING_KEY`** (e.g., `sig_...`)
   - **`QSTASH_NEXT_SIGNING_KEY`** (e.g., `sig_...`)
4. Copy these keys. They are required by the backend to verify that incoming webhook requests originate strictly from Upstash.
5. *(You will configure the cron schedule in Step 5 after your Render URL is active).*

---

### STEP 3: Deploy Django Backend on Render

You can deploy using either the Blueprint (`render.yaml`) or manually via the Render Dashboard.

#### Option A: 1-Click Blueprint via `render.yaml`
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Blueprint**.
3. Select your GitHub repository.
4. Render will detect `render.yaml` and prompt you for the un-synced variables (`DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `QSTASH_CURRENT_SIGNING_KEY`, etc.).
5. Paste your values and click **Apply**.

#### Option B: Manual Web Service Setup
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `mintly-backend`
   - **Region:** Same region as your Neon database (e.g., `Oregon (US West)` or `Frankfurt (EU)`)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank)*
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install -r backend/requirements.txt && python backend/manage.py collectstatic --noinput && python backend/manage.py migrate
     ```
   - **Start Command:**
     ```bash
     gunicorn --chdir backend config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
     ```
   - **Instance Type:** `Free`

4. Add Environment Variables in the **Environment** tab:

| Variable | Value | Purpose |
|:---|:---|:---|
| `PYTHON_VERSION` | `3.11.9` | Stable runtime |
| `DEBUG` | `False` | Security hardening |
| `DJANGO_SECRET_KEY` | *(Click "Generate" or paste 50+ char random string)* | Cryptographic signing |
| `ALLOWED_HOSTS` | `.onrender.com,localhost,127.0.0.1` | Host header protection |
| `DATABASE_URL` | `postgres://user:pass@ep-...pooler.neon.tech/neondb?sslmode=require` | Neon pooled database |
| `DB_CONN_MAX_AGE` | `0` | Recommended for PgBouncer |
| `CORS_ALLOWED_ORIGINS` | `https://mintly.vercel.app` *(update with your Vercel URL)* | Frontend API access |
| `CSRF_TRUSTED_ORIGINS` | `https://mintly.vercel.app` *(update with your Vercel URL)* | CSRF validation |
| `QSTASH_CURRENT_SIGNING_KEY` | `sig_...` *(from Upstash)* | Webhook verification |
| `QSTASH_NEXT_SIGNING_KEY` | `sig_...` *(from Upstash)* | Zero-downtime key rotation |
| `VAPID_PUBLIC_KEY` | `BA-1zgg-difTLX7c1f-7Q9pEDCIAqcuqK1eZWleFLV5uoELp4pxjaK3gojfea1q_rV2-hglypZavWpfphYC6qJ0` | Push notifications |
| `VAPID_PRIVATE_KEY` | *(your private PEM key)* | Web Push signing |
| `VAPID_CLAIM_EMAIL` | `mailto:notifications@mintly.app` | VAPID contact claim |

5. Click **Create Web Service**.
6. Wait for the build to finish. Once live, Render will assign your service a domain:
   `https://mintly-backend.onrender.com`

---

### STEP 4: Create Production Superuser Account on Render
Do not use automated or hardcoded scripts to create administrators.

1. In Render Dashboard, select `mintly-backend`.
2. Go to the **Shell** tab on the left menu.
3. Run the interactive command:
   ```bash
   python backend/manage.py createsuperuser
   ```
4. Enter your admin email, display name, and a strong password.

---

### STEP 5: Create Scheduled Cron Job in Upstash QStash
Now that your Render backend URL is live:

1. In [Upstash Console](https://console.upstash.com/), go to **QStash** -> **Schedules**.
2. Click **Create Schedule**.
3. Configure the schedule:
   - **Destination URL:** `https://mintly-backend.onrender.com/api/v1/notifications/qstash/process/`
   - **Cron Expression:** `*/15 * * * *` (Every 15 minutes)
   - **Method:** `POST`
   - **Retries:** `3`
4. Click **Schedule**.
5. QStash will now ping your Render backend every 15 minutes with a signed HMAC header (`Upstash-Signature`).
6. The backend verifies the signature, computes the localized time for each user according to their timezone (`Asia/Kolkata`, `America/New_York`, etc.), and delivers their morning briefing if their reminder time has arrived.
7. Deduplication keys ensure no user receives duplicate alerts on the same calendar day.

---

### STEP 6: Deploy React Frontend to Vercel

1. Log into [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select `frontend`.
   - **Build Command:** `npm run build` (runs `tsc && vite build`)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Add Environment Variable:
   - **`VITE_API_URL`**: `https://mintly-backend.onrender.com`
5. Click **Deploy**.
6. Vercel will build the frontend and assign a production URL (e.g. `https://mintly.vercel.app`).
7. **Important:** If your assigned Vercel URL differs from what you entered in Render's `CORS_ALLOWED_ORIGINS`, update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in Render's Environment tab.

---

### STEP 7: Verify Production Health and Connectivity

#### 1. Test Backend Health Probe
```bash
curl -s -i https://mintly-backend.onrender.com/api/health/
```
Expected output:
```http
HTTP/2 200
content-type: application/json

{
  "status": "healthy",
  "database": "ok",
  "application": "Mintly Personal Finance API",
  "version": "1.0.0"
}
```

#### 2. Test QStash Endpoint Health
```bash
curl -s -i https://mintly-backend.onrender.com/api/v1/notifications/qstash/process/
```
Expected output:
```http
HTTP/2 200
content-type: application/json

{
  "status": "active",
  "endpoint": "Mintly QStash Scheduled Notifications Endpoint",
  "message": "Send a POST request with a valid Upstash-Signature header to trigger scheduled notification processing."
}
```

#### 3. Test CORS Headers
```bash
curl -s -I -X OPTIONS https://mintly-backend.onrender.com/api/v1/auth/login/ \
  -H "Origin: https://mintly.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```
Expected output must contain:
```http
Access-Control-Allow-Origin: https://mintly.vercel.app
Access-Control-Allow-Credentials: true
```

#### 4. Test Frontend
Open `https://mintly.vercel.app` in your browser:
- Registration, login, and demo accounts work seamlessly.
- Dashboard, transaction entry, budget setup, and category breakdowns operate in real-time.
- Navigating directly to subroutes (e.g. `/budget` or `/analytics`) reloads correctly via [vercel.json](file:///Users/uddyalokbiswas/Desktop/Mintly/frontend/vercel.json).

---

## 3. Web Push Testing Protocol

> **Notice on Web Push:**  
> In-app notifications are stored in the database and appear immediately in the Notification Center.  
> Browser push notifications (native system banners) require:
> 1. A secure context (`https://` on both frontend and backend).
> 2. The user clicking **Enable Push Notifications** and approving browser permissions.
> 3. Valid `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` configured in the Render backend environment.

### Testing Web Push with a Real Subscription:
1. Log into `https://mintly.vercel.app`.
2. Go to **Settings** -> **Notifications**.
3. Toggle on **Browser Push Notifications**.
4. The browser will prompt: *"mintly.vercel.app wants to send you notifications"*. Click **Allow**.
5. Mintly's service worker registers the subscription and POSTs the endpoint and cryptographic keys to `/api/v1/notifications/push-subscriptions/`.
6. Click **Test Notification** in Settings to trigger a test push payload.
7. Verify the system notification banner appears on your desktop/mobile.

---

## 4. Safe Database Migration Commands

Always run migrations using zero-downtime, non-destructive flags:

```bash
# 1. Inspect unapplied migrations
python backend/manage.py showmigrations

# 2. Dry run check for schema drift
python backend/manage.py makemigrations --check --dry-run

# 3. Apply migrations cleanly
python backend/manage.py migrate --noinput
```

---

## 5. Automated Database Backup & Restore Utility

For Neon backups, use `scripts/db_backup_restore.sh`:

```bash
# Create timestamped gzip dump
export DATABASE_URL="postgres://user:pass@ep-...pooler.neon.tech/neondb?sslmode=require"
./scripts/db_backup_restore.sh backup

# Restore (requires typing 'RESTORE-MINTLY' to confirm)
./scripts/db_backup_restore.sh restore backups/mintly_backup_YYYYMMDD_HHMMSS.sql.gz
```
