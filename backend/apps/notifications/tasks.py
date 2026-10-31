from celery import shared_task
from apps.notifications.services import process_scheduled_morning_notifications

@shared_task
def send_scheduled_morning_notifications():
    """
    Periodic Celery task (for environments running Celery Beat).
    Finds users whose configured local reminder_time has arrived for their local calendar day.
    Deduplication prevents sending more than once per user per calendar day.
    """
    stats = process_scheduled_morning_notifications()
    return f"Processed scheduled morning notifications: {stats['sent']} sent, {stats['already_sent']} already sent."
