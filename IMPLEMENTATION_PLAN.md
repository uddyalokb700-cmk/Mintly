# Mintly — Implementation Plan & Architecture Specification

## Overview
Mintly is a production-grade personal finance and daily spending management application built with:
- **Backend:** Python 3, Django, Django REST Framework, PostgreSQL-ready (with SQLite default for immediate local running), Celery & Redis for scheduled tasks, pywebpush for Web Push VAPID notifications.
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide icons, Recharts, React Router v6, TanStack Query, React Hook Form, Zod.
- **Brand & Theme:** Dark theme default (`#080B0A` background, `#111715` surface, `#151D19` elevated cards, emerald accent `#35E6A0`, coral overspending warning), with light theme support.

---

## 1. Directory Structure

```
Mintly/
├── backend/
│   ├── config/               # Django root settings, urls, wsgi, celery
│   ├── apps/
│   │   ├── users/            # Custom User, Auth (Register, Login, Me, Password Reset)
│   │   ├── budgets/          # Budget model, BudgetEngine, Budget APIs
│   │   ├── categories/       # Category model, System defaults + custom categories
│   │   ├── transactions/     # Transaction model, CRUD, CSV export, filtering
│   │   ├── analytics/        # Overview, Category breakdown, Trends, Calendar
│   │   └── notifications/    # Notification prefs, Push subscriptions, Web Push, in-app
│   ├── tests/                # Automated tests (Engine, Leap year, Paise reconciliation, API)
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios/Fetch client, API endpoints
│   │   ├── components/       # UI elements (Cards, Buttons, Dialogs, Inputs, Charts, Layout)
│   │   ├── contexts/         # AuthContext, ThemeContext, NotificationContext
│   │   ├── pages/            # Dashboard, Transactions, Analytics, BudgetSettings, Settings, Auth, Onboarding
│   │   ├── types/            # TypeScript interfaces for API models
│   │   ├── utils/            # Currency formatting, date helpers, calculations
│   │   ├── App.tsx
│   │   └── index.css         # Tailwind tokens & dark/light theme
│   ├── public/
│   │   └── sw.js             # Service worker for Web Push notifications
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 2. Budget Engine Core Rules & Calculations
- **Spendable Budget** = `income - savings_target` (validation: `savings_target < income`).
- **Base Daily Allowance** = `spendable_budget / days_in_month` using Decimal arithmetic.
- **Paise Reconciliation** = Rounded daily allowances tracked so total daily allowances reconcile exactly with monthly spendable budget.
- **Today's Spending** = Sum of expenses for user's local calendar day.
- **Today's Remaining Allowance** = `base_daily_allowance - today_spending` (can become negative for overspending).
- **Monthly Remaining Budget** = `monthly_spendable_budget - monthly_spending`.
- **Adaptive Daily Allowance** = `max(0, monthly_remaining_budget) / remaining_days_including_today`. If monthly budget is exhausted, recommended is 0 and deficit is clearly highlighted.

---

## 3. Implementation Steps

1. **Phase 1: Backend Foundation & Models**
   - Configure Django project `config` and apps: `users`, `budgets`, `categories`, `transactions`, `analytics`, `notifications`.
   - Setup JWT/Token authentication, CORS, centralized exception handling.
   - Implement `BudgetEngine` with Decimal precision.

2. **Phase 2: Backend APIs & Seed Data**
   - Endpoints for Auth, Budget setup & summary, Categories, Transactions (filter/sort/pagination/CSV), Analytics (calendar, trends, category breakdown), Notifications (in-app + push + VAPID).
   - Seed script `seed_demo_data` with realistic multi-day transactions and categories.

3. **Phase 3: Automated Backend Tests**
   - 20+ unit and integration tests covering leap year, 28/29/30/31 days, negative balances, paise reconciliation, cross-user isolation, notification preferences.

4. **Phase 4: Frontend Setup & Design System**
   - Vite + React + TypeScript + Tailwind CSS setup.
   - Theme variables: Dark mode (#080B0A, #111715, #151D19, emerald #35E6A0) and Light mode.
   - Core UI components: Modal, Drawer, Toast, Badge, Card, Tabular Currency Display, Skeleton loaders.

5. **Phase 5: Auth & Onboarding Flow**
   - Welcome Screen with quick Demo Login.
   - Register, Login, Password Reset screens.
   - 5-step Onboarding Wizard with live allowance calculation preview.

6. **Phase 6: Dashboard & Core Features**
   - Header with dynamic time-based greeting, notification bell, profile.
   - Daily Allowance Card with progress bar, overspending coral alert, adaptive allowance.
   - Monthly Overview cards, Rule-based insight.
   - Today's expenses list & Quick action buttons.
   - Add Expense / Add Income modal with category picker, receipt note, payment method.

7. **Phase 7: Transactions & Analytics**
   - Transactions view: Date grouping, search, filters, pagination, edit/delete modals, CSV download.
   - Analytics view: Recharts donut for categories, daily spending vs allowance bar chart, interactive monthly calendar with color-coded days.

8. **Phase 8: Notifications, Push & Settings**
   - Web Push service worker registration, VAPID key handshake, morning reminder test, spending alert test.
   - Settings: Theme switch, currency switcher, timezone, reminder times, quiet hours, data export, demo data reset.

9. **Phase 9: Verification, Polish & Documentation**
   - Run backend test suite.
   - Run browser subagent to test full flow: register, onboard, add expense, check negative balance warning, transactions, analytics, settings.
   - Provide complete `.env.example`, `docker-compose.yml`, and comprehensive `README.md`.
