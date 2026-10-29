import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onTransactionUpdated: (tx: Transaction, summary: any) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onTransactionUpdated,
}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });

  const selectedCategoryId = watch('category_id');
  const txType = watch('transaction_type') || 'expense';

  useEffect(() => {
    if (transaction && isOpen) {
      reset({
        amount: transaction.amount,
        category_id: transaction.category ? transaction.category.id : '',
        transaction_type: transaction.transaction_type,
        description: transaction.description || '',
        merchant: transaction.merchant || '',
        payment_method: transaction.payment_method,
        transaction_date: transaction.transaction_date,
        transaction_time: transaction.transaction_time ? transaction.transaction_time.slice(0, 5) : '',
      });
      api.get<Category[]>('/categories/').then(setCategories).catch(console.error);
    }
  }, [transaction, isOpen, reset]);

  const onSubmit = async (data: TransactionFormData) => {
    if (!transaction) return;
    setIsSubmitting(true);
    setApiError(null);
    try {
      const res = await api.patch<{ transaction: Transaction; summary: any; message: string }>(
        `/transactions/${transaction.id}/`,
        data
      );
      onClose();
      onTransactionUpdated(res.transaction, res.summary);
    } catch (err: any) {
      setApiError(err.message || 'Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

  const filteredCategories = categories.filter((c) => c.category_type === txType);
  const currencySymbol = getCurrencySymbol(user?.preferred_currency || 'INR');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction" description="Modify recorded details">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {apiError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {apiError}
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400 tabular-nums">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="any"
              {...register('amount')}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#080B0A] border border-[#223029] focus:border-mint-400 text-2xl font-bold text-slate-100 tabular-nums focus:outline-none transition-colors"
            />
          </div>
          {errors.amount && <p className="text-xs text-rose-400 mt-1">{errors.amount.message}</p>}
        </div>

        {/* Categories */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setValue('category_id', cat.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center ${
                    isSelected
                      ? 'bg-mint-400/10 border-mint-400 text-mint-400'
                      : 'bg-[#080B0A] border-[#1E2923] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CategoryIcon name={cat.icon} className="w-5 h-5 mb-1" />
                  <span className="text-[11px] font-medium truncate w-full">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
            <input
              type="date"
              {...register('transaction_date')}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Time</label>
            <input
              type="time"
              {...register('transaction_time')}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Description & Merchant */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <input
              type="text"
              {...register('description')}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Merchant</label>
            <input
              type="text"
              {...register('merchant')}
              className="w-full px-3 py-2 rounded-xl bg-[#080B0A] border border-[#223029] text-xs text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E2923]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
