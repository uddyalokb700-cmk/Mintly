import uuid
from django.db import models
from django.conf import settings
from apps.transactions.models import Transaction
from apps.budgets.models import Budget

class NotificationPreference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preference')
    morning_reminder_enabled = models.BooleanField(default=True)
    reminder_time = models.CharField(max_length=10, default='08:00')
    timezone = models.CharField(max_length=100, default='Asia/Kolkata')
    overspending_alerts_enabled = models.BooleanField(default=True)
    threshold_percentage = models.IntegerField(default=80)
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.CharField(max_length=10, default='22:00')
    quiet_hours_end = models.CharField(max_length=10, default='07:00')
    push_enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mintly_notification_preferences'

    def __str__(self):
        return f"Notification Preferences for {self.user.email}"

class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.TextField()
    p256dh = models.TextField()
    auth = models.TextField()
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mintly_push_subscriptions'
        unique_together = ('user', 'endpoint')

    def __str__(self):
        return f"Push Sub for {self.user.email} [{self.endpoint[:30]}...]"

class Notification(models.Model):
    TYPE_MORNING_GREETING = 'morning_greeting'
    TYPE_OVERSPENDING_WARNING = 'overspending_warning'
    TYPE_THRESHOLD_ALERT = 'threshold_alert'
    TYPE_BUDGET_ALERT = 'budget_alert'
    TYPE_SYSTEM = 'system'

    NOTIFICATION_TYPES = [
        (TYPE_MORNING_GREETING, 'Morning Greeting'),
        (TYPE_OVERSPENDING_WARNING, 'Overspending Warning'),
        (TYPE_THRESHOLD_ALERT, 'Threshold Alert'),
        (TYPE_BUDGET_ALERT, 'Budget Alert'),
        (TYPE_SYSTEM, 'System Notification'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES, default=TYPE_SYSTEM, db_index=True)
    title = models.CharField(max_length=255)
    body = models.TextField()
    related_transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, blank=True)
    related_budget = models.ForeignKey(Budget, on_delete=models.SET_NULL, null=True, blank=True)
    deduplication_key = models.CharField(max_length=255, db_index=True, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'mintly_notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.user.email}"
