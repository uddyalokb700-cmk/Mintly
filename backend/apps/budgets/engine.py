from decimal import Decimal, ROUND_HALF_UP
import datetime
from django.core.exceptions import ValidationError
from django.db.models import Sum

TWOPLACES = Decimal('0.01')

def round_money(val: Decimal) -> Decimal:
    return val.quantize(TWOPLACES, rounding=ROUND_HALF_UP)

class BudgetEngine:
    @staticmethod
    def validate_budget_inputs(monthly_income: Decimal, savings_target: Decimal):
        if monthly_income is None or monthly_income <= Decimal('0.00'):
            raise ValidationError({'monthly_income': 'Monthly income must be greater than zero.'})
        if savings_target is None or savings_target < Decimal('0.00'):
            raise ValidationError({'savings_target': 'Savings target cannot be negative.'})
        if savings_target > monthly_income:
            raise ValidationError({'savings_target': 'Savings target cannot exceed monthly income.'})

    @staticmethod
    def calculate_spendable_budget(monthly_income: Decimal, savings_target: Decimal) -> Decimal:
        BudgetEngine.validate_budget_inputs(monthly_income, savings_target)
        return round_money(monthly_income - savings_target)

    @staticmethod
    def calculate_days_in_period(period_start: datetime.date, period_end: datetime.date) -> int:
        if period_end < period_start:
            raise ValidationError({'period_end': 'Period end date must be on or after period start date.'})
        return (period_end - period_start).days + 1

    @staticmethod
    def calculate_base_daily_allowance(spendable_budget: Decimal, days_in_period: int) -> Decimal:
        if days_in_period <= 0:
            raise ValidationError('Days in period must be at least 1.')
        return round_money(spendable_budget / Decimal(days_in_period))

    @staticmethod
    def reconcile_paise(spendable_budget: Decimal, days_in_period: int) -> dict:
        """
        Reconcile paise so the sum of daily allowances across all days
        deterministically matches the monthly spendable budget without losing paise.
        """
        base_allowance = BudgetEngine.calculate_base_daily_allowance(spendable_budget, days_in_period)
        total_allocated = round_money(base_allowance * Decimal(days_in_period))
        residual_paise = round_money(spendable_budget - total_allocated)
        return {
            'base_allowance': base_allowance,
            'total_allocated': total_allocated,
            'residual_paise': residual_paise,
            'reconciled_sum': round_money(total_allocated + residual_paise),
        }

    @staticmethod
    def calculate_summary(budget, user_today: datetime.date = None, expenses_qs = None) -> dict:
        if user_today is None:
            user_today = datetime.date.today()

        period_start = budget.period_start
        period_end = budget.period_end
        days_in_period = BudgetEngine.calculate_days_in_period(period_start, period_end)
        monthly_income = round_money(Decimal(str(budget.monthly_income)))
        savings_target = round_money(Decimal(str(budget.savings_target)))
        spendable_budget = BudgetEngine.calculate_spendable_budget(monthly_income, savings_target)
        base_daily_allowance = BudgetEngine.calculate_base_daily_allowance(spendable_budget, days_in_period)
        paise_info = BudgetEngine.reconcile_paise(spendable_budget, days_in_period)

        if expenses_qs is None:
            from apps.transactions.models import Transaction
            expenses_qs = Transaction.objects.filter(
                user=budget.user,
                transaction_type=Transaction.EXPENSE,
                transaction_date__gte=period_start,
                transaction_date__lte=period_end
            )

        # Monthly total spending
        monthly_spending_aggregate = expenses_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        monthly_spending = round_money(Decimal(str(monthly_spending_aggregate)))

        # Today's total spending
        today_spending_aggregate = expenses_qs.filter(transaction_date=user_today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        today_spending = round_money(Decimal(str(today_spending_aggregate)))

        # Today's remaining allowance (can be negative!)
        today_remaining_allowance = round_money(base_daily_allowance - today_spending)
        is_today_overspent = today_remaining_allowance < Decimal('0.00')
        today_overspent_amount = round_money(max(Decimal('0.00'), today_spending - base_daily_allowance))

        today_usage_pct = Decimal('0.00')
        if base_daily_allowance > Decimal('0.00'):
            today_usage_pct = round_money((today_spending / base_daily_allowance) * Decimal('100.00'))

        # Monthly remaining budget (can be negative!)
        monthly_remaining_budget = round_money(spendable_budget - monthly_spending)
        is_monthly_overspent = monthly_remaining_budget < Decimal('0.00')
        monthly_overspent_amount = round_money(max(Decimal('0.00'), monthly_spending - spendable_budget))

        monthly_usage_pct = Decimal('0.00')
        if spendable_budget > Decimal('0.00'):
            monthly_usage_pct = round_money((monthly_spending / spendable_budget) * Decimal('100.00'))

        # Days calculations
        if user_today < period_start:
            days_elapsed = 0
            days_remaining_including_today = days_in_period
        elif user_today > period_end:
            days_elapsed = days_in_period
            days_remaining_including_today = 0
        else:
            days_elapsed = (user_today - period_start).days + 1
            days_remaining_including_today = (period_end - user_today).days + 1

        # Adaptive / Recommended daily allowance
        if monthly_remaining_budget <= Decimal('0.00'):
            adaptive_daily_allowance = Decimal('0.00')
        else:
            if days_remaining_including_today > 0:
                adaptive_daily_allowance = round_money(monthly_remaining_budget / Decimal(days_remaining_including_today))
            else:
                adaptive_daily_allowance = Decimal('0.00')

        # Average daily spending
        if days_elapsed > 0:
            avg_daily_spending = round_money(monthly_spending / Decimal(days_elapsed))
            projected_month_end_spending = round_money(avg_daily_spending * Decimal(days_in_period))
        else:
            avg_daily_spending = Decimal('0.00')
            projected_month_end_spending = Decimal('0.00')

        return {
            'budget_id': str(budget.id),
            'currency': budget.currency,
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat(),
            'days_in_period': days_in_period,
            'days_elapsed': days_elapsed,
            'days_remaining_including_today': days_remaining_including_today,
            'monthly_income': str(monthly_income),
            'savings_target': str(savings_target),
            'monthly_spendable_budget': str(spendable_budget),
            'base_daily_allowance': str(base_daily_allowance),
            'today_spending': str(today_spending),
            'today_remaining_allowance': str(today_remaining_allowance),
            'is_today_overspent': is_today_overspent,
            'today_overspent_amount': str(today_overspent_amount),
            'today_usage_percentage': float(today_usage_pct),
            'monthly_spending': str(monthly_spending),
            'monthly_remaining_budget': str(monthly_remaining_budget),
            'is_monthly_overspent': is_monthly_overspent,
            'monthly_overspent_amount': str(monthly_overspent_amount),
            'monthly_usage_percentage': float(monthly_usage_pct),
            'adaptive_daily_allowance': str(adaptive_daily_allowance),
            'average_daily_spending': str(avg_daily_spending),
            'projected_month_end_spending': str(projected_month_end_spending),
            'projected_is_estimate': True,
            'reconciliation': {
                'base_allowance': str(paise_info['base_allowance']),
                'total_allocated': str(paise_info['total_allocated']),
                'residual_paise': str(paise_info['residual_paise']),
                'reconciled_sum': str(paise_info['reconciled_sum']),
            }
        }
