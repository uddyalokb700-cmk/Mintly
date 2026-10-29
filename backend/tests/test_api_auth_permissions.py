import datetime
from decimal import Decimal
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from apps.users.models import User
from apps.budgets.models import Budget
from apps.transactions.models import Transaction
from apps.notifications.models import Notification, NotificationPreference, PushSubscription
from apps.notifications.services import check_and_trigger_spending_alerts, send_web_push

class ApiAuthAndPermissionsTestCase(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            email='alice@mintly.app',
            name='Alice Smith',
            password='AlicePassword123!'
        )
        self.token_a = Token.objects.create(user=self.user_a)

        self.user_b = User.objects.create_user(
            email='bob@mintly.app',
            name='Bob Jones',
            password='BobPassword123!'
        )
        self.token_b = Token.objects.create(user=self.user_b)

        # Alice's budget
        self.budget_a = Budget.objects.create(
            user=self.user_a,
            period_start=datetime.date(2026, 4, 1),
            period_end=datetime.date(2026, 4, 30),
            monthly_income=Decimal('30000.00'),
            savings_target=Decimal('6000.00'),
            currency='INR',
            status=Budget.STATUS_ACTIVE
        )

        # Alice's transaction
        self.tx_a = Transaction.objects.create(
            user=self.user_a,
            budget=self.budget_a,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('450.00'),
            transaction_date=datetime.date(2026, 4, 10),
            description="Alice private expense"
        )

    def test_14_authentication_and_unauthorized_access(self):
        """Unauthenticated requests are rejected with 401 Unauthorized"""
        response = self.client.get('/api/v1/budgets/current/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response_tx = self.client.get('/api/v1/transactions/')
        self.assertEqual(response_tx.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_15_prevention_of_cross_user_data_access(self):
        """User B cannot view, edit, or delete User A's transaction or budget"""
        # User B authenticates
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_b.key}')

        # User B tries to view User A's transaction detail
        res_view = self.client.get(f'/api/v1/transactions/{self.tx_a.id}/')
        self.assertEqual(res_view.status_code, status.HTTP_404_NOT_FOUND)

        # User B tries to edit User A's transaction
        res_patch = self.client.patch(
            f'/api/v1/transactions/{self.tx_a.id}/',
            {'amount': '9999.00'},
            format='json'
        )
        self.assertEqual(res_patch.status_code, status.HTTP_404_NOT_FOUND)

        # User B tries to delete User A's transaction
        res_delete = self.client.delete(f'/api/v1/transactions/{self.tx_a.id}/')
        self.assertEqual(res_delete.status_code, status.HTTP_404_NOT_FOUND)

        # Transaction remains unchanged in DB
        self.tx_a.refresh_from_db()
        self.assertEqual(self.tx_a.amount, Decimal('450.00'))

    def test_16_notification_preference_enforcement(self):
        """Does not send overspending alerts when user has disabled them"""
        pref, _ = NotificationPreference.objects.get_or_create(user=self.user_a)
        pref.overspending_alerts_enabled = False
        pref.save()

        # Create massive overspending transaction
        tx = Transaction.objects.create(
            user=self.user_a,
            budget=self.budget_a,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('5000.00'),
            transaction_date=datetime.date(2026, 4, 15)
        )
        check_and_trigger_spending_alerts(self.user_a, tx)

        # Assert no notification created
        notifs = Notification.objects.filter(user=self.user_a)
        self.assertEqual(notifs.count(), 0)

    def test_17_duplicate_notification_prevention(self):
        """Prevents duplicate overspending notifications for the same user, date, and event"""
        pref, _ = NotificationPreference.objects.get_or_create(user=self.user_a)
        pref.overspending_alerts_enabled = True
        pref.save()

        # First overspending transaction
        tx1 = Transaction.objects.create(
            user=self.user_a,
            budget=self.budget_a,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('900.00'),
            transaction_date=datetime.date(2026, 4, 15)
        )
        check_and_trigger_spending_alerts(self.user_a, tx1)
        self.assertEqual(Notification.objects.filter(user=self.user_a).count(), 1)

        # Second transaction on the same day adding to the overspend
        tx2 = Transaction.objects.create(
            user=self.user_a,
            budget=self.budget_a,
            transaction_type=Transaction.EXPENSE,
            amount=Decimal('100.00'),
            transaction_date=datetime.date(2026, 4, 15)
        )
        check_and_trigger_spending_alerts(self.user_a, tx2)
        # Should still be 1 because deduplication key was matched!
        self.assertEqual(Notification.objects.filter(user=self.user_a).count(), 1)

    def test_18_graceful_handling_of_failed_push_delivery(self):
        """Failed web push does not throw unhandled exception or break flow"""
        sub = PushSubscription.objects.create(
            user=self.user_a,
            endpoint='https://invalid-push-endpoint.example.com/sub/12345',
            p256dh='fake_p256dh_key',
            auth='fake_auth_key',
            active=True
        )
        success = send_web_push(sub, {'title': 'Test Push', 'body': 'Hello'})
        # Should return False without throwing uncaught exceptions
        self.assertFalse(success)
