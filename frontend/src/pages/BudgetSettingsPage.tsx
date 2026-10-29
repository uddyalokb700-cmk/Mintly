import React, { useState, useEffect } from 'react';
import { Sliders, History, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Save, Plus } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Budget, BudgetSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';

export const BudgetSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [history, setHistory] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [income, setIncome] = useState<string>('');
  const [savingsTarget, setSavingsTarget] = useState<string>('');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [incomeDescription, setIncomeDescription] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBudget = () => {
    setIsLoading(true);
    Promise.all([
      api.get<{ has_budget: boolean; budget?: Budget; summary?: BudgetSummary }>('/budgets/current/'),
      api.get<Budget[]>('/budgets/history/'),
    ])
      .then(([curRes, histRes]) => {
        if (curRes.has_budget && curRes.budget && curRes.summary) {
          setBudget(curRes.budget);
          setSummary(curRes.summary);
          setIncome(curRes.budget.monthly_income);
          setSavingsTarget(curRes.budget.savings_target);
          setPeriodStart(curRes.budget.period_start);
          setPeriodEnd(curRes.budget.period_end);
          setIncomeDescription(curRes.budget.income_description || '');
        }
        setHistory(histRes || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadBudget();
  }, []);

  const numIncome = parseFloat(income) || 0;
  const numSavings = parseFloat(savingsTarget) || 0;
  const newSpendable = Math.max(0, numIncome - numSavings);

  const startDateObj = periodStart ? new Date(periodStart) : new Date();
  const endDateObj = periodEnd ? new Date(periodEnd) : new Date();
  const diffTime = endDateObj.getTime() - startDateObj.getTime();
  const daysInPeriod = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const newDailyAllowance = daysInPeriod > 0 ? (newSpendable / daysInPeriod).toFixed(2) : '0.00';

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (numIncome <= 0) {
      setError('Monthly income must be greater than zero.');
      return;
    }
    if (numSavings < 0) {
      setError('Savings target cannot be negative.');
      return;
    }
    if (numSavings > numIncome) {
      setError('Savings target cannot exceed monthly income.');
      return;
    }
    if (periodEnd < periodStart) {
      setError('Period end date cannot be earlier than start date.');
      return;
    }

    setIsSaving(true);
    try {
      if (budget) {
        const res = await api.patch<{ budget: Budget; summary: BudgetSummary; message: string }>(
          `/budgets/${budget.id}/`,
          {
            monthly_income: numIncome.toFixed(2),
            savings_target: numSavings.toFixed(2),
            period_start: periodStart,
            period_end: periodEnd,
            income_description: incomeDescription,
          }
        );
        setBudget(res.budget);
        setSummary(res.summary);
        setMessage('Budget plan updated successfully.');
      } else {
        const res = await api.post<{ budget: Budget; summary: BudgetSummary; message: string }>(
          '/budgets/',
          {
            monthly_income: numIncome.toFixed(2),
            savings_target: numSavings.toFixed(2),
            period_start: periodStart,
            period_end: periodEnd,
            income_description: incomeDescription,
            currency: user?.preferred_currency || 'INR',
          }
        );
        setBudget(res.budget);
        setSummary(res.summary);
        setMessage('New budget configured successfully.');
      }
      loadBudget();
    } catch (err: any) {
      setError(err.message || 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartNewPeriod = async () => {
    if (!window.confirm('Start a new budget period? Current budget will be archived.')) return;
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    setIsSaving(true);
    try {
      await api.post('/budgets/', {
        monthly_income: numIncome.toFixed(2),
        savings_target: numSavings.toFixed(2),
        period_start: firstDay,
        period_end: lastDay,
        income_description: incomeDescription,
        currency: user?.preferred_currency || 'INR',
      });
      loadBudget();
      setMessage('New budget period created and activated.');
    } catch (err: any) {
      setError(err.message || 'Failed to create new budget period');
    } finally {
      setIsSaving(false);
    }
  };

  const curr = user?.preferred_currency || 'INR';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Budget Management</h2>
          <p className="text-xs text-slate-400">
            Configure income, savings targets, and review live daily allowances
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={handleStartNewPeriod} className="gap-1.5">
          <Plus className="w-4 h-4 text-mint-400" />
          <span>Start New Budget Period</span>
        </Button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-mint-400/10 border border-mint-400/30 text-mint-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Form */}
        <Card elevated className="lg:col-span-2 p-6">
          <form onSubmit={handleSaveBudget} className="space-y-5">
            <h3 className="text-base font-bold text-slate-100 pb-3 border-b border-[#1E2923]">
              Active Budget Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Monthly Income</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {getCurrencySymbol(curr)}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm font-bold text-slate-100 tabular-nums focus:outline-none focus:border-mint-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Savings Target</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {getCurrencySymbol(curr)}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={savingsTarget}
                    onChange={(e) => setSavingsTarget(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-sm font-bold text-slate-100 tabular-nums focus:outline-none focus:border-mint-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Budget Start Date</label>
                <input
                  type="date"
                  required
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Budget End Date</label>
                <input
                  type="date"
                  required
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Income Description
              </label>
              <input
                type="text"
                placeholder="e.g. Primary Tech Salary"
                value={incomeDescription}
                onChange={(e) => setIncomeDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
              />
            </div>

            <div className="pt-4 border-t border-[#1E2923] flex items-center justify-end">
              <Button type="submit" isLoading={isSaving} className="gap-2 shadow-lg shadow-mint-400/20">
                <Save className="w-4 h-4" />
                <span>Save Budget Changes</span>
              </Button>
            </div>
          </form>
        </Card>

        {/* Live Calculation Preview */}
        <Card elevated className="p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 pb-3 border-b border-[#1E2923]">
              Live Allowance Impact
            </h3>

            <div className="p-4 rounded-xl bg-[#080B0A] border border-mint-400/30 text-center space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Calculated Daily Allowance
              </span>
              <p className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
                {formatCurrency(newDailyAllowance, curr)}
              </p>
              <p className="text-[10px] text-mint-400">
                Across {daysInPeriod} calendar days
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Monthly Income:</span>
                <span className="font-semibold text-slate-200 tabular-nums">
                  {formatCurrency(numIncome, curr)}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Savings Target:</span>
                <span className="font-semibold text-teal-400 tabular-nums">
                  -{formatCurrency(numSavings, curr)}
                </span>
              </div>

              <div className="flex justify-between text-slate-400 pt-2 border-t border-[#1E2923]">
                <span>Spendable Budget:</span>
                <span className="font-bold text-slate-100 tabular-nums">
                  {formatCurrency(newSpendable, curr)}
                </span>
              </div>

              {summary && (
                <>
                  <div className="flex justify-between text-slate-400 pt-2 border-t border-[#1E2923]">
                    <span>Current Adaptive Allowance:</span>
                    <span className="font-semibold text-mint-400 tabular-nums">
                      {formatCurrency(summary.adaptive_daily_allowance, curr)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Month-to-Date Spending:</span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      {formatCurrency(summary.monthly_spending, curr)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Historical Budgets List */}
      <Card elevated className="p-6">
        <h3 className="text-sm font-bold text-slate-100 pb-3 border-b border-[#1E2923]">
          Historical Budget Periods
        </h3>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            No archived budget periods yet. When a new budget cycle starts, previous periods will appear here.
          </p>
        ) : (
          <div className="divide-y divide-[#1E2923] mt-2">
            {history.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-200">
                    {h.period_start} to {h.period_end}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Income: {formatCurrency(h.monthly_income, h.currency)} • Savings Target:{' '}
                    {formatCurrency(h.savings_target, h.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-200 tabular-nums">
                    {formatCurrency(h.base_daily_allowance, h.currency)}/day
                  </span>
                  <span className="block text-[10px] text-slate-500 capitalize">{h.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
