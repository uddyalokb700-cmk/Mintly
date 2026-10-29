import uuid
from django.db import models
from django.conf import settings

class Category(models.Model):
    EXPENSE = 'expense'
    INCOME = 'income'
    CATEGORY_TYPES = [
        (EXPENSE, 'Expense'),
        (INCOME, 'Income'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='categories'
    )
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, default='CircleDollarSign')
    color = models.CharField(max_length=30, default='#35E6A0')
    category_type = models.CharField(max_length=10, choices=CATEGORY_TYPES, default=EXPENSE)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mintly_categories'
        verbose_name_plural = 'Categories'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'name', 'category_type'],
                name='unique_category_per_user'
            )
        ]

    def __str__(self):
        owner = self.user.email if self.user else "System"
        return f"{self.name} ({self.category_type}) - {owner}"
