import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Tag, Calendar, Clock, CreditCard, Store, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { api } from '../../api/client';
import { Category, Transaction } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrencySymbol } from '../../utils/formatters';

const transactionSchema = z.object({
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than zero'),
  category_id: z.string().min(1, 'Please select a category'),
  transaction_type: z.enum(['expense', 'income']),
  description: z.string().max(255).optional(),
  merchant: z.string().max(255).optional(),
  payment_method: z.enum(['UPI', 'Card', 'Cash', 'Bank Transfer', 'Other']),
  transaction_date: z.string().min(1, 'Date is required'),
  transaction_time: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'expense' | 'income';
  onTransactionAdded?: (tx: Transaction, summary: any) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'expense',
  onTransactionAdded,
}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [txType, setTxType] = useState<'expense' | 'income'>(defaultType);
  const [showNewCatForm, setShowNewCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentTimeStr = new Date().toTimeString().slice(0, 5);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: '',
      category_id: '',
      transaction_type: defaultType,
      description: '',
      merchant: '',
      payment_method: 'UPI',
      transaction_date: todayStr,
      transaction_time: currentTimeStr,
    },
  });

  const selectedCategoryId = watch('category_id');

  useEffect(() => {
    setTxType(defaultType);
    setValue('transaction_type', defaultType);
  }, [defaultType, setValue]);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingCategories(true);
      api
        .get<Category[]>('/categories/')
        .then((data) => {
          setCategories(data);
          const firstCat = data.find((c) => c.category_type === txType);
          if (firstCat) {
            setValue('category_id', firstCat.id);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingCategories(false));
    }
  }, [isOpen, txType, setValue]);

  const handleTypeChange = (type: 'expense' | 'income') => {
    setTxType(type);
    setValue('transaction_type', type);
    const match = categories.find((c) => c.category_type === type);
    if (match) setValue('category_id', match.id);
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const created = await api.post<Category>('/categories/', {
        name: newCatName.trim(),
        icon: newCatIcon,
        color: txType === 'expense' ? '#35E6A0' : '#38BDF8',
        category_type: txType,
      });
      setCategories((prev) => [...prev, created]);
      setValue('category_id', created.id);
      setNewCatName('');
      setShowNewCatForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const res = await api.post<{ transaction: Transaction; summary: any; message: string }>(
        '/transactions/',
        {
          ...data,
          currency: user?.preferred_currency || 'INR',
        }
      );
      reset();
      onClose();
      if (onTransactionAdded) {
        onTransactionAdded(res.transaction, res.summary);
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.category_type === txType);
  const currencySymbol = getCurrencySymbol(user?.preferred_currency || 'INR');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={txType === 'expense' ? 'Record Expense' : 'Record Income'}
      description="Keep your spending allowance and savings up to date."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {apiError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {apiError}
          </div>
        )}

        {/* Transaction Type Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#080B0A] border border-[#1E2923]">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              txType === 'expense'
                ? 'bg-[#151D19] text-rose-400 shadow-sm border border-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              txType === 'income'
                ? 'bg-[#151D19] text-mint-400 shadow-sm border border-mint-400/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Income
          </button>
        </div>

        {/* Large Amount Input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400 tabular-nums">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="any"
              autoFocus
              placeholder="0.00"
              {...register('amount')}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#080B0A] border border-[#223029] focus:border-mint-400 text-2xl font-bold text-slate-100 tabular-nums focus:outline-none transition-colors"
            />
          </div>
          {errors.amount && (
            <p className="text-xs text-rose-400 mt-1">{errors.amount.message}</p>
          )}
        </div>

        {/* Category Picker */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-400">Category</label>
            <button
              type="button"
              onClick={() => setShowNewCatForm(!showNewCatForm)}
              className="text-xs text-mint-400 hover:text-mint-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Custom Category
            </button>
          </div>

          {showNewCatForm && (
            <div className="p-3 mb-3 rounded-xl bg-[#080B0A] border border-mint-400/30 flex gap-2">
              <input
                type="text"
                placeholder="Category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#111715] border border-[#223029] text-xs text-slate-200 focus:outline-none"
              />
              <Button type="button" size="sm" onClick={handleCreateCategory}>
                Add
              </Button>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setValue('category_id', cat.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center ${
                    isSelected
                      ? 'bg-mint-400/10 border-mint-400 text-mint-400'
                      : 'bg-[#080B0A] border-[#1E2923] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <CategoryIcon name={cat.icon} className="w-5 h-5 mb-1" />
                  <span className="text-[11px] font-medium truncate w-full">{cat.name}</span>
                </button>
              );
            })}
          </div>
          {errors.category_id && (
            <p className="text-xs text-rose-400 mt-1">{errors.category_id.message}</p>
          )}
        </div>

        {/* Date and Time Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
            <div className="relative">
              <input
                type="date"
                {...register('transaction_date')}
                className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Time</label>
            <input
              type="time"
              {...register('transaction_time')}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
            />
          </div>
        </div>

        {/* Description & Merchant */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Subway lunch"
              {...register('description')}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Merchant / Payee (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Subway, Uber"
              {...register('merchant')}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none focus:border-mint-400"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
          <div className="grid grid-cols-5 gap-2">
            {(['UPI', 'Card', 'Cash', 'Bank Transfer', 'Other'] as const).map((method) => (
              <label
                key={method}
                className={`flex items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-medium cursor-pointer transition-all text-center ${
                  watch('payment_method') === method
                    ? 'bg-mint-400/10 border-mint-400 text-mint-400'
                    : 'bg-[#080B0A] border-[#1E2923] text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  value={method}
                  {...register('payment_method')}
                  className="sr-only"
                />
                {method}
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E2923]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className={txType === 'expense' ? 'bg-mint-400 hover:bg-mint-500' : 'bg-teal-400 hover:bg-teal-500'}
          >
            {txType === 'expense' ? 'Save Expense' : 'Save Income'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
