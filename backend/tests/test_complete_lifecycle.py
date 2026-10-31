import datetime
import calendar
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from apps.users.models import User
from apps.budgets.models import Budget
from apps.budgets.views import get_user_today
from apps.transactions.models import Transaction
from apps.notifications.models import Notification
from apps.notifications.services import send_morning_greeting_notification

class MintlyCompleteLifecycleTestCase(APITestCase):
    """
    Executes the complete end-to-end user journey specified in Phase 11:
    1. A new user registers.
    2. The user sets monthly income to ₹30,000.
    3. The user sets a savings target of ₹6,000.
    4. Mintly calculates a spendable budget of ₹24,000.
    5. Mintly calculates the daily allowance.
    6. The user records an expense of ₹150.
    7. The dashboard updates the remaining balance.
    8. The user records additional expenses.
    9. Mintly triggers an overspending alert when appropriate.
    10. The next morning's notification reflects the correct budget.
    11. Analytics reflect the transactions.
    12. The user logs out and logs back in.
    13. The saved information remains intact.
    """

    def test_complete_mintly_user_lifecycle(self):
        # 1. New user registers
        reg_payload = {
            'name': 'Sarah Connor',
            'email': 'sarah@mintly.app',
            'password': 'StrongPassword2026!',
            'confirm_password': 'StrongPassword2026!',
            'preferred_currency': 'INR',
            'timezone': 'Asia/Kolkata',
            'terms_accepted': True
        }
        reg_resp = self.client.post('/api/v1/auth/register/', reg_payload, format='json')
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)
        token = reg_resp.data['token']
        self.assertTrue(token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')

        user = User.objects.get(email='sarah@mintly.app')
        user_today = get_user_today(user)
        first_day = user_today.replace(day=1)
        _, days_in_month = calendar.monthrange(user_today.year, user_today.month)
        last_day = user_today.replace(day=days_in_month)
        num_days = Decimal(days_in_month)

        # 2-5. User sets monthly income to ₹30,000 and savings target to ₹6,000
        budget_payload = {
            'period_start': str(first_day),
            'period_end': str(last_day),
            'monthly_income': '30000.00',
            'savings_target': '6000.00',
            'currency': 'INR',
            'income_description': 'Tech Consultant Retainer'
        }
        budget_resp = self.client.post('/api/v1/budgets/', budget_payload, format='json')
        self.assertEqual(budget_resp.status_code, status.HTTP_201_CREATED)
        budget_data = budget_resp.data['budget']

        # 4. Mintly calculates spendable budget: 30,000 - 6,000 = 24,000
        self.assertEqual(Decimal(str(budget_data['spendable_budget'])), Decimal('24000.00'))

        # 5. Mintly calculates daily allowance: 24,000 / num_days
        expected_daily_allowance = (Decimal('24000.00') / num_days).quantize(Decimal('0.01'))
        summary_resp = self.client.get('/api/v1/budgets/summary/')
        self.assertEqual(summary_resp.status_code, status.HTTP_200_OK)
        summary = summary_resp.data
        self.assertEqual(Decimal(str(summary['base_daily_allowance'])), expected_daily_allowance)
        self.assertEqual(Decimal(str(summary['today_remaining_allowance'])), expected_daily_allowance)
        self.assertEqual(Decimal(str(summary['monthly_remaining_budget'])), Decimal('24000.00'))

        # Fetch default 'Food & Dining' category created automatically on register
        food_cat = user.categories.filter(name='Food & Dining').first()
        self.assertIsNotNone(food_cat)

        # 6. User records expense of ₹150
        tx1_payload = {
            'amount': '150.00',
            'category_id': str(food_cat.id),
            'transaction_type': 'expense',
            'description': 'Breakfast & coffee',
            'merchant': 'Blue Tokai',
            'payment_method': 'UPI',
            'transaction_date': str(user_today)
        }
        tx1_resp = self.client.post('/api/v1/transactions/', tx1_payload, format='json')
        self.assertEqual(tx1_resp.status_code, status.HTTP_201_CREATED)

        # 7. Dashboard updates remaining balance
        summary1 = tx1_resp.data['summary']
        expected_today_rem = expected_daily_allowance - Decimal('150.00')
        self.assertEqual(Decimal(str(summary1['today_spending'])), Decimal('150.00'))
        self.assertEqual(Decimal(str(summary1['today_remaining_allowance'])), expected_today_rem)
        self.assertEqual(Decimal(str(summary1['monthly_remaining_budget'])), Decimal('23850.00'))

        # 8. User records additional expense exceeding today's daily allowance
        excess_amount = (expected_daily_allowance + Decimal('100.00')).quantize(Decimal('0.01'))
        tx2_payload = {
            'amount': str(excess_amount),
            'category_id': str(food_cat.id),
            'transaction_type': 'expense',
            'description': 'Team dinner',
            'merchant': 'Barbeque Nation',
            'payment_method': 'Card',
            'transaction_date': str(user_today)
        }
        tx2_resp = self.client.post('/api/v1/transactions/', tx2_payload, format='json')
        self.assertEqual(tx2_resp.status_code, status.HTTP_201_CREATED)

        # 9. Mintly triggers an overspending alert because spending exceeds daily allowance
        alerts = Notification.objects.filter(
            user=user,
            notification_type=Notification.TYPE_OVERSPENDING_WARNING
        )
        self.assertEqual(alerts.count(), 1)
        alert = alerts.first()
        self.assertIn("Daily Budget Exceeded", alert.title)

        # 10. Next morning's notification reflects the correct remaining budget
        next_morning = user_today + datetime.timedelta(days=1)
        morning_notif = send_morning_greeting_notification(user, for_date=next_morning)
        self.assertIsNotNone(morning_notif)
        self.assertIn("Good morning, Sarah!", morning_notif.title)
        expected_remaining_monthly = Decimal('24000.00') - Decimal('150.00') - excess_amount
        self.assertIn(str(expected_remaining_monthly), morning_notif.body)

        # 11. Analytics reflect the transactions
        analytics_resp = self.client.get('/api/v1/analytics/overview/')
        self.assertEqual(analytics_resp.status_code, status.HTTP_200_OK)
        analytics_data = analytics_resp.data
        total_spent = Decimal('150.00') + excess_amount
        budget_summary = analytics_data['budget_summary']
        self.assertEqual(Decimal(str(budget_summary['monthly_spending'])), total_spent)
        self.assertEqual(Decimal(str(analytics_data['savings_target'])), Decimal('6000.00'))

        # Category analytics
        cat_resp = self.client.get('/api/v1/analytics/categories/')
        self.assertEqual(cat_resp.status_code, status.HTTP_200_OK)
        categories = cat_resp.data['categories']
        self.assertEqual(len(categories), 1)
        self.assertEqual(categories[0]['category_name'], 'Food & Dining')
        self.assertEqual(Decimal(str(categories[0]['amount'])), total_spent)

        # 12. User logs out
        logout_resp = self.client.post('/api/v1/auth/logout/')
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)

        # Verify old token is rejected
        unauth_resp = self.client.get('/api/v1/budgets/current/')
        self.assertEqual(unauth_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        # Clear expired Authorization header for clean login request
        self.client.credentials()

        # User logs back in
        login_resp = self.client.post('/api/v1/auth/login/', {
            'email': 'sarah@mintly.app',
            'password': 'StrongPassword2026!'
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        new_token = login_resp.data['token']
        self.assertTrue(new_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {new_token}')

        # 13. Saved information remains completely intact
        current_budget_resp = self.client.get('/api/v1/budgets/current/')
        self.assertEqual(current_budget_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(current_budget_resp.data['budget']['monthly_income'])), Decimal('30000.00'))

        tx_list_resp = self.client.get('/api/v1/transactions/')
        self.assertEqual(tx_list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(tx_list_resp.data['count'], 2)
