import json
import logging
from decimal import Decimal
from django.conf import settings
from apps.notifications.models import Notification, NotificationPreference, PushSubscription
from apps.budgets.models import Budget
from apps.budgets.engine import BudgetEngine

logger = logging.getLogger(__name__)

def send_web_push(subscription, payload_data: dict) -> bool:
    """
    Send Web Push notification using pywebpush.
    Gracefully handles delivery errors and marks expired subscriptions as inactive.
    """
    try:
        from pywebpush import webpush, WebPushException

        vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', None)
        vapid_claim_email = getattr(settings, 'VAPID_CLAIM_EMAIL', 'mailto:notifications@mintly.app')

        if not vapid_private_key or vapid_private_key == 'default_private_key_pem':
            logger.info("VAPID private key not configured; skipping browser push delivery.")
            return False

        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth,
            }
        }

        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload_data),
            vapid_private_key=vapid_private_key,
            vapid_claims={"sub": vapid_claim_email}
        )
        return True
    except Exception as e:
        logger.warning(f"Failed to send web push: {e}")
        # If response code is 404 or 410 (Subscription expired/gone), deactivate subscription
        if hasattr(e, 'response') and e.response is not None and e.response.status_code in (404, 410):
            subscription.active = False
            subscription.save(update_fields=['active'])
        return False

def broadcast_user_push(user, payload_data: dict):
    active_subs = PushSubscription.objects.filter(user=user, active=True)
    for sub in active_subs:
        send_web_push(sub, payload_data)

def check_and_trigger_spending_alerts(user, transaction):
    """
    Evaluates daily and monthly spending thresholds and creates deduplicated notifications.
    """
    if transaction.transaction_type != 'expense':
        return

    budget = Budget.objects.filter(user=user, status=Budget.STATUS_ACTIVE).first()
    if not budget:
        return

    pref, _ = NotificationPreference.objects.get_or_create(user=user)
    if not pref.overspending_alerts_enabled:
        return

    summary = BudgetEngine.calculate_summary(budget, user_today=transaction.transaction_date)
    curr = budget.currency

    # Check 1: Exceeded Daily Allowance
    if summary['is_today_overspent']:
        dedup_key = f"daily_overspend_{user.id}_{transaction.transaction_date}"
        if not Notification.objects.filter(user=user, deduplication_key=dedup_key).exists():
            title = "Overspending Alert: Daily Budget Exceeded"
            body = (
                f"You've exceeded today's budget by {curr} {summary['today_overspent_amount']}. "
                f"Your recommended daily allowance for remaining days is now {curr} {summary['adaptive_daily_allowance']}."
            )
            notif = Notification.objects.create(
                user=user,
                notification_type=Notification.TYPE_OVERSPENDING_WARNING,
                title=title,
                body=body,
                related_transaction=transaction,
                related_budget=budget,
                deduplication_key=dedup_key
            )
            broadcast_user_push(user, {'title': title, 'body': body, 'type': 'overspend'})
            return

    # Check 2: Approaching Daily Allowance threshold (e.g. 80%)
    threshold_pct = Decimal(str(pref.threshold_percentage))
    usage_pct = Decimal(str(summary['today_usage_percentage']))
    if usage_pct >= threshold_pct and not summary['is_today_overspent']:
        dedup_key = f"daily_threshold_{pref.threshold_percentage}_{user.id}_{transaction.transaction_date}"
        if not Notification.objects.filter(user=user, deduplication_key=dedup_key).exists():
            title = "Daily Budget Alert"
            body = (
                f"You have used {usage_pct:.0f}% of today's allowance "
                f"({curr} {summary['today_spending']} of {curr} {summary['base_daily_allowance']}). "
                f"Remaining today: {curr} {summary['today_remaining_allowance']}."
            )
            notif = Notification.objects.create(
                user=user,
                notification_type=Notification.TYPE_THRESHOLD_ALERT,
                title=title,
                body=body,
                related_transaction=transaction,
                related_budget=budget,
                deduplication_key=dedup_key
            )
            broadcast_user_push(user, {'title': title, 'body': body, 'type': 'threshold'})

    # Check 3: Monthly Budget Exceeded
    if summary['is_monthly_overspent']:
        dedup_key = f"monthly_exceeded_{user.id}_{budget.id}"
        if not Notification.objects.filter(user=user, deduplication_key=dedup_key).exists():
            title = "Monthly Budget Limit Exceeded"
            body = (
                f"Warning: Your total monthly spending ({curr} {summary['monthly_spending']}) "
                f"has exceeded your spendable budget of {curr} {summary['monthly_spendable_budget']}."
            )
            Notification.objects.create(
                user=user,
                notification_type=Notification.TYPE_BUDGET_ALERT,
                title=title,
                body=body,
                related_transaction=transaction,
                related_budget=budget,
                deduplication_key=dedup_key
            )
            broadcast_user_push(user, {'title': title, 'body': body, 'type': 'monthly_exceeded'})

def send_morning_greeting_notification(user, for_date=None):
    """
    Sends personalized morning greeting notification.
    """
    if for_date is None:
        from apps.budgets.views import get_user_today
        for_date = get_user_today(user)

    budget = Budget.objects.filter(user=user, status=Budget.STATUS_ACTIVE).first()
    if not budget:
        return None

    pref, _ = NotificationPreference.objects.get_or_create(user=user)
    if not pref.morning_reminder_enabled:
        return None

    dedup_key = f"morning_greeting_{user.id}_{for_date}"
    if Notification.objects.filter(user=user, deduplication_key=dedup_key).exists():
        return None

    summary = BudgetEngine.calculate_summary(budget, user_today=for_date)
    curr = budget.currency
    first_name = user.name.split()[0] if user.name else "there"

    title = f"Good morning, {first_name}! ☀️"
    if Decimal(summary['today_spending']) > Decimal('0.00'):
        body = (
            f"Your daily allowance is {curr} {summary['base_daily_allowance']}. "
            f"You've already spent {curr} {summary['today_spending']} today with "
            f"{curr} {summary['today_remaining_allowance']} remaining. Have a productive day!"
        )
    else:
        body = (
            f"Your budget for today is {curr} {summary['base_daily_allowance']}. "
            f"You've got {curr} {summary['monthly_remaining_budget']} available across the month. Let's stay on track!"
        )

    notif = Notification.objects.create(
        user=user,
        notification_type=Notification.TYPE_MORNING_GREETING,
        title=title,
        body=body,
        related_budget=budget,
        deduplication_key=dedup_key
    )
    broadcast_user_push(user, {'title': title, 'body': body, 'type': 'morning_greeting'})
    return notif

def process_scheduled_morning_notifications(now_utc=None):
    """
    Evaluates all users with active morning reminders.
    Converts current UTC time to each user's localized time.
    Sends greeting if localized time is >= reminder_time and not already sent for today.
    Guarantees idempotency via deduplication_key.
    Returns detailed metrics dictionary.
    """
    import datetime
    import pytz
    from django.utils import timezone

    if now_utc is None:
        now_utc = timezone.now()

    preferences = NotificationPreference.objects.filter(
        morning_reminder_enabled=True
    ).select_related('user')

    results = {
        'total_evaluated': 0,
        'sent': 0,
        'already_sent': 0,
        'not_time_yet': 0,
        'no_budget': 0,
        'errors': 0,
    }

    for pref in preferences:
        results['total_evaluated'] += 1
        try:
            user = pref.user
            user_tz = pref.timezone or getattr(user, 'timezone', 'Asia/Kolkata') or 'Asia/Kolkata'
            try:
                tz = pytz.timezone(user_tz)
            except Exception:
                tz = pytz.timezone('Asia/Kolkata')

            local_time = now_utc.astimezone(tz)
            user_today = local_time.date()

            # Parse reminder time (HH:MM)
            r_hour, r_minute = [int(p) for p in pref.reminder_time.split(':')]
            reminder_time_obj = datetime.time(r_hour, r_minute)

            # Morning greetings are only sent during the morning window [reminder_time, 12:00 PM)
            if local_time.time() < reminder_time_obj or local_time.time() >= datetime.time(12, 0):
                results['not_time_yet'] += 1
                continue

            dedup_key = f"morning_greeting_{user.id}_{user_today}"
            if Notification.objects.filter(user=user, deduplication_key=dedup_key).exists():
                results['already_sent'] += 1
                continue

            notif = send_morning_greeting_notification(user, for_date=user_today)
            if notif:
                results['sent'] += 1
            else:
                results['no_budget'] += 1
        except Exception as e:
            logger.error(f"Error processing morning notification for user {pref.user_id}: {e}")
            results['errors'] += 1

    return results
