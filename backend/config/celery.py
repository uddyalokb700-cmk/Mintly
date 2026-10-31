import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('mintly')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Periodic scheduler: runs morning notifications evaluation every 15 minutes
app.conf.beat_schedule = {
    'send-scheduled-morning-notifications-every-15m': {
        'task': 'apps.notifications.tasks.send_scheduled_morning_notifications',
        'schedule': crontab(minute='*/15'),
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
