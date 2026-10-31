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

    def test_19_cross_user_custom_category_idor_prevention(self):
        """User B cannot create or update a transaction with User A's custom category"""
        from apps.categories.models import Category
        # User A creates a private custom category
        cat_a = Category.objects.create(
            user=self.user_a,
            name='Alice Secret Hobby',
            category_type=Category.EXPENSE
        )

        # User B authenticates
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_b.key}')

        # User B attempts to create a transaction referencing Alice's custom category
        response = self.client.post('/api/v1/transactions/', {
            'amount': '250.00',
            'category_id': str(cat_a.id),
            'transaction_type': 'expense',
            'description': 'Malicious cross-user category link'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('category_id', response.data)

    def test_20_hashed_password_reset_token_security(self):
        """Password reset tokens are never leaked in production (DEBUG=False) and are hashed in DB"""
        import hashlib
        from django.test import override_settings
        from apps.users.models import PasswordResetToken

        # 1. Verify in production mode (DEBUG=False): token is NOT leaked in response
        with override_settings(DEBUG=False):
            prod_response = self.client.post('/api/v1/auth/password-reset/', {
                'email': self.user_a.email
            }, format='json')
            self.assertEqual(prod_response.status_code, status.HTTP_200_OK)
            self.assertNotIn('reset_token', prod_response.data)

        # 2. Verify in debug mode: raw token is returned, but DB stores SHA-256 hash
        with override_settings(DEBUG=True):
            dev_response = self.client.post('/api/v1/auth/password-reset/', {
                'email': self.user_a.email
            }, format='json')
            self.assertEqual(dev_response.status_code, status.HTTP_200_OK)
            raw_token = dev_response.data.get('reset_token')
            self.assertIsNotNone(raw_token)

            # Verify that the DB record contains the SHA-256 hash, not the plaintext token
            token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
            pr_record = PasswordResetToken.objects.filter(token=token_hash).first()
            self.assertIsNotNone(pr_record)
            self.assertEqual(pr_record.token, token_hash)
            self.assertNotEqual(pr_record.token, raw_token)

            # Confirm reset with raw token
            confirm_resp = self.client.post('/api/v1/auth/password-reset/confirm/', {
                'token': raw_token,
                'new_password': 'AliceBrandNewPassword2026!',
                'confirm_password': 'AliceBrandNewPassword2026!',
            }, format='json')
            self.assertEqual(confirm_resp.status_code, status.HTTP_200_OK)

            # Verify user can log in with new password
            login_resp = self.client.post('/api/v1/auth/login/', {
                'email': self.user_a.email,
                'password': 'AliceBrandNewPassword2026!'
            }, format='json')
            self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

    def test_21_database_health_check_endpoint(self):
        """Health check endpoint validates database connectivity and returns 200"""
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')
        self.assertEqual(response.data['database'], 'ok')
