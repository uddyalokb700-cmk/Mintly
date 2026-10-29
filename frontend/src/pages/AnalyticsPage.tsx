import React, { useState, useEffect } from 'react';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  PieChart,
  Calendar as CalendarIcon,
  TrendingUp,
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { formatCurrency } from '../utils/formatters';

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const curr = user?.preferred_currency || 'INR';

  const [activeTab, setActiveTab] = useState<'trends' | 'categories' | 'calendar'>('trends');

  // Overview data
  const [overview, setOverview] = useState<any>(null);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [baseDailyAllowance, setBaseDailyAllowance] = useState<number>(800);

  // Calendar state
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth() + 1);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get<any>('/analytics/overview/'),
      api.get<any>('/analytics/categories/'),
      api.get<any>('/analytics/trends/'),
      api.get<any>('/analytics/calendar/', { year: calYear, month: calMonth }),
    ])
      .then(([ovRes, catRes, trRes, calRes]) => {
        setOverview(ovRes);
        setCategoriesData(catRes.categories || []);
        setTrendsData(trRes.trends || []);
        setBaseDailyAllowance(parseFloat(trRes.base_daily_allowance || '800'));
        setCalendarDays(calRes.days || []);
        // default select today if present
        const todayDay = calRes.days?.find((d: any) => d.is_today);
        setSelectedDay(todayDay || calRes.days?.[0] || null);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [calYear, calMonth]);

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalYear((y) => y - 1);
      setCalMonth(12);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalYear((y) => y + 1);
      setCalMonth(1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const monthName = new Date(calYear, calMonth - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const summary = overview?.budget_summary;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl bg-[#080B0A] border border-[#223029] p-3 text-xs shadow-xl space-y-1">
          <p className="font-bold text-slate-100">{data.date}</p>
          <p className="text-slate-300">
            Spent: <span className="font-semibold text-mint-400">{formatCurrency(data.spending, curr)}</span>
          </p>
          <p className="text-slate-400">
            Allowance: <span className="tabular-nums">{formatCurrency(data.allowance, curr)}</span>
          </p>
          {data.is_overspent && (
            <Badge variant="danger" className="text-[10px] mt-1">
              Overspent by {formatCurrency(data.spending - data.allowance, curr)}
            </Badge>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Analytics & Financial Insights</h2>
          <p className="text-xs text-slate-400">
            Visual trends, category breakdowns, and monthly spending performance
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 rounded-xl bg-[#111715] border border-[#1E2923] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'trends' ? 'bg-[#151D19] text-mint-400 shadow-sm border border-mint-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily Trends
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'categories' ? 'bg-[#151D19] text-mint-400 shadow-sm border border-mint-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'calendar' ? 'bg-[#151D19] text-mint-400 shadow-sm border border-mint-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <Card elevated className="p-4 space-y-1">
            <span className="text-slate-400">Spendable Budget</span>
            <p className="text-lg font-bold text-white tabular-nums">
              {formatCurrency(summary.monthly_spendable_budget, curr)}
            </p>
            <span className="text-[10px] text-slate-500">
              Income - Savings Target
            </span>
          </Card>

          <Card elevated className="p-4 space-y-1">
            <span className="text-slate-400">Monthly Spending</span>
            <p className="text-lg font-bold text-slate-100 tabular-nums">
              {formatCurrency(summary.monthly_spending, curr)}
            </p>
            <span className="text-[10px] text-mint-400 font-medium">
              {summary.monthly_usage_percentage.toFixed(1)}% of budget used
            </span>
          </Card>

          <Card elevated className="p-4 space-y-1">
            <span className="text-slate-400">Daily Average Spent</span>
            <p className="text-lg font-bold text-slate-100 tabular-nums">
              {formatCurrency(summary.average_daily_spending, curr)}
            </p>
            <span className="text-[10px] text-slate-500">
              Across {summary.days_elapsed} days elapsed
            </span>
          </Card>

          <Card elevated className="p-4 space-y-1">
            <span className="text-slate-400">Projected Month-End</span>
            <p className="text-lg font-bold text-amber-400 tabular-nums">
              {formatCurrency(summary.projected_month_end_spending, curr)}
            </p>
            <span className="text-[10px] text-slate-500">
              Estimated projection
            </span>
          </Card>
        </div>
      )}

      {/* Tab 1: Daily Trends */}
      {activeTab === 'trends' && (
        <Card elevated className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1E2923]">
            <div>
              <h3 className="text-base font-bold text-slate-100">Daily Spending vs Allowance</h3>
              <p className="text-xs text-slate-400">
                Track how much you spend each day compared to your{' '}
                <span className="font-semibold text-mint-400">{formatCurrency(baseDailyAllowance, curr)}</span> allowance limit.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded-sm bg-mint-400 inline-block" /> Within Budget
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Over Daily Limit
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="day"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `D${val}`}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={baseDailyAllowance}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{
                    value: `Daily Limit (${formatCurrency(baseDailyAllowance, curr, false)})`,
                    fill: '#F59E0B',
                    fontSize: 10,
                    position: 'top',
                  }}
                />
                <Bar dataKey="spending" radius={[4, 4, 0, 0]}>
                  {trendsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.is_overspent ? '#F43F5E' : entry.spending > 0 ? '#35E6A0' : '#1E2923'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Tab 2: Category Breakdown */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Donut Chart */}
          <Card elevated className="p-6 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-slate-100 self-start mb-4">Expense Distribution</h3>
            {categoriesData.length === 0 ? (
              <p className="text-xs text-slate-500 py-20">No expense records found</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={categoriesData}
                      dataKey="amount"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {categoriesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#35E6A0'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value, curr)}
                      contentStyle={{
                        backgroundColor: '#080B0A',
                        borderColor: '#223029',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Category Table */}
          <Card elevated className="lg:col-span-2 p-6">
            <h3 className="text-sm font-bold text-slate-100 mb-4 pb-3 border-b border-[#1E2923]">
              Spending by Category
            </h3>
            {categoriesData.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">No categories to display</p>
            ) : (
              <div className="divide-y divide-[#1E2923]">
                {categoriesData.map((cat) => (
                  <div key={cat.category_id || cat.category_name} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <CategoryIcon name={cat.icon} style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">{cat.category_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {cat.count} transaction{cat.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-slate-100 tabular-nums">
                        {formatCurrency(cat.amount, curr)}
                      </p>
                      <p className="text-[11px] text-slate-400 tabular-nums">
                        {cat.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Monthly Calendar View */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <Card elevated className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2923]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-mint-400" />
                <h3 className="text-base font-bold text-slate-100">{monthName}</h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-500 my-3">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Padding empty slots for month start */}
              {calendarDays.length > 0 &&
                Array.from({ length: calendarDays[0].weekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 rounded-xl bg-transparent" />
                ))}

              {calendarDays.map((d) => {
                const spentNum = parseFloat(d.spending);
                const isSelected = selectedDay?.date === d.date;
                return (
                  <button
                    key={d.date}
                    onClick={() => setSelectedDay(d)}
                    className={`h-16 p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative ${
                      isSelected
                        ? 'border-mint-400 bg-mint-400/10 shadow-sm'
                        : d.is_overspent
                        ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60'
                        : spentNum > 0
                        ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
                        : 'border-[#1E2923] bg-[#080B0A] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold ${
                          d.is_today ? 'text-mint-400 underline decoration-2' : 'text-slate-300'
                        }`}
                      >
                        {d.day}
                      </span>
                      {d.is_overspent && (
                        <span className="w-2 h-2 rounded-full bg-rose-500" title="Over budget" />
                      )}
                      {!d.is_overspent && spentNum > 0 && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="Within budget" />
                      )}
                    </div>

                    <div className="w-full text-right">
                      {spentNum > 0 ? (
                        <span
                          className={`text-[11px] font-bold tabular-nums block truncate ${
                            d.is_overspent ? 'text-rose-400' : 'text-slate-200'
                          }`}
                        >
                          {formatCurrency(d.spending, curr, false)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Selected Day Details */}
          <Card elevated className="p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 pb-3 border-b border-[#1E2923]">
                {selectedDay ? `Day Breakdown • ${selectedDay.date}` : 'Day Breakdown'}
              </h3>

              {selectedDay ? (
                <div className="mt-4 space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#080B0A] border border-[#223029] space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Daily Allowance:</span>
                      <span className="font-semibold text-slate-200 tabular-nums">
                        {formatCurrency(selectedDay.daily_allowance, curr)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span>Total Spent:</span>
                      <span className="font-bold text-white tabular-nums">
                        {formatCurrency(selectedDay.spending, curr)}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400 pt-2 border-t border-[#1E2923]">
                      <span>Remaining Allowance:</span>
                      <span
                        className={`font-bold tabular-nums ${
                          selectedDay.is_overspent ? 'text-rose-400' : 'text-mint-400'
                        }`}
                      >
                        {formatCurrency(selectedDay.remaining, curr)}
                      </span>
                    </div>
                  </div>

                  {selectedDay.is_overspent ? (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Exceeded daily budget limit on this day.</span>
                    </div>
                  ) : parseFloat(selectedDay.spending) > 0 ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Comfortably within daily budget allowance!</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>No expenses recorded on this day.</span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500">
                    {selectedDay.tx_count} transaction{selectedDay.tx_count !== 1 ? 's' : ''} logged.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-12 text-center">Click a calendar day to inspect</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
