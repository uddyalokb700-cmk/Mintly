from decimal import Decimal
from rest_framework import serializers
from apps.transactions.models import Transaction
from apps.categories.models import Category
from apps.categories.serializers import CategorySerializer

class TransactionSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True,
        required=False,
        allow_null=True
    )
    transaction_date = serializers.DateField(required=False)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'budget',
            'category',
            'category_id',
            'transaction_type',
            'amount',
            'currency',
            'description',
            'merchant',
            'payment_method',
            'transaction_date',
            'transaction_time',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'budget', 'created_at', 'updated_at']

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Transaction amount must be greater than zero.")
        return value

    def validate(self, attrs):
        category = attrs.get('category')
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if category and user and user.is_authenticated:
            if category.user is not None and category.user != user:
                raise serializers.ValidationError({"category_id": "You cannot select a category belonging to another user."})
        return attrs
