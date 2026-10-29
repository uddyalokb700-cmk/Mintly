import datetime
import pytz
from celery import shared_task
from django.utils import timezone
from apps.users.models import User
from apps.notifications.models import NotificationPreference
from apps.notifications.services import send_morning_greeting_notification

@shared_task
def send_scheduled_morning_notifications():
    """
    Periodic task (e.g. running every 15 or 30 minutes via Celery beat).
    Finds users whose configured local reminder_time matches current local time.
    """
    now_utc = timezone.now()
    preferences = NotificationPreference.objects.filter(morning_reminder_enabled=True)

    count = 0
    for pref in preferences:
        try:
            tz = pytz.timezone(pref.timezone or 'Asia/Kolkata')
            local_time = now_utc.astimezone(tz)
            user_today = local_time.date()

            # Parse reminder time (HH:MM)
            r_hour, r_minute = [int(p) for p in pref.reminder_time.split(':')]
            if local_time.hour == r_hour:
                notif = send_morning_greeting_notification(pref.user, for_date=user_today)
                if notif:
                    count += 1
        except Exception as e:
            continue

    return f"Sent {count} morning notifications."
