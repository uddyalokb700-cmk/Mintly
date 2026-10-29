import uuid
from django.db import models
from django.conf import settings

class Budget(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_ARCHIVED = 'archived'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_ARCHIVED, 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='budgets')
    period_start = models.DateField(db_index=True)
    period_end = models.DateField(db_index=True)
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2)
    savings_target = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    income_frequency = models.CharField(max_length=20, default='monthly')
    income_description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mintly_budgets'
        ordering = ['-period_start', '-created_at']

    def __str__(self):
        return f"{self.user.email} [{self.period_start} - {self.period_end}]"
