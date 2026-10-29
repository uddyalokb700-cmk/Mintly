export interface User {
  id: string;
  email: string;
  name: string;
  preferred_currency: string;
  timezone: string;
  theme: 'dark' | 'light';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  category_type: 'expense' | 'income';
  is_archived: boolean;
  is_custom: boolean;
  created_at: string;
}

export interface ReconciliationInfo {
  base_allowance: string;
  total_allocated: string;
  residual_paise: string;
  reconciled_sum: string;
}

export interface BudgetSummary {
  budget_id: string;
  currency: string;
  period_start: string;
  period_end: string;
  days_in_period: number;
  days_elapsed: number;
  days_remaining_including_today: number;
  monthly_income: string;
  savings_target: string;
  monthly_spendable_budget: string;
  base_daily_allowance: string;
  today_spending: string;
  today_remaining_allowance: string;
  is_today_overspent: boolean;
  today_overspent_amount: string;
  today_usage_percentage: number;
  monthly_spending: string;
  monthly_remaining_budget: string;
  is_monthly_overspent: boolean;
  monthly_overspent_amount: string;
  monthly_usage_percentage: number;
  adaptive_daily_allowance: string;
  average_daily_spending: string;
  projected_month_end_spending: string;
  projected_is_estimate: boolean;
  reconciliation: ReconciliationInfo;
}

export interface Budget {
  id: string;
  period_start: string;
  period_end: string;
  monthly_income: string;
  savings_target: string;
  currency: string;
  status: 'active' | 'archived';
  income_frequency: string;
  income_description?: string;
  notes?: string;
  spendable_budget: string;
  base_daily_allowance: string;
  days_in_period: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  budget?: string | null;
  category: Category | null;
  transaction_type: 'expense' | 'income';
  amount: string;
  currency: string;
  description: string;
  merchant: string;
  payment_method: 'UPI' | 'Card' | 'Cash' | 'Bank Transfer' | 'Other';
  transaction_date: string;
  transaction_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  morning_reminder_enabled: boolean;
  reminder_time: string;
  timezone: string;
  overspending_alerts_enabled: boolean;
  threshold_percentage: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  push_enabled: boolean;
}

export interface AppNotification {
  id: string;
  notification_type: 'morning_greeting' | 'overspending_warning' | 'threshold_alert' | 'budget_alert' | 'system';
  title: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
