import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Plus,
  Receipt,
  Trash2,
  Edit2,
  Calendar,
  ArrowUpDown,
  Tag,
  X,
  CreditCard,
} from 'lucide-react';
import { api } from '../api/client';
import { Transaction, Category } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { EditTransactionModal } from '../features/transactions/EditTransactionModal';
import { formatCurrency, formatRelativeDate } from '../utils/formatters';

export const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const { openAddModal } = useOutletContext<{ openAddModal: () => void }>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ordering, setOrdering] = useState('-transaction_date');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load categories
  useEffect(() => {
    api.get<Category[]>('/categories/').then(setCategories).catch(console.error);
  }, []);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        ordering,
      };
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedType !== 'all') params.type = selectedType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.get<{ count: number; results: Transaction[] }>('/transactions/', params);
      setTransactions(res.results || []);
      setTotalCount(res.count || 0);
      setTotalPages(Math.ceil((res.count || 0) / 20) || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, ordering, search, selectedCategory, selectedType, startDate, endDate]);

  useEffect(() => {
    loadTransactions();

    const handleUpdate = () => {
      loadTransactions();
    };
    window.addEventListener('mintly_transaction_updated', handleUpdate);
    return () => window.removeEventListener('mintly_transaction_updated', handleUpdate);
  }, [loadTransactions]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}/`);
      loadTransactions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete transaction');
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('mintly_token');
    let url = '/api/v1/transactions/export-csv/';
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    // Download with auth header
    fetch(url, {
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `mintly_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(console.error);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedType('all');
    setStartDate('');
    setEndDate('');
    setOrdering('-transaction_date');
    setPage(1);
  };

  // Group transactions by date
  const groupedTransactions: Record<string, { items: Transaction[]; dailyTotal: number }> = {};
  transactions.forEach((tx) => {
    const d = tx.transaction_date;
    if (!groupedTransactions[d]) {
      groupedTransactions[d] = { items: [], dailyTotal: 0 };
    }
    groupedTransactions[d].items.push(tx);
    if (tx.transaction_type === 'expense') {
      groupedTransactions[d].dailyTotal += parseFloat(tx.amount);
    }
  });

  const curr = user?.preferred_currency || 'INR';
  const hasActiveFilters = Boolean(search || selectedCategory || selectedType !== 'all' || startDate || endDate);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Transaction History</h2>
          <p className="text-xs text-slate-400">
            {totalCount} transaction{totalCount !== 1 ? 's' : ''} recorded
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" onClick={openAddModal} className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card elevated className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search description, merchant, category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-mint-400 transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.category_type})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Ordering */}
          <div>
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
            >
              <option value="-transaction_date">Newest First</option>
              <option value="transaction_date">Oldest First</option>
              <option value="-amount">Highest Amount</option>
              <option value="amount">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Date Range & Clear filter shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1E2923] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#080B0A] border border-[#223029] text-slate-300 text-xs focus:outline-none"
            />
            <span className="text-slate-600">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#080B0A] border border-[#223029] text-slate-300 text-xs focus:outline-none"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-mint-400 hover:text-mint-300 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Transactions Grouped List */}
      <Card elevated className="p-6">
        {isLoading ? (
          <div className="space-y-4 py-8 animate-pulse">
            <div className="h-6 w-32 bg-[#151D19] rounded" />
            <div className="h-12 bg-[#151D19] rounded-xl" />
            <div className="h-12 bg-[#151D19] rounded-xl" />
          </div>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-800/40 mx-auto flex items-center justify-center text-slate-500 mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300">No transactions found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search criteria or date filters.'
                : 'Start tracking by recording your first expense or income.'}
            </p>
            {hasActiveFilters ? (
              <Button size="sm" variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            ) : (
              <Button size="sm" onClick={openAddModal} className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Record Transaction</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([dateStr, group]) => (
              <div key={dateStr} className="space-y-2">
                {/* Date Header with Daily Expense Total */}
                <div className="flex items-center justify-between pb-2 border-b border-[#1E2923]">
                  <span className="text-xs font-bold text-slate-300">
                    {formatRelativeDate(dateStr)} ({new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})
                  </span>
                  <span className="text-xs text-slate-400 font-medium tabular-nums">
                    Daily Total: <span className="text-slate-200 font-semibold">{formatCurrency(group.dailyTotal, curr)}</span>
                  </span>
                </div>

                {/* Date Items */}
                <div className="divide-y divide-[#1E2923]">
                  {group.items.map((tx) => {
                    const isIncome = tx.transaction_type === 'income';
                    return (
                      <div
                        key={tx.id}
                        className="py-3 flex items-center justify-between hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                            style={{
                              backgroundColor: isIncome ? '#38BDF820' : `${tx.category?.color || '#35E6A0'}20`,
                            }}
                          >
                            <CategoryIcon
                              name={tx.category?.icon || (isIncome ? 'PlusCircle' : 'CircleDollarSign')}
                              style={{
                                color: isIncome ? '#38BDF8' : tx.category?.color || '#35E6A0',
                              }}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">
                              {tx.description || tx.category?.name || (isIncome ? 'Income' : 'Expense')}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>{tx.category?.name || 'Uncategorized'}</span>
                              {tx.merchant && <span>• {tx.merchant}</span>}
                              {tx.transaction_time && <span>• {tx.transaction_time.slice(0, 5)}</span>}
                              <span>• {tx.payment_method}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              isIncome ? 'text-teal-400' : 'text-slate-100'
                            }`}
                          >
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                          </span>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingTx(tx);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-200 rounded"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 rounded"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-[#1E2923] text-xs">
            <span className="text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        transaction={editingTx}
        onTransactionUpdated={() => loadTransactions()}
      />
    </div>
  );
};
