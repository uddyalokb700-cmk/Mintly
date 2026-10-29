import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Plus,
  Receipt,
  PieChart,
  Sliders,
  Sun,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Budget, BudgetSummary, Transaction } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { EditTransactionModal } from '../features/transactions/EditTransactionModal';
import { formatCurrency, getGreeting, formatRelativeDate } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openAddModal } = useOutletContext<{ openAddModal: () => void }>();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [hasBudget, setHasBudget] = useState<boolean>(true);
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ has_budget: boolean; budget?: Budget; summary?: BudgetSummary }>(
        '/budgets/current/'
      );
      if (!res.has_budget || !res.budget || !res.summary) {
        setHasBudget(false);
        setBudget(null);
        setSummary(null);
        setIsLoading(false);
        return;
      }

      setHasBudget(true);
      setBudget(res.budget);
      setSummary(res.summary);

      // Load today's transactions
      const todayStr = new Date().toISOString().split('T')[0];
      const txRes = await api.get<{ results: Transaction[] }>('/transactions/', {
        start_date: todayStr,
        end_date: todayStr,
        paginate: false,
      });

      const list = Array.isArray(txRes) ? txRes : txRes.results || [];
      setTodayTransactions(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => {
      loadDashboardData();
    };
    window.addEventListener('mintly_transaction_updated', handleUpdate);
    return () => window.removeEventListener('mintly_transaction_updated', handleUpdate);
  }, [loadDashboardData]);

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}/`);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete transaction');
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setIsEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-[#151D19]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-2xl bg-[#151D19]" />
          <div className="h-72 rounded-2xl bg-[#151D19]" />
        </div>
      </div>
    );
  }

  if (!hasBudget || !summary) {
    return (
      <div className="text-center py-20 px-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-mint-400/10 border border-mint-400/30 text-mint-400 mx-auto flex items-center justify-center mb-5">
          <Sliders className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">Welcome to Mintly!</h2>
        <p className="text-sm text-slate-400 mt-2 mb-6 leading-relaxed">
          You haven't set up your budget yet. Let's calculate your monthly spendable money and daily spending allowance in just 2 minutes.
        </p>
        <Button onClick={() => navigate('/onboarding')} size="lg" className="gap-2">
          <span>Set Up Your Budget</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const curr = summary.currency;
  const isOverspent = summary.is_today_overspent;
  const usagePercentageClamped = Math.min(100, Math.max(0, summary.today_usage_percentage));
  const { greeting } = getGreeting(user?.name);

  // Rule-based insight
  let insightText = '';
  if (isOverspent) {
    insightText = `You have exceeded today's allowance by ${formatCurrency(summary.today_overspent_amount, curr)}. Your recommended allowance for remaining days is adjusted to ${formatCurrency(summary.adaptive_daily_allowance, curr)}.`;
  } else if (summary.today_usage_percentage >= 80) {
    insightText = `You have used ${summary.today_usage_percentage.toFixed(0)}% of today's allowance. Remaining today: ${formatCurrency(summary.today_remaining_allowance, curr)}.`;
  } else if (parseFloat(summary.today_spending) === 0) {
    insightText = `You haven't spent anything today! Your full allowance of ${formatCurrency(summary.base_daily_allowance, curr)} is available.`;
  } else {
    insightText = `You have used ${summary.today_usage_percentage.toFixed(0)}% of today's allowance. You are well within budget!`;
  }

  return (
    <div className="space-y-6">
      {/* Morning In-App Welcome Banner */}
      <Card elevated className="p-5 sm:p-6 relative overflow-hidden bg-gradient-to-r from-[#111715] via-[#151D19] to-[#0E1513]">
        <div className="absolute right-0 top-0 w-80 h-full bg-mint-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-2xl shrink-0">
              ☀️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{greeting}</h2>
                <Badge variant="success" className="text-[10px]">Active Budget</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Your budget for today is{' '}
                <span className="font-bold text-mint-400 tabular-nums">
                  {formatCurrency(summary.base_daily_allowance, curr)}
                </span>
                . You've got{' '}
                <span className="font-bold text-slate-100 tabular-nums">
                  {formatCurrency(summary.monthly_remaining_budget, curr)}
                </span>{' '}
                available across the month to reach your{' '}
                <span className="font-bold text-teal-400 tabular-nums">
                  {formatCurrency(summary.savings_target, curr)}
                </span>{' '}
                savings target.
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            <Button size="sm" onClick={openAddModal} className="gap-1.5 shadow-md shadow-mint-400/15">
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Grid: Daily Allowance Hero & Monthly Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Spending Allowance Hero Card */}
        <Card
          elevated
          className={`lg:col-span-2 p-6 sm:p-7 relative overflow-hidden ${
            isOverspent
              ? 'border-rose-500/40 bg-gradient-to-b from-[#191516] to-[#131112]'
              : 'border-mint-400/30 bg-gradient-to-b from-[#151D19] to-[#0D1411]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Today's Spending Allowance
              </span>
              <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-md bg-black/30">
                Day {summary.days_elapsed} of {summary.days_in_period}
              </span>
            </div>

            {isOverspent ? (
              <Badge variant="danger" className="gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Overspent by {formatCurrency(summary.today_overspent_amount, curr)}</span>
              </Badge>
            ) : (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>On Track</span>
              </Badge>
            )}
          </div>

          {/* Large Numbers */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
            <div>
              <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white tabular-nums">
                {formatCurrency(summary.base_daily_allowance, curr)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Base allowance for a {summary.days_in_period}-day period
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-400">Remaining Today</p>
              <p
                className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
                  isOverspent ? 'text-rose-400' : 'text-mint-400'
                }`}
              >
                {formatCurrency(summary.today_remaining_allowance, curr)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-3 w-full bg-[#080B0A] rounded-full p-0.5 border border-[#223029] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverspent ? 'bg-rose-500' : 'bg-mint-400'
                }`}
                style={{ width: `${usagePercentageClamped}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-medium tabular-nums">
              <span>Spent Today: {formatCurrency(summary.today_spending, curr)} ({summary.today_usage_percentage.toFixed(0)}%)</span>
              <span>Remaining: {formatCurrency(summary.today_remaining_allowance, curr)}</span>
            </div>
          </div>

          {/* Adaptive Daily Allowance & Insight */}
          <div className="mt-6 pt-5 border-t border-[#1E2923] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#080B0A] border border-[#1E2923] flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-medium">Recommended Allowance</p>
                <p className="text-[10px] text-slate-400">Adjusts for remaining days</p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-slate-100 tabular-nums">
                  {formatCurrency(summary.adaptive_daily_allowance, curr)}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {summary.days_remaining_including_today} days left
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#080B0A] border border-[#1E2923] flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-medium">Month-End Estimate</p>
                <p className="text-[10px] text-slate-400">Based on {summary.days_elapsed} days spending</p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-slate-100 tabular-nums">
                  {formatCurrency(summary.projected_month_end_spending, curr)}
                </span>
                <span className="block text-[10px] text-amber-400 font-medium">Projected</span>
              </div>
            </div>
          </div>

          {/* Rule-based spending insight pill */}
          <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-mint-400 shrink-0" />
            <span>{insightText}</span>
          </div>
        </Card>

        {/* Monthly Overview Card */}
        <Card elevated className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2923]">
              <h3 className="text-sm font-bold text-slate-100">Monthly Budget</h3>
              <span className="text-xs text-slate-400">
                {new Date(summary.period_start).toLocaleDateString('en-US', { month: 'short' })}
              </span>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Monthly Income:</span>
                <span className="font-semibold text-slate-200 tabular-nums">
                  {formatCurrency(summary.monthly_income, curr)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Savings Target:</span>
                <span className="font-semibold text-teal-400 tabular-nums">
                  {formatCurrency(summary.savings_target, curr)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-[#1E2923]">
                <span>Spendable Budget:</span>
                <span className="font-bold text-white tabular-nums">
                  {formatCurrency(summary.monthly_spendable_budget, curr)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Total Spent:</span>
                <span className="font-semibold text-slate-200 tabular-nums">
                  {formatCurrency(summary.monthly_spending, curr)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-[#1E2923]">
                <span>Remaining Budget:</span>
                <span
                  className={`font-bold text-base tabular-nums ${
                    summary.is_monthly_overspent ? 'text-rose-400' : 'text-mint-400'
                  }`}
                >
                  {formatCurrency(summary.monthly_remaining_budget, curr)}
                </span>
              </div>
            </div>

            {/* Monthly Progress */}
            <div className="mt-6 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Budget Utilized</span>
                <span className="font-semibold text-slate-200 tabular-nums">
                  {summary.monthly_usage_percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full bg-[#080B0A] rounded-full overflow-hidden border border-[#223029]">
                <div
                  className={`h-full rounded-full ${
                    summary.is_monthly_overspent ? 'bg-rose-500' : 'bg-mint-400'
                  }`}
                  style={{ width: `${Math.min(100, summary.monthly_usage_percentage)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-[#1E2923]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/budget')}
              className="w-full justify-between"
            >
              <span>Manage Budget Plan</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={openAddModal}
          className="p-4 rounded-2xl bg-[#111715] hover:bg-[#151D19] border border-[#1E2923] hover:border-mint-400/40 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-mint-400/10 text-mint-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-slate-200">Add Expense</h4>
          <p className="text-[10px] text-slate-400">Log new spending</p>
        </button>

        <button
          onClick={() => navigate('/transactions')}
          className="p-4 rounded-2xl bg-[#111715] hover:bg-[#151D19] border border-[#1E2923] hover:border-mint-400/40 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-400/10 text-teal-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-slate-200">Transactions</h4>
          <p className="text-[10px] text-slate-400">History & filters</p>
        </button>

        <button
          onClick={() => navigate('/analytics')}
          className="p-4 rounded-2xl bg-[#111715] hover:bg-[#151D19] border border-[#1E2923] hover:border-mint-400/40 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <PieChart className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-slate-200">Analytics</h4>
          <p className="text-[10px] text-slate-400">Trends & calendar</p>
        </button>

        <button
          onClick={() => navigate('/budget')}
          className="p-4 rounded-2xl bg-[#111715] hover:bg-[#151D19] border border-[#1E2923] hover:border-mint-400/40 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Sliders className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-semibold text-slate-200">Edit Budget</h4>
          <p className="text-[10px] text-slate-400">Savings & income</p>
        </button>
      </div>

      {/* Today's Expenses Section */}
      <Card elevated className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E2923]">
          <div>
            <h3 className="text-base font-bold text-slate-100">Today's Expenses</h3>
            <p className="text-xs text-slate-400">
              Total spent today: <span className="text-slate-200 font-semibold">{formatCurrency(summary.today_spending, curr)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate('/transactions')}>
              View All History
            </Button>
            <Button size="sm" onClick={openAddModal} className="gap-1">
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </Button>
          </div>
        </div>

        {todayTransactions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-800/40 mx-auto flex items-center justify-center text-slate-500 mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300">No expenses recorded today</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't spent any of your {formatCurrency(summary.base_daily_allowance, curr)} daily allowance yet.
            </p>
            <Button size="sm" onClick={openAddModal} className="mt-4 gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#1E2923] mt-2">
            {todayTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3.5 flex items-center justify-between hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: `${tx.category?.color || '#35E6A0'}20` }}
                  >
                    <CategoryIcon
                      name={tx.category?.icon || 'CircleDollarSign'}
                      style={{ color: tx.category?.color || '#35E6A0' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {tx.description || tx.category?.name || 'Expense'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{tx.category?.name}</span>
                      {tx.merchant && <span>• {tx.merchant}</span>}
                      {tx.transaction_time && <span>• {tx.transaction_time.slice(0, 5)}</span>}
                      <span>• {tx.payment_method}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-100 tabular-nums">
                    -{formatCurrency(tx.amount, tx.currency)}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={() => handleEditClick(tx)}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        transaction={editingTx}
        onTransactionUpdated={() => loadDashboardData()}
      />
    </div>
  );
};
