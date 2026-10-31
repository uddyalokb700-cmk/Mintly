import datetime
from decimal import Decimal
import pytz
from django.utils import timezone
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from apps.users.models import User
from apps.budgets.models import Budget
from apps.notifications.models import Notification, NotificationPreference

class QStashNotificationTestCase(APITestCase):
    def setUp(self):
        self.user_india = User.objects.create_user(
            email='rajesh@mintly.app',
            name='Rajesh Kumar',
            password='TestPassword2026!',
            timezone='Asia/Kolkata'
        )
        self.budget_india = Budget.objects.create(
            user=self.user_india,
            period_start=datetime.date(2026, 4, 1),
            period_end=datetime.date(2026, 4, 30),
            monthly_income=Decimal('45000.00'),
            savings_target=Decimal('9000.00'),
            currency='INR',
            status=Budget.STATUS_ACTIVE
        )
        self.pref_india, _ = NotificationPreference.objects.get_or_create(user=self.user_india)
        self.pref_india.morning_reminder_enabled = True
        self.pref_india.reminder_time = '08:00'
        self.pref_india.timezone = 'Asia/Kolkata'
        self.pref_india.save()

    def test_01_qstash_get_status_probe(self):
        """GET request to QStash endpoint returns active status and guidance"""
        response = self.client.get('/api/v1/notifications/qstash/process/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'active')

    def test_02_qstash_unauthorized_rejection_in_production(self):
        """Unauthenticated requests without valid QStash signature or token are rejected with 401"""
        with override_settings(
            DEBUG=False,
            QSTASH_CURRENT_SIGNING_KEY='test_sig_key',
            QSTASH_TOKEN='test_secret_token'
        ):
            response = self.client.post('/api/v1/notifications/qstash/process/')
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_03_qstash_authorized_with_shared_token_and_idempotency(self):
        """Requests with valid QSTASH_TOKEN execute and guarantee idempotency across multiple runs"""
        secret_token = 'mintly_qstash_secure_token_xyz'
        with override_settings(
            DEBUG=False,
            QSTASH_TOKEN=secret_token
        ):
            headers = {'HTTP_AUTHORIZATION': f'Bearer {secret_token}'}

            # 1. Test API endpoint authentication with bearer token
            response = self.client.post('/api/v1/notifications/qstash/process/', **headers)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['status'], 'success')
            self.assertIn('stats', response.data)

            # 2. Test deterministic idempotency with fixed mock timestamp
            # Fixed time: 2026-04-15 03:00 UTC = 08:30 IST
            mock_now_utc = datetime.datetime(2026, 4, 15, 3, 0, 0, tzinfo=datetime.timezone.utc)
            from apps.notifications.services import process_scheduled_morning_notifications

            # Run 1: Sends greeting
            stats1 = process_scheduled_morning_notifications(now_utc=mock_now_utc)
            self.assertEqual(stats1['sent'], 1)
            notif = Notification.objects.filter(user=self.user_india, deduplication_key='morning_greeting_' + str(self.user_india.id) + '_2026-04-15').first()
            self.assertIsNotNone(notif)
            self.assertIn("Good morning, Rajesh!", notif.title)

            # Run 2: Same timestamp/day -> Idempotent skip!
            stats2 = process_scheduled_morning_notifications(now_utc=mock_now_utc)
            self.assertEqual(stats2['sent'], 0)
            self.assertEqual(stats2['already_sent'], 1)

    def test_04_timezone_and_reminder_time_respect(self):
        """Users whose localized reminder time has not arrived yet are skipped"""
        user_ny = User.objects.create_user(
            email='john@mintly.app',
            name='John Doe',
            password='TestPassword2026!',
            timezone='America/New_York'
        )
        Budget.objects.create(
            user=user_ny,
            period_start=datetime.date(2026, 4, 1),
            period_end=datetime.date(2026, 4, 30),
            monthly_income=Decimal('5000.00'),
            savings_target=Decimal('1000.00'),
            currency='USD',
            status=Budget.STATUS_ACTIVE
        )
        pref_ny, _ = NotificationPreference.objects.get_or_create(user=user_ny)
        pref_ny.morning_reminder_enabled = True
        pref_ny.reminder_time = '08:00'
        pref_ny.timezone = 'America/New_York'
        pref_ny.save()

        # Simulate 03:00 UTC (8:30 AM in India, but 11:00 PM previous day in New York)
        mock_now_utc = datetime.datetime(2026, 4, 15, 3, 0, 0, tzinfo=datetime.timezone.utc)
        from apps.notifications.services import process_scheduled_morning_notifications
        stats = process_scheduled_morning_notifications(now_utc=mock_now_utc)

        # John in NY should be skipped (not time yet)
        self.assertEqual(Notification.objects.filter(user=user_ny).count(), 0)
        self.assertGreaterEqual(stats['not_time_yet'], 1)

    def test_05_disabled_morning_preference_ignored(self):
        """Users with morning_reminder_enabled=False are ignored"""
        self.pref_india.morning_reminder_enabled = False
        self.pref_india.save()

        mock_now_utc = datetime.datetime(2026, 4, 15, 3, 0, 0, tzinfo=datetime.timezone.utc)
        from apps.notifications.services import process_scheduled_morning_notifications
        stats = process_scheduled_morning_notifications(now_utc=mock_now_utc)

        self.assertEqual(stats['sent'], 0)
        self.assertEqual(Notification.objects.filter(user=self.user_india).count(), 0)
