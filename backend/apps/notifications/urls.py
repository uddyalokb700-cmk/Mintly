from django.urls import path
from apps.notifications.views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationPreferenceView,
    PushSubscriptionView,
    VapidPublicKeyView,
    TriggerMorningGreetingView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications-list'),
    path('read-all/', NotificationMarkAllReadView.as_view(), name='notifications-read-all'),
    path('preferences/', NotificationPreferenceView.as_view(), name='notifications-preferences'),
    path('push-subscriptions/', PushSubscriptionView.as_view(), name='notifications-push-subscriptions'),
    path('vapid-key/', VapidPublicKeyView.as_view(), name='notifications-vapid-key'),
    path('test-morning-greeting/', TriggerMorningGreetingView.as_view(), name='notifications-test-greeting'),
    path('<uuid:pk>/read/', NotificationMarkReadView.as_view(), name='notifications-mark-read'),
]
