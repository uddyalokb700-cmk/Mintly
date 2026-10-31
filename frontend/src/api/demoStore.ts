import { User, Budget, BudgetSummary, Transaction, Category, AppNotification, NotificationPreference } from '../types';

export const DEMO_TOKEN = 'demo-token-mintly-live';
const DEMO_STORAGE_KEY = 'mintly_demo_state_v1';

export interface DemoState {
  user: User;
  budget: Budget;
  categories: Category[];
  transactions: Transaction[];
  notifications: AppNotification[];
  preferences: NotificationPreference;
}

function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function createInitialDemoState(): DemoState {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysCount = getDaysInMonth(year, month);
  const monthStr = String(month).padStart(2, '0');
  const todayDay = now.getDate();
  const todayStr = getTodayStr();

  const prevDay1 = Math.max(1, todayDay - 1);
  const prevDay2 = Math.max(1, todayDay - 3);
  const prevDay3 = Math.max(1, todayDay - 5);

  const prevDate1Str = `${year}-${monthStr}-${String(prevDay1).padStart(2, '0')}`;
  const prevDate2Str = `${year}-${monthStr}-${String(prevDay2).padStart(2, '0')}`;
  const prevDate3Str = `${year}-${monthStr}-${String(prevDay3).padStart(2, '0')}`;

  const categories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining', icon: 'Utensils', color: '#F59E0B', category_type: 'expense', is_archived: false, is_custom: false, created_at: now.toISOString() },
    { id: 'cat-groceries', name: 'Groceries', icon: 'ShoppingCart', color: '#10B981', category_type: 'expense', is_archived: false, is_custom: false, created_at: now.toISOString() },
    { id: 'cat-transport', name: 'Transport', icon: 'Car', color: '#3B82F6', category_type: 'expense', is_archived: false, is_custom: false, created_at: now.toISOString() },
    { id: 'cat-entertainment', name: 'Entertainment', icon: 'Film', color: '#8B5CF6', category_type: 'expense', is_archived: false, is_custom: false, created_at: now.toISOString() },
    { id: 'cat-utilities', name: 'Utilities', icon: 'Zap', color: '#EC4899', category_type: 'expense', is_archived: false, is_custom: false, created_at: now.toISOString() },
    { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#06B6D4', category_type: 'expense', is_archived: false, is_custom: false, created_at: now.toISOString() },
    { id: 'cat-healthcare', name: 'Healthcare', icon: 'HeartPulse', color: '#EF4444', category_type: 'expense', is_archived: false, is_custom: false, created_at: now.toISOString() },
    { id: 'cat-salary', name: 'Salary', icon: 'Banknote', color: '#10B981', category_type: 'income', is_archived: false, is_custom: false, created_at: now.toISOString() },
  ];

  const user: User = {
    id: 'demo-user-7d429429',
    email: 'demo@mintly.app',
    name: 'Alex Demo',
    preferred_currency: 'INR',
    timezone: 'Asia/Kolkata',
    theme: 'dark',
    created_at: now.toISOString(),
  };

  const periodStart = `${year}-${monthStr}-01`;
  const periodEnd = `${year}-${monthStr}-${String(daysCount).padStart(2, '0')}`;
  const monthlyIncome = '30000.00';
  const savingsTarget = '6000.00';
  const spendableBudget = '24000.00';
  const baseDailyAllowance = (24000 / daysCount).toFixed(2);

  const budget: Budget = {
    id: 'demo-budget-01',
    period_start: periodStart,
    period_end: periodEnd,
    monthly_income: monthlyIncome,
    savings_target: savingsTarget,
    currency: 'INR',
    status: 'active',
    income_frequency: 'monthly',
    spendable_budget: spendableBudget,
    base_daily_allowance: baseDailyAllowance,
    days_in_period: daysCount,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const transactions: Transaction[] = [
    {
      id: 'tx-01',
      budget: budget.id,
      category: categories[0],
      transaction_type: 'expense',
      amount: '240.00',
      currency: 'INR',
      description: 'Espresso & Butter Croissant',
      merchant: 'Artisan Cafe',
      payment_method: 'UPI',
      transaction_date: todayStr,
      transaction_time: '09:30:00',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'tx-02',
      budget: budget.id,
      category: categories[2],
      transaction_type: 'expense',
      amount: '350.00',
      currency: 'INR',
      description: 'Metro Card Recharge',
      merchant: 'Metro Transit',
      payment_method: 'UPI',
      transaction_date: todayStr,
      transaction_time: '11:15:00',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'tx-03',
      budget: budget.id,
      category: categories[1],
      transaction_type: 'expense',
      amount: '1250.00',
      currency: 'INR',
      description: 'Organic Groceries & Pantry Restock',
      merchant: 'FreshMarket Organic',
      payment_method: 'Card',
      transaction_date: prevDate1Str,
      transaction_time: '18:45:00',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'tx-04',
      budget: budget.id,
      category: categories[4],
      transaction_type: 'expense',
      amount: '1420.00',
      currency: 'INR',
      description: 'Fiber Internet & Power Bill',
      merchant: 'Airtel Broadband',
      payment_method: 'Bank Transfer',
      transaction_date: prevDate2Str,
      transaction_time: '14:20:00',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'tx-05',
      budget: budget.id,
      category: categories[3],
      transaction_type: 'expense',
      amount: '890.00',
      currency: 'INR',
      description: 'Weekend Movie & Snacks',
      merchant: 'PVR Cinemas',
      payment_method: 'UPI',
      transaction_date: prevDate3Str,
      transaction_time: '20:00:00',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'tx-06',
      budget: budget.id,
      category: categories[7],
      transaction_type: 'income',
      amount: '30000.00',
      currency: 'INR',
      description: 'Monthly Salary Credit',
      merchant: 'Tech Corp Employer',
      payment_method: 'Bank Transfer',
      transaction_date: periodStart,
      transaction_time: '09:00:00',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-01',
      notification_type: 'morning_greeting',
      title: 'Good morning, Alex!',
      body: `Your daily allowance today is ₹${baseDailyAllowance}. Have a mindful day!`,
      is_read: false,
      read_at: null,
      created_at: now.toISOString(),
    },
    {
      id: 'notif-02',
      notification_type: 'budget_alert',
      title: 'Monthly Budget Active',
      body: `₹${spendableBudget} allocated across ${daysCount} days with ₹${savingsTarget} savings locked.`,
      is_read: true,
      read_at: now.toISOString(),
      created_at: now.toISOString(),
    },
  ];

  const preferences: NotificationPreference = {
    morning_reminder_enabled: true,
    reminder_time: '08:00',
    timezone: 'Asia/Kolkata',
    overspending_alerts_enabled: true,
    threshold_percentage: 80,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    push_enabled: true,
  };

  return {
    user,
    budget,
    categories,
    transactions,
    notifications,
    preferences,
  };
}

class DemoStore {
  private getState(): DemoState {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // Fallback to fresh initial state
      }
    }
    const fresh = createInitialDemoState();
    this.saveState(fresh);
    return fresh;
  }

  private saveState(state: DemoState) {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  }

  public isDemoSession(): boolean {
    return localStorage.getItem('mintly_token') === DEMO_TOKEN;
  }

  public initDemoSession(): { token: string; user: User; has_budget: boolean; message: string } {
    const state = this.getState();
    localStorage.setItem('mintly_token', DEMO_TOKEN);
    sessionStorage.setItem('mintly_demo_mode', 'true');
    return {
      token: DEMO_TOKEN,
      user: state.user,
      has_budget: true,
      message: 'Logged in as Demo User.',
    };
  }

  public resetDemoData(): { token: string; user: User; has_budget: boolean; message: string } {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    const fresh = createInitialDemoState();
    this.saveState(fresh);
    return {
      token: DEMO_TOKEN,
      user: fresh.user,
      has_budget: true,
      message: 'Demo data reset successfully.',
    };
  }

  public getUser(): User {
    return this.getState().user;
  }

  public updateUser(data: Partial<User>): User {
    const state = this.getState();
    state.user = { ...state.user, ...data };
    this.saveState(state);
    return state.user;
  }

  public getCategories(): Category[] {
    return this.getState().categories;
  }

  public getCurrentBudget(): { has_budget: boolean; budget: Budget; summary: BudgetSummary } {
    const state = this.getState();
    const summary = this.calculateSummary(state);
    return {
      has_budget: true,
      budget: state.budget,
      summary,
    };
  }

  public updateBudget(data: Partial<Budget>): Budget {
    const state = this.getState();
    const monthlyIncome = parseFloat(String(data.monthly_income ?? state.budget.monthly_income));
    const savingsTarget = parseFloat(String(data.savings_target ?? state.budget.savings_target));
    const spendable = Math.max(0, monthlyIncome - savingsTarget);
    const days = state.budget.days_in_period;
    const baseDaily = (spendable / days).toFixed(2);

    state.budget = {
      ...state.budget,
      ...data,
      monthly_income: monthlyIncome.toFixed(2),
      savings_target: savingsTarget.toFixed(2),
      spendable_budget: spendable.toFixed(2),
      base_daily_allowance: baseDaily,
      updated_at: new Date().toISOString(),
    };
    this.saveState(state);
    return state.budget;
  }

  public getTransactions(params?: Record<string, any>): { count: number; results: Transaction[] } {
    const state = this.getState();
    let txs = [...state.transactions];

    if (params?.type) {
      txs = txs.filter((t) => t.transaction_type === params.type);
    }
    if (params?.category) {
      txs = txs.filter((t) => t.category?.id === params.category);
    }
    if (params?.start_date) {
      txs = txs.filter((t) => t.transaction_date >= params.start_date);
    }
    if (params?.end_date) {
      txs = txs.filter((t) => t.transaction_date <= params.end_date);
    }
    if (params?.search) {
      const q = String(params.search).toLowerCase();
      txs = txs.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.merchant?.toLowerCase().includes(q) ||
          t.category?.name.toLowerCase().includes(q)
      );
    }

    txs.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
    return {
      count: txs.length,
      results: txs,
    };
  }

  public addTransaction(data: any): Transaction {
    const state = this.getState();
    const category = state.categories.find((c) => c.id === data.category_id) || null;
    const todayStr = getTodayStr();

    const newTx: Transaction = {
      id: `demo-tx-${Date.now()}`,
      budget: state.budget.id,
      category,
      transaction_type: data.transaction_type || 'expense',
      amount: parseFloat(String(data.amount)).toFixed(2),
      currency: data.currency || state.budget.currency,
      description: data.description || '',
      merchant: data.merchant || '',
      payment_method: data.payment_method || 'UPI',
      transaction_date: data.transaction_date || todayStr,
      transaction_time: data.transaction_time || new Date().toTimeString().split(' ')[0],
      receipt_key: data.receipt_key || '',
      receipt_url: data.receipt_url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    state.transactions.unshift(newTx);
    this.saveState(state);
    return newTx;
  }

  public updateTransaction(id: string, data: any): Transaction {
    const state = this.getState();
    const idx = state.transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Transaction not found');

    const category = data.category_id
      ? state.categories.find((c) => c.id === data.category_id) || state.transactions[idx].category
      : state.transactions[idx].category;

    const updated: Transaction = {
      ...state.transactions[idx],
      ...data,
      category,
      amount: data.amount ? parseFloat(String(data.amount)).toFixed(2) : state.transactions[idx].amount,
      updated_at: new Date().toISOString(),
    };

    state.transactions[idx] = updated;
    this.saveState(state);
    return updated;
  }

  public deleteTransaction(id: string): { status: string } {
    const state = this.getState();
    state.transactions = state.transactions.filter((t) => t.id !== id);
    this.saveState(state);
    return { status: 'deleted' };
  }

  public exportCsv(): string {
    const state = this.getState();
    const headers = ['Date', 'Type', 'Category', 'Merchant', 'Description', 'Amount', 'Currency', 'Payment Method'];
    const rows = state.transactions.map((t) => [
      t.transaction_date,
      t.transaction_type,
      t.category?.name || 'Uncategorized',
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount,
      t.currency,
      t.payment_method,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public calculateSummary(state: DemoState): BudgetSummary {
    const budget = state.budget;
    const now = new Date();
    const todayStr = getTodayStr();

    const periodStartDate = new Date(budget.period_start + 'T00:00:00');
    const periodEndDate = new Date(budget.period_end + 'T00:00:00');
    const todayDate = new Date(todayStr + 'T00:00:00');

    const daysInPeriod = budget.days_in_period;
    let daysElapsed = Math.floor((todayDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    daysElapsed = Math.max(1, Math.min(daysInPeriod, daysElapsed));
    const daysRemaining = Math.max(1, daysInPeriod - daysElapsed + 1);

    const spendable = parseFloat(budget.spendable_budget);
    const baseDaily = parseFloat(budget.base_daily_allowance);

    // Sum monthly spending
    const expenses = state.transactions.filter(
      (t) =>
        t.transaction_type === 'expense' &&
        t.transaction_date >= budget.period_start &&
        t.transaction_date <= budget.period_end
    );

    const monthlySpendingNum = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const monthlyRemainingNum = spendable - monthlySpendingNum;

    // Sum today spending
    const todayExpenses = expenses.filter((t) => t.transaction_date === todayStr);
    const todaySpendingNum = todayExpenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const isMonthlyOverspent = monthlyRemainingNum < 0;
    const monthlyOverspentAmount = isMonthlyOverspent ? Math.abs(monthlyRemainingNum).toFixed(2) : '0.00';
    const monthlyUsagePct = spendable > 0 ? (monthlySpendingNum / spendable) * 100 : 0;

    // Adaptive daily allowance
    const adaptiveDailyNum = monthlyRemainingNum <= 0 ? 0 : monthlyRemainingNum / daysRemaining;
    const todayRemainingNum = baseDaily - todaySpendingNum;
    const isTodayOverspent = todayRemainingNum < 0;
    const todayOverspentAmount = isTodayOverspent ? Math.abs(todayRemainingNum).toFixed(2) : '0.00';
    const todayUsagePct = baseDaily > 0 ? (todaySpendingNum / baseDaily) * 100 : 0;

    const avgDailyNum = daysElapsed > 0 ? monthlySpendingNum / daysElapsed : 0;
    const projectedNum = avgDailyNum * daysInPeriod;

    const totalAllocated = (baseDaily * daysInPeriod).toFixed(2);
    const residual = (spendable - parseFloat(totalAllocated)).toFixed(2);

    return {
      budget_id: budget.id,
      currency: budget.currency,
      period_start: budget.period_start,
      period_end: budget.period_end,
      days_in_period: daysInPeriod,
      days_elapsed: daysElapsed,
      days_remaining_including_today: daysRemaining,
      monthly_income: budget.monthly_income,
      savings_target: budget.savings_target,
      monthly_spendable_budget: budget.spendable_budget,
      base_daily_allowance: budget.base_daily_allowance,
      today_spending: todaySpendingNum.toFixed(2),
      today_remaining_allowance: todayRemainingNum.toFixed(2),
      is_today_overspent: isTodayOverspent,
      today_overspent_amount: todayOverspentAmount,
      today_usage_percentage: Math.min(999, parseFloat(todayUsagePct.toFixed(1))),
      monthly_spending: monthlySpendingNum.toFixed(2),
      monthly_remaining_budget: Math.max(0, monthlyRemainingNum).toFixed(2),
      is_monthly_overspent: isMonthlyOverspent,
      monthly_overspent_amount: monthlyOverspentAmount,
      monthly_usage_percentage: Math.min(999, parseFloat(monthlyUsagePct.toFixed(1))),
      adaptive_daily_allowance: adaptiveDailyNum.toFixed(2),
      average_daily_spending: avgDailyNum.toFixed(2),
      projected_month_end_spending: projectedNum.toFixed(2),
      projected_is_estimate: true,
      reconciliation: {
        base_allowance: budget.base_daily_allowance,
        total_allocated: totalAllocated,
        residual_paise: residual,
        reconciled_sum: budget.spendable_budget,
      },
    };
  }

  public getAnalyticsOverview(): any {
    const state = this.getState();
    const summary = this.calculateSummary(state);
    const income = parseFloat(state.budget.monthly_income);
    const spent = parseFloat(summary.monthly_spending);
    const netSavings = income - spent;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

    return {
      total_income: income.toFixed(2),
      total_spent: spent.toFixed(2),
      net_savings: netSavings.toFixed(2),
      savings_rate: parseFloat(savingsRate.toFixed(1)),
      budget_usage_pct: summary.monthly_usage_percentage,
      average_daily_spending: summary.average_daily_spending,
      projected_month_end_spending: summary.projected_month_end_spending,
    };
  }

  public getCategoryBreakdown(): { categories: any[] } {
    const state = this.getState();
    const totals: Record<string, { category: Category; total: number; count: number }> = {};

    state.transactions
      .filter((t) => t.transaction_type === 'expense')
      .forEach((t) => {
        const catId = t.category?.id || 'other';
        const cat = t.category || {
          id: 'other',
          name: 'Other',
          icon: 'MoreHorizontal',
          color: '#6B7280',
          category_type: 'expense',
          is_archived: false,
          is_custom: false,
          created_at: '',
        };
        if (!totals[catId]) {
          totals[catId] = { category: cat, total: 0, count: 0 };
        }
        totals[catId].total += parseFloat(t.amount);
        totals[catId].count += 1;
      });

    const sumTotal = Object.values(totals).reduce((sum, item) => sum + item.total, 0);

    const categories = Object.values(totals).map((item) => ({
      category_id: item.category.id,
      category_name: item.category.name,
      icon: item.category.icon,
      color: item.category.color,
      total_amount: item.total.toFixed(2),
      transaction_count: item.count,
      percentage: sumTotal > 0 ? parseFloat(((item.total / sumTotal) * 100).toFixed(1)) : 0,
    }));

    categories.sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount));
    return { categories };
  }

  public getDailyTrends(): { trends: any[] } {
    const state = this.getState();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const daysCount = getDaysInMonth(year, month);
    const monthStr = String(month).padStart(2, '0');

    const dailyMap: Record<string, number> = {};
    for (let d = 1; d <= daysCount; d++) {
      const dateStr = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
      dailyMap[dateStr] = 0;
    }

    state.transactions
      .filter((t) => t.transaction_type === 'expense')
      .forEach((t) => {
        if (dailyMap[t.transaction_date] !== undefined) {
          dailyMap[t.transaction_date] += parseFloat(t.amount);
        }
      });

    const trends = Object.entries(dailyMap).map(([date, amount]) => ({
      date,
      amount: amount.toFixed(2),
      allowance: state.budget.base_daily_allowance,
    }));

    return { trends };
  }

  public getSpendingCalendar(): { daily_spending: Record<string, string> } {
    const state = this.getState();
    const dailySpending: Record<string, string> = {};

    state.transactions
      .filter((t) => t.transaction_type === 'expense')
      .forEach((t) => {
        const cur = parseFloat(dailySpending[t.transaction_date] || '0');
        dailySpending[t.transaction_date] = (cur + parseFloat(t.amount)).toFixed(2);
      });

    return { daily_spending: dailySpending };
  }

  public getNotifications(): { unread_count: number; notifications: AppNotification[] } {
    const state = this.getState();
    const unread = state.notifications.filter((n) => !n.is_read).length;
    return {
      unread_count: unread,
      notifications: state.notifications,
    };
  }

  public markNotificationRead(id: string) {
    const state = this.getState();
    state.notifications = state.notifications.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
    this.saveState(state);
  }

  public markAllNotificationsRead() {
    const state = this.getState();
    state.notifications = state.notifications.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }));
    this.saveState(state);
  }

  public addCategory(data: any): Category {
    const state = this.getState();
    const newCat: Category = {
      id: `cat-custom-${Date.now()}`,
      name: data.name || 'Custom Category',
      icon: data.icon || 'Tag',
      color: data.color || '#35E6A0',
      category_type: data.category_type || 'expense',
      is_archived: false,
      is_custom: true,
      created_at: new Date().toISOString(),
    };
    state.categories.push(newCat);
    this.saveState(state);
    return newCat;
  }

  public getPreferences(): NotificationPreference {
    return this.getState().preferences;
  }

  public updatePreferences(data: Partial<NotificationPreference>): NotificationPreference {
    const state = this.getState();
    state.preferences = { ...state.preferences, ...data };
    this.saveState(state);
    return state.preferences;
  }

  public triggerTestGreeting(): { status: string; message: string } {
    const state = this.getState();
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      notification_type: 'morning_greeting',
      title: 'Good morning, Alex!',
      body: `Live demo greeting alert! Today's recommended spending is ₹${state.budget.base_daily_allowance}.`,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    state.notifications.unshift(newNotif);
    this.saveState(state);
    return { status: 'sent', message: 'Test greeting notification created in demo session.' };
  }

  public handleDemoRequest(endpoint: string, options: RequestInit = {}): any {
    const method = (options.method || 'GET').toUpperCase();
    const cleanUrl = endpoint.split('?')[0].replace(/\/+$/, '');
    const urlParams = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');
    let body: any = {};
    if (options.body) {
      try {
        body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      } catch (e) {
        body = {};
      }
    }

    // Auth
    if (cleanUrl === '/auth/demo' && method === 'POST') {
      return this.initDemoSession();
    }
    if (cleanUrl === '/auth/me') {
      if (method === 'PATCH') {
        return this.updateUser(body);
      }
      return { user: this.getUser(), has_budget: true };
    }
    if (cleanUrl === '/auth/logout') {
      return { message: 'Logged out successfully' };
    }
    if (cleanUrl === '/auth/change-password') {
      return { message: 'Password updated successfully' };
    }

    // Budgets
    if (cleanUrl === '/budgets/current') {
      return this.getCurrentBudget();
    }
    if (cleanUrl === '/budgets/history') {
      return [this.getState().budget];
    }
    if (cleanUrl === '/budgets' || cleanUrl.match(/^\/budgets\/[a-zA-Z0-9_-]+$/)) {
      if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
        const budget = this.updateBudget(body);
        const summary = this.calculateSummary(this.getState());
        return { budget, summary, message: 'Budget updated successfully' };
      }
      return this.getCurrentBudget();
    }

    // Categories
    if (cleanUrl === '/categories') {
      if (method === 'POST') {
        return this.addCategory(body);
      }
      return this.getCategories();
    }

    // Transactions
    if (cleanUrl === '/transactions') {
      if (method === 'POST') {
        const tx = this.addTransaction(body);
        const summary = this.calculateSummary(this.getState());
        return { transaction: tx, summary, message: 'Transaction created successfully' };
      }
      const paramsObj: Record<string, string> = {};
      urlParams.forEach((v, k) => {
        paramsObj[k] = v;
      });
      return this.getTransactions(paramsObj);
    }
    if (cleanUrl === '/transactions/export-csv' || cleanUrl.includes('export-csv')) {
      return this.exportCsv();
    }
    const txIdMatch = cleanUrl.match(/^\/transactions\/([a-zA-Z0-9_-]+)$/);
    if (txIdMatch) {
      const txId = txIdMatch[1];
      if (method === 'DELETE') {
        return this.deleteTransaction(txId);
      }
      if (method === 'PATCH' || method === 'PUT') {
        const tx = this.updateTransaction(txId, body);
        const summary = this.calculateSummary(this.getState());
        return { transaction: tx, summary, message: 'Transaction updated successfully' };
      }
    }

    // Analytics
    if (cleanUrl === '/analytics/overview') {
      return this.getAnalyticsOverview();
    }
    if (cleanUrl === '/analytics/categories' || cleanUrl === '/analytics/category-breakdown') {
      return this.getCategoryBreakdown();
    }
    if (cleanUrl === '/analytics/trends' || cleanUrl === '/analytics/daily-trends') {
      return this.getDailyTrends();
    }
    if (cleanUrl === '/analytics/calendar' || cleanUrl === '/analytics/spending-calendar') {
      return this.getSpendingCalendar();
    }

    // Notifications
    if (cleanUrl === '/notifications') {
      return this.getNotifications();
    }
    if (cleanUrl === '/notifications/preferences') {
      if (method === 'PATCH' || method === 'POST') {
        return this.updatePreferences(body);
      }
      return this.getPreferences();
    }
    if (cleanUrl === '/notifications/read-all') {
      this.markAllNotificationsRead();
      return { status: 'ok' };
    }
    if (cleanUrl.match(/^\/notifications\/[a-zA-Z0-9_-]+\/read$/)) {
      const id = cleanUrl.split('/')[2];
      this.markNotificationRead(id);
      return { status: 'ok' };
    }
    if (cleanUrl === '/notifications/vapid-key') {
      return { publicKey: 'BA-demo-mock-vapid-key-mintly-live' };
    }
    if (cleanUrl === '/notifications/push-subscriptions') {
      return { status: 'subscribed' };
    }
    if (cleanUrl === '/notifications/test-morning-greeting') {
      return this.triggerTestGreeting();
    }

    // Storage
    if (cleanUrl === '/storage/health' || cleanUrl === '/health') {
      return {
        status: 'healthy',
        database: 'ok',
        database_engine: 'postgresql',
        object_storage: { status: 'healthy', bucket: 'assets' },
        application: 'Mintly Personal Finance API (Live Demo)',
        version: '1.0.0',
      };
    }
    if (cleanUrl === '/storage/upload') {
      return {
        status: 'success',
        key: `receipts/demo/receipt_${Date.now()}.png`,
        filename: 'demo_receipt.png',
        size: 1024,
        content_type: 'image/png',
        category: 'receipts',
        presigned_url: 'https://images.unsplash.com/photo-1554415707-9e4466b88788?w=800&auto=format&fit=crop&q=60',
        bucket: 'assets',
      };
    }

    return {};
  }
}

export const demoStore = new DemoStore();
