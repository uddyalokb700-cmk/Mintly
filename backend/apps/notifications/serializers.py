from rest_framework import serializers
from apps.notifications.models import Notification, NotificationPreference, PushSubscription

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'body',
            'is_read',
            'read_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'morning_reminder_enabled',
            'reminder_time',
            'timezone',
            'overspending_alerts_enabled',
            'threshold_percentage',
            'quiet_hours_enabled',
            'quiet_hours_start',
            'quiet_hours_end',
            'push_enabled',
        ]

class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ['endpoint', 'p256dh', 'auth']

    def create(self, validated_data):
        user = self.context['request'].user
        sub, _ = PushSubscription.objects.update_or_create(
            user=user,
            endpoint=validated_data['endpoint'],
            defaults={
                'p256dh': validated_data['p256dh'],
                'auth': validated_data['auth'],
                'active': True
            }
        )
        return sub
