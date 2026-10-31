from django.contrib import admin
from django.urls import path, include
from django.db import connection
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def api_health(request):
    db_status = 'ok'
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as exc:
        db_status = f'error: {str(exc)}'
        return Response({
            'status': 'unhealthy',
            'database': db_status,
            'application': 'Mintly Personal Finance API',
            'version': '1.0.0'
        }, status=503)

    return Response({
        'status': 'healthy',
        'database': db_status,
        'application': 'Mintly Personal Finance API',
        'version': '1.0.0'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', api_health, name='api-health'),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/budgets/', include('apps.budgets.urls')),
    path('api/v1/categories/', include('apps.categories.urls')),
    path('api/v1/transactions/', include('apps.transactions.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
]
