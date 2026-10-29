from rest_framework import serializers
from decimal import Decimal
from apps.budgets.models import Budget
from apps.budgets.engine import BudgetEngine

class BudgetSerializer(serializers.ModelSerializer):
    spendable_budget = serializers.SerializerMethodField()
    base_daily_allowance = serializers.SerializerMethodField()
    days_in_period = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id',
            'period_start',
            'period_end',
            'monthly_income',
            'savings_target',
            'currency',
            'status',
            'income_frequency',
            'income_description',
            'notes',
            'spendable_budget',
            'base_daily_allowance',
            'days_in_period',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_spendable_budget(self, obj):
        try:
            return str(BudgetEngine.calculate_spendable_budget(obj.monthly_income, obj.savings_target))
        except Exception:
            return "0.00"

    def get_days_in_period(self, obj):
        try:
            return BudgetEngine.calculate_days_in_period(obj.period_start, obj.period_end)
        except Exception:
            return 30

    def get_base_daily_allowance(self, obj):
        try:
            spendable = BudgetEngine.calculate_spendable_budget(obj.monthly_income, obj.savings_target)
            days = BudgetEngine.calculate_days_in_period(obj.period_start, obj.period_end)
            return str(BudgetEngine.calculate_base_daily_allowance(spendable, days))
        except Exception:
            return "0.00"

    def validate(self, attrs):
        income = attrs.get('monthly_income', getattr(self.instance, 'monthly_income', None))
        savings = attrs.get('savings_target', getattr(self.instance, 'savings_target', None))
        period_start = attrs.get('period_start', getattr(self.instance, 'period_start', None))
        period_end = attrs.get('period_end', getattr(self.instance, 'period_end', None))

        if income is not None and savings is not None:
            if savings > income:
                raise serializers.ValidationError({"savings_target": "Savings target cannot exceed monthly income."})
            if savings < Decimal('0.00'):
                raise serializers.ValidationError({"savings_target": "Savings target cannot be negative."})
            if income <= Decimal('0.00'):
                raise serializers.ValidationError({"monthly_income": "Monthly income must be greater than zero."})

        if period_start and period_end and period_end < period_start:
            raise serializers.ValidationError({"period_end": "Period end date cannot be before period start date."})

        return attrs

class BudgetCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = [
            'period_start',
            'period_end',
            'monthly_income',
            'savings_target',
            'currency',
            'income_frequency',
            'income_description',
            'notes',
        ]

    def validate(self, attrs):
        income = attrs.get('monthly_income')
        savings = attrs.get('savings_target')
        period_start = attrs.get('period_start')
        period_end = attrs.get('period_end')

        if income is not None and savings is not None:
            if savings > income:
                raise serializers.ValidationError({"savings_target": "Savings target cannot exceed monthly income."})
            if savings < Decimal('0.00'):
                raise serializers.ValidationError({"savings_target": "Savings target cannot be negative."})
            if income <= Decimal('0.00'):
                raise serializers.ValidationError({"monthly_income": "Monthly income must be greater than zero."})

        if period_start and period_end and period_end < period_start:
            raise serializers.ValidationError({"period_end": "Period end date cannot be before period start date."})

        return attrs
