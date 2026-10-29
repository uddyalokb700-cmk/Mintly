from django.utils import timezone
from django.conf import settings
from rest_framework import status, views, permissions, generics
from rest_framework.response import Response
from apps.notifications.models import Notification, NotificationPreference, PushSubscription
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    PushSubscriptionSerializer
)
from apps.notifications.services import send_morning_greeting_notification

class NotificationListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)
        unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
        if unread_only:
            qs = qs.filter(is_read=False)

        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        serializer = NotificationSerializer(qs[:50], many=True)
        return Response({
            'unread_count': unread_count,
            'notifications': serializer.data
        })

class NotificationMarkReadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        notif = generics.get_object_or_404(Notification, pk=pk, user=request.user)
        notif.is_read = True
        notif.read_at = timezone.now()
        notif.save(update_fields=['is_read', 'read_at'])
        return Response(NotificationSerializer(notif).data)

class NotificationMarkAllReadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'message': 'All notifications marked as read.'})

class NotificationPreferenceView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(pref).data)

    def patch(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            updated_pref = serializer.save()
            return Response(NotificationPreferenceSerializer(updated_pref).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PushSubscriptionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PushSubscriptionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            # Enable push in preferences
            pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
            pref.push_enabled = True
            pref.save(update_fields=['push_enabled'])
            return Response({'message': 'Push subscription saved successfully.'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        endpoint = request.data.get('endpoint')
        if endpoint:
            PushSubscription.objects.filter(user=request.user, endpoint=endpoint).update(active=False)
        else:
            PushSubscription.objects.filter(user=request.user).update(active=False)
        return Response({'message': 'Push subscription removed.'}, status=status.HTTP_200_OK)

class VapidPublicKeyView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        vapid_key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
        return Response({'publicKey': vapid_key})

class TriggerMorningGreetingView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        notif = send_morning_greeting_notification(request.user)
        if notif:
            return Response({
                'message': 'Morning greeting sent.',
                'notification': NotificationSerializer(notif).data
            })
        return Response({'message': 'Greeting already sent for today or conditions not met.'})
