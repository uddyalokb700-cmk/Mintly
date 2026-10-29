import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  SGD: 'S$',
  AED: 'AED ',
};

export function getCurrencySymbol(currencyCode: string = 'INR'): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || `${currencyCode} `;
}

export function formatCurrency(
  amount: number | string | DecimalValue,
  currencyCode: string = 'INR',
  includeDecimals: boolean = true
): string {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  const symbol = getCurrencySymbol(currencyCode);

  const isNegative = numericAmount < 0;
  const absAmount = Math.abs(numericAmount);

  const formattedNumber = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  return `${isNegative ? '-' : ''}${symbol}${formattedNumber}`;
}

type DecimalValue = { toString(): string };

export function formatRelativeDate(dateStr: string): string {
  const today = new Date();
  const date = new Date(dateStr + 'T00:00:00');
  
  // Format normalized to local YYYY-MM-DD
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export function getGreeting(name?: string): { greeting: string; iconEmoji: string } {
  const hour = new Date().getHours();
  const firstName = name ? name.split(' ')[0] : 'there';

  if (hour >= 5 && hour < 12) {
    return { greeting: `Good morning, ${firstName}!`, iconEmoji: '☀️' };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: `Good afternoon, ${firstName}!`, iconEmoji: '🌤️' };
  } else if (hour >= 17 && hour < 22) {
    return { greeting: `Good evening, ${firstName}!`, iconEmoji: '🌆' };
  } else {
    return { greeting: `Good night, ${firstName}!`, iconEmoji: '🌙' };
  }
}
