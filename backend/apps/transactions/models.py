import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.budgets.models import Budget
from apps.categories.models import Category

class Transaction(models.Model):
    EXPENSE = 'expense'
    INCOME = 'income'
    TYPE_CHOICES = [
        (EXPENSE, 'Expense'),
        (INCOME, 'Income'),
    ]

    PAYMENT_CHOICES = [
        ('UPI', 'UPI'),
        ('Card', 'Card'),
        ('Cash', 'Cash'),
        ('Bank Transfer', 'Bank Transfer'),
        ('Other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    budget = models.ForeignKey(Budget, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=EXPENSE, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    description = models.CharField(max_length=255, blank=True)
    merchant = models.CharField(max_length=255, blank=True)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_CHOICES, default='UPI')
    transaction_date = models.DateField(db_index=True)
    transaction_time = models.TimeField(null=True, blank=True)
    receipt_key = models.CharField(max_length=500, blank=True, default='')
    receipt_url = models.CharField(max_length=1000, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mintly_transactions'
        ordering = ['-transaction_date', '-transaction_time', '-created_at']
        indexes = [
            models.Index(fields=['user', 'transaction_date']),
            models.Index(fields=['user', 'transaction_type', 'transaction_date']),
        ]

    def __str__(self):
        return f"{self.transaction_type.upper()} {self.amount} {self.currency} - {self.description or (self.category.name if self.category else 'Transaction')}"
