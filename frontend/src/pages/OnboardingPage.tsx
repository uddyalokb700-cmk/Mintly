import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Wallet,
  PiggyBank,
  Calendar,
  Bell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setHasBudget, updateUser } = useAuth();
  const { requestPushPermission, pushStatus } = useNotifications();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [currency, setCurrency] = useState(user?.preferred_currency || 'INR');
  const [income, setIncome] = useState<string>('30000');
  const [incomeFrequency, setIncomeFrequency] = useState('monthly');
  const [incomeDescription, setIncomeDescription] = useState('Primary Salary');

  const [savingsTarget, setSavingsTarget] = useState<string>('6000');

  // Dates
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const [periodStart, setPeriodStart] = useState(firstDay);
  const [periodEnd, setPeriodEnd] = useState(lastDay);

  // Notification prefs
  const [morningReminder, setMorningReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [overspendingAlert, setOverspendingAlert] = useState(true);
  const [timezone, setTimezone] = useState(
    user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculations
  const numericIncome = parseFloat(income) || 0;
  const numericSavings = parseFloat(savingsTarget) || 0;
  const spendableBudget = Math.max(0, numericIncome - numericSavings);

  const startDateObj = new Date(periodStart);
  const endDateObj = new Date(periodEnd);
  const diffTime = endDateObj.getTime() - startDateObj.getTime();
  const daysInPeriod = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const dailyAllowance = daysInPeriod > 0 ? (spendableBudget / daysInPeriod).toFixed(2) : '0.00';

  const setSavingsPercent = (pct: number) => {
    if (numericIncome > 0) {
      setSavingsTarget(Math.round((numericIncome * pct) / 100).toString());
    }
  };

  const validateStep = (): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (numericIncome <= 0) {
        setError('Monthly income must be greater than zero.');
        return false;
      }
    } else if (currentStep === 2) {
      if (numericSavings < 0) {
        setError('Savings target cannot be negative.');
        return false;
      }
      if (numericSavings > numericIncome) {
        setError('Savings target cannot exceed your monthly income.');
        return false;
      }
    } else if (currentStep === 3) {
      if (periodEnd < periodStart) {
        setError('End date cannot be earlier than start date.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Update user currency & timezone if altered
      if (currency !== user?.preferred_currency || timezone !== user?.timezone) {
        await updateUser({ preferred_currency: currency, timezone });
      }

      // 2. Create Budget
      await api.post('/budgets/', {
        monthly_income: numericIncome.toFixed(2),
        savings_target: numericSavings.toFixed(2),
        currency,
        period_start: periodStart,
        period_end: periodEnd,
        income_frequency: incomeFrequency,
        income_description: incomeDescription,
      });

      // 3. Update notification preferences
      await api.patch('/notifications/preferences/', {
        morning_reminder_enabled: morningReminder,
        reminder_time: reminderTime,
        overspending_alerts_enabled: overspendingAlert,
        timezone,
      });

      setHasBudget(true);

      // Celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#35E6A0', '#2DD4BF', '#FBBF24'],
        });
      } catch (e) {}

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to save budget settings');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Income', icon: Wallet },
    { num: 2, title: 'Savings', icon: PiggyBank },
    { num: 3, title: 'Period', icon: Calendar },
    { num: 4, title: 'Alerts', icon: Bell },
    { num: 5, title: 'Review', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#080B0A] flex flex-col justify-center items-center px-4 py-8 selection:bg-mint-400 selection:text-slate-950">
      <div className="w-full max-w-xl rounded-2xl bg-[#111715] border border-[#223029] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between border-b border-[#1E2923] pb-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-mint-400 text-slate-950 font-bold'
                        : isCurrent
                        ? 'bg-mint-400/20 text-mint-400 border border-mint-400 font-bold'
                        : 'bg-[#151D19] text-slate-500 border border-[#223029]'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 font-medium ${
                      isCurrent ? 'text-mint-400' : 'text-slate-500'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 -mt-5 transition-colors ${
                      currentStep > s.num ? 'bg-mint-400' : 'bg-[#1E2923]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Step 1: Monthly Income */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-100">What is your monthly income?</h2>
              <p className="text-xs text-slate-400 mt-1">
                Mintly uses your total income to calculate spendable budget and daily allowances.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Amount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 tabular-nums">
                    {getCurrencySymbol(currency)}
                  </span>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="30000"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-lg font-bold text-slate-100 tabular-nums focus:outline-none focus:border-mint-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs font-semibold text-slate-200 focus:outline-none focus:border-mint-400"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (CA$)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Income Description (Optional)
              </label>
              <input
                type="text"
                value={incomeDescription}
                onChange={(e) => setIncomeDescription(e.target.value)}
                placeholder="e.g. Full-time Salary, Freelance"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
              />
            </div>
          </div>
        )}

        {/* Step 2: Savings Target */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-100">How much do you want to save?</h2>
              <p className="text-xs text-slate-400 mt-1">
                This amount is safeguarded from your daily budget so you can achieve your savings goal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Savings Goal</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 tabular-nums">
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  type="number"
                  value={savingsTarget}
                  onChange={(e) => setSavingsTarget(e.target.value)}
                  placeholder="6000"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-lg font-bold text-slate-100 tabular-nums focus:outline-none focus:border-mint-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Quick Shortcuts (% of Monthly Income)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setSavingsPercent(pct)}
                    className="py-2 px-3 rounded-xl bg-[#080B0A] border border-[#223029] hover:border-mint-400/40 text-xs font-medium text-slate-300 hover:text-white transition-all text-center"
                  >
                    {pct}% ({formatCurrency((numericIncome * pct) / 100, currency, false)})
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#151D19] border border-[#1E2923] text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Monthly Income:</span>
                <span className="font-semibold text-slate-200">{formatCurrency(numericIncome, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Savings Target:</span>
                <span className="font-semibold text-teal-400">-{formatCurrency(numericSavings, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-200 pt-1 border-t border-[#1E2923] font-bold">
                <span>Spendable Monthly Budget:</span>
                <span className="text-mint-400">{formatCurrency(spendableBudget, currency)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Budget Period */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Select Budget Period</h2>
              <p className="text-xs text-slate-400 mt-1">
                Mintly defaults to the full calendar month, but you can customize if your salary cycle differs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#151D19] border border-[#1E2923] flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Calendar Days in Period:</span>
              <span className="font-bold text-mint-400 text-sm tabular-nums">{daysInPeriod} Days</span>
            </div>
          </div>
        )}

        {/* Step 4: Notification Preferences */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Smart Alerts & Morning Greeting</h2>
              <p className="text-xs text-slate-400 mt-1">
                Receive your personalized morning spending allowance and overspending alerts.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#080B0A] border border-[#223029] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Morning Allowance Greeting</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Personalized message with today's spending budget
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={morningReminder}
                  onChange={(e) => setMorningReminder(e.target.checked)}
                  className="h-4 w-4 rounded bg-[#111715] border-[#223029] text-mint-400 focus:ring-mint-400"
                />
              </div>

              {morningReminder && (
                <div className="grid grid-cols-2 gap-3 pl-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Preferred Greeting Time
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Timezone</label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#080B0A] border border-[#223029] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Overspending Warnings</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Immediate notification when an expense exceeds daily limit
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={overspendingAlert}
                  onChange={(e) => setOverspendingAlert(e.target.checked)}
                  className="h-4 w-4 rounded bg-[#111715] border-[#223029] text-mint-400 focus:ring-mint-400"
                />
              </div>

              {/* Push Permission Button */}
              <div className="p-3.5 rounded-xl bg-mint-400/5 border border-mint-400/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-mint-400">Browser Push Notifications</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {pushStatus === 'granted'
                      ? 'Push notifications enabled on this browser!'
                      : 'Enable Web Push for lock screen & scheduled greetings'}
                  </p>
                </div>
                {pushStatus !== 'granted' && (
                  <Button type="button" size="sm" onClick={requestPushPermission}>
                    Enable
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review & Confirmation */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Review Your Daily Budget</h2>
              <p className="text-xs text-slate-400 mt-1">
                Here is the verified financial calculation calculated for your budget period.
              </p>
            </div>

            {/* Hero allowance result */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#151D19] to-[#0A120E] border border-mint-400/30 text-center space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-mint-400">
                Calculated Daily Spending Allowance
              </span>
              <p className="text-4xl sm:text-5xl font-extrabold text-white tabular-nums tracking-tight">
                {formatCurrency(dailyAllowance, currency)}
              </p>
              <p className="text-xs text-slate-400">
                Spend up to this amount each day to comfortably reach your{' '}
                <span className="text-teal-400 font-semibold">{formatCurrency(numericSavings, currency)}</span>{' '}
                savings target.
              </p>
            </div>

            {/* Breakdown table */}
            <div className="p-4 rounded-xl bg-[#080B0A] border border-[#1E2923] text-xs space-y-2.5">
              <div className="flex justify-between text-slate-400">
                <span>Monthly Income:</span>
                <span className="font-semibold text-slate-200 tabular-nums">
                  {formatCurrency(numericIncome, currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Monthly Savings Target:</span>
                <span className="font-semibold text-teal-400 tabular-nums">
                  {formatCurrency(numericSavings, currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-[#1E2923]">
                <span>Spendable Monthly Budget:</span>
                <span className="font-semibold text-slate-100 tabular-nums">
                  {formatCurrency(spendableBudget, currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Calendar Days in Period:</span>
                <span className="font-semibold text-slate-200 tabular-nums">{daysInPeriod} days</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-[#1E2923]">
                <span>Morning Reminder:</span>
                <span className="font-semibold text-slate-200">
                  {morningReminder ? `${reminderTime} (${timezone.split('/')[1] || timezone})` : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1E2923]">
          {currentStep > 1 ? (
            <Button type="button" variant="ghost" onClick={handleBack} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <Button type="button" onClick={handleNext} className="gap-1.5">
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinish}
              isLoading={isLoading}
              className="gap-2 px-6 shadow-lg shadow-mint-400/20"
            >
              <span>Start Using Mintly</span>
              <Sparkles className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
