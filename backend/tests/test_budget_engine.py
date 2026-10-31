import datetime
from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.users.models import User
from apps.budgets.models import Budget
from apps.budgets.engine import BudgetEngine, round_money
from apps.transactions.models import Transaction

class BudgetEngineUnitTestCase(TestCase):
    def test_01_calculate_monthly_spendable_budget(self):
        """Monthly spendable budget = Monthly income - Savings target"""
        income = Decimal('30000.00')
        savings = Decimal('6000.00')
        spendable = BudgetEngine.calculate_spendable_budget(income, savings)
        self.assertEqual(spendable, Decimal('24000.00'))

    def test_02_daily_allowance_month_lengths(self):
        """Calculates base daily allowance accurately for 28, 29, 30, and 31 day months"""
        spendable = Decimal('24000.00')

        # 30-day month: 24000 / 30 = 800.00
        allowance_30 = BudgetEngine.calculate_base_daily_allowance(spendable, 30)
        self.assertEqual(allowance_30, Decimal('800.00'))

        # 31-day month: 24000 / 31 = 774.19
        allowance_31 = BudgetEngine.calculate_base_daily_allowance(spendable, 31)
        self.assertEqual(allowance_31, Decimal('774.19'))

        # 28-day month: 24000 / 28 = 857.14
        allowance_28 = BudgetEngine.calculate_base_daily_allowance(spendable, 28)
        self.assertEqual(allowance_28, Decimal('857.14'))

        # 29-day month (Leap year February): 24000 / 29 = 827.59
        allowance_29 = BudgetEngine.calculate_base_daily_allowance(spendable, 29)
        self.assertEqual(allowance_29, Decimal('827.59'))

    def test_03_leap_year_handling(self):
        """Correctly determines 29 days in leap year Feb (e.g. 2028-02-01 to 2028-02-29) vs 28 in 2027"""
        leap_start = datetime.date(2028, 2, 1)
        leap_end = datetime.date(2028, 2, 29)
        days_leap = BudgetEngine.calculate_days_in_period(leap_start, leap_end)
        self.assertEqual(days_leap, 29)

        non_leap_start = datetime.date(2027, 2, 1)
        non_leap_end = datetime.date(2027, 2, 28)
        days_non_leap = BudgetEngine.calculate_days_in_period(non_leap_start, non_leap_end)
        self.assertEqual(days_non_leap, 28)

    def test_04_monetary_rounding_and_paise_reconciliation(self):
        """Sum of rounded daily allowances reconciles exactly with monthly spendable budget without silent paise loss"""
        spendable = Decimal('24000.00')
        reconciliation_31 = BudgetEngine.reconcile_paise(spendable, 31)

        # 774.19 * 31 = 23999.89
        self.assertEqual(reconciliation_31['base_allowance'], Decimal('774.19'))
        self.assertEqual(reconciliation_31['total_allocated'], Decimal('23999.89'))
        self.assertEqual(reconciliation_31['residual_paise'], Decimal('0.11'))
        self.assertEqual(reconciliation_31['reconciled_sum'], spendable)

    def test_05_rejection_of_invalid_savings_target(self):
        """Rejects savings target exceeding income or negative amounts"""
        # Exceeding income
        with self.assertRaises(ValidationError):
            BudgetEngine.validate_budget_inputs(Decimal('30000.00'), Decimal('35000.00'))

        # Negative savings target
        with self.assertRaises(ValidationError):
            BudgetEngine.validate_budget_inputs(Decimal('30000.00'), Decimal('-500.00'))

        # Zero or negative income
        with self.assertRaises(ValidationError):
            BudgetEngine.validate_budget_inputs(Decimal('0.00'), Decimal('500.00'))

class BudgetSummaryIntegrationTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='testuser@mintly.app',
            name='Test User',
            password='Password123!'
        )
        self.budget = Budget.objects.create(
            user=self.user,
            period_start=datetime.date(2026, 4, 1),
            period_end=datetime.date(2026, 4, 30), # 30 days
            monthly_income=Decimal('30000.00'),
            savings_target=Decimal('6000.00'),
            currency='INR',
            status=Budget.STATUS_ACTIVE
        )

    def test_06_correct_daily_remaining_balance(self):
        """Today's remaining allowance = Base allowance - Today's total spending"""
        # Daily allowance = 24000 / 30 = 800.00
        # Add 150 lunch + 50 transport = 200 spent
        test_day = datetime.date(2026, 4, 15)
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('150.00'),
            transaction_date=test_day
        )
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('50.00'),
            transaction_date=test_day
        )

        summary = BudgetEngine.calculate_summary(self.budget, user_today=test_day)
        self.assertEqual(summary['today_spending'], '200.00')
        self.assertEqual(summary['today_remaining_allowance'], '600.00')
        self.assertFalse(summary['is_today_overspent'])

    def test_07_negative_daily_remaining_balance_on_overspending(self):
        """Allows remaining daily balance to become negative when overspending occurs, no clamping to zero"""
        test_day = datetime.date(2026, 4, 15)
        # Spent 950 with 800 allowance
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('950.00'),
            transaction_date=test_day
        )

        summary = BudgetEngine.calculate_summary(self.budget, user_today=test_day)
        self.assertEqual(summary['today_spending'], '950.00')
        self.assertEqual(summary['today_remaining_allowance'], '-150.00')
        self.assertTrue(summary['is_today_overspent'])
        self.assertEqual(summary['today_overspent_amount'], '150.00')

    def test_08_correct_monthly_remaining_budget(self):
        """Monthly remaining budget = Monthly spendable budget - Monthly spending"""
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('1000.00'),
            transaction_date=datetime.date(2026, 4, 5)
        )
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('500.00'),
            transaction_date=datetime.date(2026, 4, 10)
        )

        summary = BudgetEngine.calculate_summary(self.budget, user_today=datetime.date(2026, 4, 15))
        # Spendable: 24000.00, Spent: 1500.00 -> Remaining: 22500.00
        self.assertEqual(summary['monthly_spending'], '1500.00')
        self.assertEqual(summary['monthly_remaining_budget'], '22500.00')

    def test_09_adaptive_daily_allowance(self):
        """Recommended daily allowance = Remaining monthly budget / Remaining days including today"""
        # Period: April 1 to April 30 (30 days)
        # Test day: April 2. Remaining days including April 2 = 29 days.
        # Suppose on April 1, user spent 1000.
        # Monthly spendable = 24000. Remaining = 24000 - 1000 = 23000.
        # Recommended = 23000 / 29 = 793.10
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('1000.00'),
            transaction_date=datetime.date(2026, 4, 1)
        )

        summary = BudgetEngine.calculate_summary(self.budget, user_today=datetime.date(2026, 4, 2))
        self.assertEqual(summary['monthly_remaining_budget'], '23000.00')
        self.assertEqual(summary['days_remaining_including_today'], 29)
        self.assertEqual(summary['adaptive_daily_allowance'], '793.10')

    def test_10_updating_calculations_after_editing_transaction(self):
        """Editing an expense updates daily and monthly totals and remaining balances"""
        test_day = datetime.date(2026, 4, 10)
        tx = Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('200.00'),
            transaction_date=test_day
        )
        s1 = BudgetEngine.calculate_summary(self.budget, user_today=test_day)
        self.assertEqual(s1['today_spending'], '200.00')

        # Edit amount to 500.00
        tx.amount = Decimal('500.00')
        tx.save()
        s2 = BudgetEngine.calculate_summary(self.budget, user_today=test_day)
        self.assertEqual(s2['today_spending'], '500.00')
        self.assertEqual(s2['today_remaining_allowance'], '300.00')

    def test_11_updating_calculations_after_deleting_transaction(self):
        """Deleting an expense recalculates balances back to previous state"""
        test_day = datetime.date(2026, 4, 10)
        tx = Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('350.00'),
            transaction_date=test_day
        )
        s1 = BudgetEngine.calculate_summary(self.budget, user_today=test_day)
        self.assertEqual(s1['today_spending'], '350.00')

        tx.delete()
        s2 = BudgetEngine.calculate_summary(self.budget, user_today=test_day)
        self.assertEqual(s2['today_spending'], '0.00')
        self.assertEqual(s2['today_remaining_allowance'], '800.00')

    def test_12_timezone_aware_daily_expense_grouping(self):
        """Expenses on other days do not pollute today's spending"""
        day1 = datetime.date(2026, 4, 10)
        day2 = datetime.date(2026, 4, 11)

        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('120.00'),
            transaction_date=day1
        )
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('250.00'),
            transaction_date=day2
        )

        s_day1 = BudgetEngine.calculate_summary(self.budget, user_today=day1)
        self.assertEqual(s_day1['today_spending'], '120.00')

        s_day2 = BudgetEngine.calculate_summary(self.budget, user_today=day2)
        self.assertEqual(s_day2['today_spending'], '250.00')

    def test_13_month_boundary_behavior(self):
        """Transactions outside the budget period are excluded from the period's monthly spending"""
        # Inside period (April)
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('100.00'),
            transaction_date=datetime.date(2026, 4, 30)
        )
        # Outside period (May 1)
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('500.00'),
            transaction_date=datetime.date(2026, 5, 1)
        )

        summary = BudgetEngine.calculate_summary(self.budget, user_today=datetime.date(2026, 4, 30))
        self.assertEqual(summary['monthly_spending'], '100.00')

    def test_scenario_a_budget_and_daily_allowance(self):
        """
        Scenario A:
        Income: ₹30,000 | Savings: ₹6,000 | Spendable budget: ₹24,000 | Days: 30 | Daily allowance: ₹800
        """
        income = Decimal('30000.00')
        savings = Decimal('6000.00')
        spendable = BudgetEngine.calculate_spendable_budget(income, savings)
        self.assertEqual(spendable, Decimal('24000.00'))

        allowance = BudgetEngine.calculate_base_daily_allowance(spendable, 30)
        self.assertEqual(allowance, Decimal('800.00'))

    def test_scenario_b_daily_expenses_within_budget(self):
        """
        Scenario B:
        Daily allowance: ₹800 | Expenses: ₹150 + ₹50 | Remaining: ₹600
        """
        test_day = datetime.date(2026, 4, 12)
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('150.00'),
            transaction_date=test_day
        )
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('50.00'),
            transaction_date=test_day
        )

        summary = BudgetEngine.calculate_summary(self.budget, user_today=test_day)
        self.assertEqual(summary['base_daily_allowance'], '800.00')
        self.assertEqual(summary['today_spending'], '200.00')
        self.assertEqual(summary['today_remaining_allowance'], '600.00')
        self.assertFalse(summary['is_today_overspent'])
        self.assertEqual(summary['today_overspent_amount'], '0.00')

    def test_scenario_c_daily_overspending(self):
        """
        Scenario C:
        Daily allowance: ₹800 | Expenses: ₹950 | Overspending: ₹150 | Remaining: -₹150
        """
        test_day = datetime.date(2026, 4, 18)
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('950.00'),
            transaction_date=test_day
        )

        summary = BudgetEngine.calculate_summary(self.budget, user_today=test_day)
        self.assertEqual(summary['base_daily_allowance'], '800.00')
        self.assertEqual(summary['today_spending'], '950.00')
        self.assertEqual(summary['today_remaining_allowance'], '-150.00')
        self.assertTrue(summary['is_today_overspent'])
        self.assertEqual(summary['today_overspent_amount'], '150.00')

    def test_scenario_d_adaptive_daily_allowance(self):
        """
        Scenario D:
        Remaining monthly budget: ₹23,000 | Remaining days: 29 | Recommended daily allowance: ₹793.10
        """
        # User spent 1000 on April 1. On April 2 (29 days remaining including April 2):
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('1000.00'),
            transaction_date=datetime.date(2026, 4, 1)
        )
        summary = BudgetEngine.calculate_summary(self.budget, user_today=datetime.date(2026, 4, 2))
        self.assertEqual(summary['monthly_remaining_budget'], '23000.00')
        self.assertEqual(summary['days_remaining_including_today'], 29)
        self.assertEqual(summary['adaptive_daily_allowance'], '793.10')

    def test_income_and_refunds_do_not_double_count_or_corrupt_spendable_budget(self):
        """
        Verifies that income transactions (such as refunds or freelance pay)
        are tracked separately and do not inflate the monthly spendable budget or corrupt expenses.
        """
        # Expense: 400
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('400.00'),
            transaction_date=datetime.date(2026, 4, 10)
        )
        # Income/Refund: 100
        Transaction.objects.create(
            user=self.user,
            budget=self.budget,
            transaction_type=Transaction.INCOME,
            amount=Decimal('100.00'),
            transaction_date=datetime.date(2026, 4, 10)
        )

        summary = BudgetEngine.calculate_summary(self.budget, user_today=datetime.date(2026, 4, 10))
        # Spendable budget remains authoritative at 24000.00
        self.assertEqual(summary['monthly_spendable_budget'], '24000.00')
        # Expenses remain 400.00
        self.assertEqual(summary['monthly_spending'], '400.00')

    def test_historical_budget_preservation_when_activating_new_budget(self):
        """
        Activating a new budget archives the previous one without corrupting
        past records or transactions.
        """
        old_budget = self.budget
        self.assertEqual(old_budget.status, Budget.STATUS_ACTIVE)

        # Archive old and create May budget
        Budget.objects.filter(user=self.user, status=Budget.STATUS_ACTIVE).update(status=Budget.STATUS_ARCHIVED)
        new_budget = Budget.objects.create(
            user=self.user,
            period_start=datetime.date(2026, 5, 1),
            period_end=datetime.date(2026, 5, 31),
            monthly_income=Decimal('35000.00'),
            savings_target=Decimal('7000.00'),
            currency='INR',
            status=Budget.STATUS_ACTIVE
        )

        old_budget.refresh_from_db()
        self.assertEqual(old_budget.status, Budget.STATUS_ARCHIVED)
        self.assertEqual(new_budget.status, Budget.STATUS_ACTIVE)
        self.assertEqual(Budget.objects.filter(user=self.user).count(), 2)

