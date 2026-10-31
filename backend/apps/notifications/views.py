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

class QStashNotificationProcessView(views.APIView):
    """
    Webhook endpoint invoked by Upstash QStash scheduled cron jobs.
    Performs signature verification or pre-shared token validation.
    Guarantees idempotency via database deduplication keys.
    Processes morning notifications according to each user's localized timezone and reminder preferences.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'status': 'active',
            'endpoint': 'Mintly QStash Scheduled Notifications Endpoint',
            'message': 'Send a POST request with a valid Upstash-Signature header to trigger scheduled notification processing.'
        })

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)

        current_key = getattr(settings, 'QSTASH_CURRENT_SIGNING_KEY', '').strip()
        next_key = getattr(settings, 'QSTASH_NEXT_SIGNING_KEY', '').strip()
        shared_token = getattr(settings, 'QSTASH_TOKEN', '').strip()

        signature = (
            request.headers.get('Upstash-Signature') or
            request.headers.get('upstash-signature') or
            request.META.get('HTTP_UPSTASH_SIGNATURE')
        )

        authenticated = False

        # 1. Cryptographic QStash Signature Verification (Production)
        if current_key and signature:
            try:
                from qstash import Receiver
                receiver = Receiver(
                    current_signing_key=current_key,
                    next_signing_key=next_key or current_key
                )
                raw_body = request.body.decode('utf-8') if request.body else ""
                receiver.verify(signature=signature, body=raw_body)
                authenticated = True
            except Exception as e:
                logger.warning(f"QStash signature verification failed: {e}")
                return Response(
                    {'error': 'Invalid QStash signature', 'detail': str(e)},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # 2. Shared Token Fallback (Authorization: Bearer <QSTASH_TOKEN>)
        if not authenticated and shared_token:
            auth_header = request.headers.get('Authorization', '')
            if auth_header == f"Bearer {shared_token}":
                authenticated = True

        # 3. Development / Testing Mode Bypass (if no keys configured and DEBUG=True)
        if not authenticated:
            if getattr(settings, 'DEBUG', False) and not (current_key or shared_token):
                authenticated = True
            else:
                return Response(
                    {'error': 'Unauthorized: Missing or invalid Upstash-Signature or Authorization token.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # Execute idempotent, timezone-aware notification dispatch
        from apps.notifications.services import process_scheduled_morning_notifications
        stats = process_scheduled_morning_notifications()

        return Response({
            'status': 'success',
            'message': f"Scheduled notifications evaluated. Sent: {stats['sent']}, Skipped (Already sent): {stats['already_sent']}.",
            'stats': stats,
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
