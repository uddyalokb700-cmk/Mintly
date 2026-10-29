import calendar
import datetime
from decimal import Decimal
from django.db.models import Sum, Count
from rest_framework import views, permissions, status
from rest_framework.response import Response
from apps.budgets.models import Budget
from apps.budgets.engine import BudgetEngine, round_money
from apps.budgets.views import get_user_today
from apps.transactions.models import Transaction

class AnalyticsOverviewView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        budget = Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).first()
        if not budget:
            return Response({'has_budget': False, 'message': 'No active budget.'})

        user_today = get_user_today(request.user)
        summary = BudgetEngine.calculate_summary(budget, user_today=user_today)

        # Additional income recorded in period
        income_aggregate = Transaction.objects.filter(
            user=request.user,
            transaction_type=Transaction.INCOME,
            transaction_date__gte=budget.period_start,
            transaction_date__lte=budget.period_end
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        return Response({
            'has_budget': True,
            'budget_summary': summary,
            'additional_income_recorded': str(round_money(Decimal(str(income_aggregate)))),
            'savings_target': str(budget.savings_target),
            'currency': budget.currency,
        })

class AnalyticsCategoriesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        budget = Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).first()
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            if budget:
                start_date = budget.period_start
                end_date = budget.period_end
            else:
                user_today = get_user_today(request.user)
                start_date = user_today.replace(day=1)
                _, last_day_num = calendar.monthrange(user_today.year, user_today.month)
                end_date = user_today.replace(day=last_day_num)

        qs = Transaction.objects.filter(
            user=request.user,
            transaction_type=Transaction.EXPENSE,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date
        )

        total_expense = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_expense = round_money(Decimal(str(total_expense)))

        breakdown = qs.values(
            'category__id',
            'category__name',
            'category__icon',
            'category__color'
        ).annotate(
            total_amount=Sum('amount'),
            tx_count=Count('id')
        ).order_by('-total_amount')

        results = []
        for item in breakdown:
            cat_amount = round_money(Decimal(str(item['total_amount'])))
            pct = Decimal('0.00')
            if total_expense > Decimal('0.00'):
                pct = round_money((cat_amount / total_expense) * Decimal('100.00'))
            results.append({
                'category_id': item['category__id'],
                'category_name': item['category__name'] or 'Uncategorized',
                'icon': item['category__icon'] or 'CircleDollarSign',
                'color': item['category__color'] or '#35E6A0',
                'amount': str(cat_amount),
                'percentage': float(pct),
                'count': item['tx_count']
            })

        return Response({
            'total_spending': str(total_expense),
            'start_date': str(start_date),
            'end_date': str(end_date),
            'categories': results
        })

class AnalyticsTrendsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        budget = Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).first()
        if not budget:
            return Response({'has_budget': False, 'trends': []})

        start_date = budget.period_start
        end_date = budget.period_end
        user_today = get_user_today(request.user)

        # Base daily allowance
        days = BudgetEngine.calculate_days_in_period(start_date, end_date)
        spendable = BudgetEngine.calculate_spendable_budget(budget.monthly_income, budget.savings_target)
        base_allowance = BudgetEngine.calculate_base_daily_allowance(spendable, days)

        expenses_by_day = {
            item['transaction_date']: round_money(Decimal(str(item['total'])))
            for item in Transaction.objects.filter(
                user=request.user,
                transaction_type=Transaction.EXPENSE,
                transaction_date__gte=start_date,
                transaction_date__lte=end_date
            ).values('transaction_date').annotate(total=Sum('amount'))
        }

        trends = []
        cur_date = start_date
        while cur_date <= end_date:
            spending = expenses_by_day.get(cur_date, Decimal('0.00'))
            is_overspent = spending > base_allowance
            trends.append({
                'date': cur_date.isoformat(),
                'day': cur_date.day,
                'day_name': cur_date.strftime('%a'),
                'spending': float(spending),
                'allowance': float(base_allowance),
                'is_overspent': is_overspent,
                'is_future': cur_date > user_today,
                'is_today': cur_date == user_today,
            })
            cur_date += datetime.timedelta(days=1)

        return Response({
            'has_budget': True,
            'base_daily_allowance': str(base_allowance),
            'currency': budget.currency,
            'trends': trends
        })

class AnalyticsCalendarView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', datetime.date.today().year))
        month = int(request.query_params.get('month', datetime.date.today().month))

        _, num_days = calendar.monthrange(year, month)
        first_date = datetime.date(year, month, 1)
        last_date = datetime.date(year, month, num_days)

        budget = Budget.objects.filter(
            user=request.user,
            period_start__lte=last_date,
            period_end__gte=first_date,
            status=Budget.STATUS_ACTIVE
        ).first()

        if budget:
            days_in_b = BudgetEngine.calculate_days_in_period(budget.period_start, budget.period_end)
            spendable = BudgetEngine.calculate_spendable_budget(budget.monthly_income, budget.savings_target)
            daily_allowance = BudgetEngine.calculate_base_daily_allowance(spendable, days_in_b)
            currency = budget.currency
        else:
            daily_allowance = Decimal('0.00')
            currency = getattr(request.user, 'preferred_currency', 'INR')

        user_today = get_user_today(request.user)

        # Aggregate daily expenses and counts
        day_stats = {
            item['transaction_date']: (round_money(Decimal(str(item['total']))), item['count'])
            for item in Transaction.objects.filter(
                user=request.user,
                transaction_type=Transaction.EXPENSE,
                transaction_date__gte=first_date,
                transaction_date__lte=last_date
            ).values('transaction_date').annotate(total=Sum('amount'), count=Count('id'))
        }

        calendar_days = []
        for day in range(1, num_days + 1):
            d = datetime.date(year, month, day)
            spending, count = day_stats.get(d, (Decimal('0.00'), 0))
            remaining = round_money(daily_allowance - spending)
            is_overspent = remaining < Decimal('0.00')

            calendar_days.append({
                'date': d.isoformat(),
                'day': day,
                'weekday': d.weekday(), # 0 = Monday
                'spending': str(spending),
                'daily_allowance': str(daily_allowance),
                'remaining': str(remaining),
                'is_overspent': is_overspent,
                'tx_count': count,
                'is_today': d == user_today,
                'is_future': d > user_today,
            })

        return Response({
            'year': year,
            'month': month,
            'currency': currency,
            'daily_allowance': str(daily_allowance),
            'days': calendar_days
        })
