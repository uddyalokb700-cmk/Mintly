# Mintly — AI-Ready Personal Finance & Daily Budget Management

> **"Plan. Track. Save. Live Better."**  
> *Know how much you can spend today without losing control of your monthly budget.*

---

## 1. Product Vision & Architecture

Mintly is a personal finance and daily spending management application built to help users control monthly expenses, achieve savings targets, and establish disciplined financial habits.

### Core Calculation Engine
- **Spendable Monthly Budget:** `Monthly Income - Savings Target` (Strict validation: `Savings Target <= Monthly Income`).
- **Base Daily Allowance:** `Monthly Spendable Budget ÷ Calendar Days in Budget Period`. Uses high-precision `Decimal` arithmetic, deterministic rounding, and paise reconciliation to prevent financial leakage.
- **Overspending Visibility:** When today's expenses exceed the allowance, the remaining allowance displays the true negative balance (e.g. `-₹150.00`) and highlights the overspent deficit with a warning alert.
- **Adaptive Daily Allowance:** Re-evaluates remaining budget across remaining calendar days (`Remaining Budget ÷ Remaining Days including Today`), automatically recalculating whenever transactions are recorded, edited, or deleted.

---

## 2. Technology Stack

### Backend
- **Python 3.14 / 3.11**
- **Django 5.x & Django REST Framework (DRF)**
- **PostgreSQL-ready** (with automatic zero-config SQLite default for quick local runs)
- **Celery 5.x & Redis** for scheduled morning push notifications and background jobs
- **pywebpush** with VAPID key handshake for Web Push standard browser notifications
- **Token-based Authentication & Django Secure Password Hashing**

### Frontend
- **React 18 & TypeScript**
- **Vite** fast bundling & HMR
- **Tailwind CSS** with custom dark/light fintech theme tokens (`#080B0A` primary, `#35E6A0` emerald accent, `#F43F5E` overspending coral)
- **Lucide Icons**
- **Recharts** for trend analytics, category breakdown donut charts, and calendar matrices
- **React Router v6**
- **TanStack React Query**
- **React Hook Form & Zod** for strict type-safe form validation
- **canvas-confetti** for goal milestones

---

## 3. Directory Structure

```
Mintly/
├── backend/
│   ├── config/               # Django settings, URLs, WSGI, Celery configuration
│   ├── apps/
│   │   ├── users/            # Custom User model, auth views, password reset, demo login
│   │   ├── budgets/          # Budget model, centralized BudgetEngine, views, serializers
│   │   ├── categories/       # Category model, system defaults, custom categories
│   │   ├── transactions/     # Transaction model, CRUD, date grouping, CSV export
│   │   ├── analytics/        # Overview, category breakdowns, daily trends, calendar
│   │   └── notifications/    # Preferences, Web Push, in-app notification center, Celery tasks
│   ├── tests/                # Automated tests (Engine math, leap years, API isolation)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/              # API client and request utilities
│   │   ├── components/       # UI building blocks (Navbar, Sidebar, BottomNav, Card, Modal, Badge)
│   │   ├── contexts/         # AuthContext, ThemeContext, NotificationContext
│   │   ├── features/         # Add/Edit Transaction modals, NotificationDrawer
│   │   ├── pages/            # Dashboard, Transactions, Analytics, BudgetSettings, Settings, Auth
│   │   ├── types/            # TypeScript data definitions
│   │   ├── utils/            # Currency formatting, date helpers, time greetings
│   │   ├── App.tsx           # Route guards and router configuration
│   │   └── index.css         # Design system tokens and tabular numerals
│   ├── public/
│   │   ├── sw.js             # Service Worker for Web Push notifications
│   │   └── favicon.svg       # Brand icon
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml        # Multi-container orchestration (DB, Redis, Backend, Celery, Frontend)
├── .env.example              # Environment variables template
├── IMPLEMENTATION_PLAN.md    # Architecture and specification plan
└── README.md
```

---

## 4. Quickstart Guide (Local Development)

### Prerequisites
- Python 3.10+ (or Python 3.14)
- Node.js 18+ and npm

### Step 1: Clone and Set Up Backend
```bash
cd /path/to/Mintly

# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install Python dependencies
pip install -r backend/requirements.txt

# 3. Run database migrations
python3 backend/manage.py migrate

# 4. Seed realistic demo data (optional but recommended)
python3 backend/manage.py seed_demo_data

# 5. Start the Django API server
python3 backend/manage.py runserver 127.0.0.1:8000
```
Backend API will be accessible at: `http://127.0.0.1:8000/`  
Health check endpoint: `http://127.0.0.1:8000/api/health/`

### Step 2: Set Up Frontend
In a new terminal window:
```bash
cd /path/to/Mintly/frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```
Frontend will be accessible at: `http://127.0.0.1:5173/`

---

## 5. Instant Demo Mode

To test Mintly without typing credentials:
1. Open `http://127.0.0.1:5173/welcome`
2. Click **"Try Live Demo"** or click **"One-Click Demo Access"** on the Sign In page.
3. You will immediately be signed into the demo account (`Alex Johnson`) with:
   - Monthly Income: **₹30,000.00**
   - Savings Target: **₹6,000.00**
   - Spendable Budget: **₹24,000.00**
   - Daily Allowance (30/31 days): **~₹800.00**
   - Pre-seeded expenses with category breakdowns.

---

## 6. Docker & Container Deployment

To launch the full production-ready stack (PostgreSQL 16, Redis 7, Django API, Celery Worker, and Frontend with Nginx):

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Build and start all containers
docker-compose up --build -d

# 3. Check container logs
docker-compose logs -f
```

Services in Docker Compose:
- `http://localhost:80` — Frontend (Nginx)
- `http://localhost:8000` — Backend Django REST API
- `localhost:5432` — PostgreSQL Database
- `localhost:6379` — Redis Broker & Result Backend
- `mintly_celery` — Celery background worker

---

## 7. Production Readiness & Documentation

Mintly is fully audited, security-hardened, and documented for real-world deployment. Complete operational documentation is available in the repository root:

- [PRODUCTION_AUDIT.md](file:///Users/uddyalokbiswas/Desktop/Mintly/PRODUCTION_AUDIT.md): Complete findings across Critical, High, Medium, and Low categories (all 14 issues remediated).
- [DEPLOYMENT_GUIDE.md](file:///Users/uddyalokbiswas/Desktop/Mintly/DEPLOYMENT_GUIDE.md): Step-by-step production setup for Vercel, Railway/Render/Docker, PostgreSQL, Redis, Celery workers/beat, and VAPID.
- [SECURITY_CHECKLIST.md](file:///Users/uddyalokbiswas/Desktop/Mintly/SECURITY_CHECKLIST.md): OWASP-aligned security verification (IDOR prevention, token hashing, rate limiting, and secure headers).
- [TEST_REPORT.md](file:///Users/uddyalokbiswas/Desktop/Mintly/TEST_REPORT.md): Complete test run results, scenario validation details (Scenarios A–D), and bundle metrics.

---

## 8. Automated Test Suite

Mintly includes 28 automated tests across financial calculation, security/IDOR prevention, and full end-to-end user lifecycles:

1. **Monthly spendable budget calculation** (`income - savings_target`).
2. **Correct daily allowances** across 28, 29, 30, and 31-day months.
3. **Leap-year handling** in February (2024 has 29 days, 2025 has 28 days).
4. **Monetary rounding & exact paise reconciliation** (`reconciled_sum == spendable_budget`).
5. **Rejection of invalid savings targets** (exceeding income or negative).
6. **Daily remaining balance calculation**.
7. **Negative daily balance & overspent alert flags** when overspending.
8. **Monthly remaining budget tracking**.
9. **Adaptive daily allowance adjustment** based on remaining calendar days.
10. **Dynamic balance recalculation** after transaction editing.
11. **Dynamic balance recalculation** after transaction deletion.
12. **Timezone-aware daily expense grouping**.
13. **Month-boundary transaction filtering**.
14. **Authentication enforcement** on protected endpoints (401 Unauthorized).
15. **Prevention of cross-user data access** (User A cannot view/edit/delete User B's records).
16. **Notification preference enforcement** (quiet hours & disable alerts).
17. **Deduplication of alerts** for identical events/dates.
18. **Graceful handling of failed Web Push delivery**.
19. **Custom Category IDOR prevention** (User B cannot assign User A's private category).
20. **Secure SHA-256 password reset tokens** and production token leak prevention.
21. **Database health check validation** (`/api/health/` DB probe).
22. **Complete 13-step End-to-End User Journey test** (Registration -> Budget -> Expenses -> Alerts -> Morning Greetings -> Analytics -> Logout/Login -> Persistence).

To execute the automated test suite:
```bash
source .venv/bin/activate
python3 backend/manage.py test tests
```

Expected output:
```
Ran 28 tests in 3.319s
OK
```

---

## 8. REST API Documentation (`/api/v1/`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register/` | Register new account & generate token |
| `POST` | `/api/v1/auth/login/` | Sign in with email & password |
| `POST` | `/api/v1/auth/demo/` | 1-Click live demo account access |
| `GET/PATCH` | `/api/v1/auth/me/` | Current user profile |
| `POST` | `/api/v1/auth/password-reset/` | Request single-use password reset token |
| `POST` | `/api/v1/auth/password-reset/confirm/` | Confirm password reset |
| `GET` | `/api/v1/budgets/current/` | Active budget & live `BudgetEngine` summary |
| `POST` | `/api/v1/budgets/` | Create new budget period (archives previous) |
| `PATCH` | `/api/v1/budgets/{id}/` | Update active budget income/savings |
| `GET` | `/api/v1/budgets/history/` | Historical archived budget periods |
| `GET` | `/api/v1/transactions/` | Filter, search, paginate transactions |
| `POST` | `/api/v1/transactions/` | Record expense/income & trigger alerts |
| `PATCH` | `/api/v1/transactions/{id}/` | Edit transaction & recalculate allowances |
| `DELETE` | `/api/v1/transactions/{id}/` | Delete transaction & restore balances |
| `GET` | `/api/v1/transactions/export-csv/` | Download CSV transaction report |
| `GET` | `/api/v1/categories/` | List default & custom categories |
| `POST` | `/api/v1/categories/` | Create custom user category |
| `GET` | `/api/v1/analytics/overview/` | Monthly KPIs, usage percentage, estimates |
| `GET` | `/api/v1/analytics/categories/` | Category spending breakdown & percentages |
| `GET` | `/api/v1/analytics/trends/` | Daily spending vs allowance reference |
| `GET` | `/api/v1/analytics/calendar/` | Monthly calendar matrix with status tags |
| `GET` | `/api/v1/notifications/` | In-app notification center |
| `PATCH` | `/api/v1/notifications/{id}/read/` | Mark notification as read |
| `POST` | `/api/v1/notifications/read-all/` | Mark all notifications read |
| `GET/PATCH` | `/api/v1/notifications/preferences/` | Morning reminders & threshold alerts |
| `POST` | `/api/v1/notifications/push-subscriptions/` | Store browser Web Push subscription |
| `GET` | `/api/v1/notifications/vapid-key/` | Public VAPID key for browser service worker |
| `POST` | `/api/v1/notifications/test-morning-greeting/` | Trigger test morning greeting |

---

## 9. Brand & Visual Design Standards

- **Dark Theme (Default):** Near-black `#080B0A` background with elevated surface cards `#111715` and `#151D19`.
- **Accent:** Emerald green `#35E6A0` representing financial vitality and growth.
- **Overspending Warning:** Accessible coral red `#F43F5E` displaying true negative allowances.
- **Typography:** Inter with `tabular-nums` formatting for aligned financial figures.
- **Responsiveness:** Desktop sidebar navigation with quick actions, mobile bottom navigation bar with floating action button.
