from django.contrib import admin
from django.urls import path, include
from django.db import connection
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from apps.storage.services import neon_storage

@api_view(['GET'])
@permission_classes([AllowAny])
def api_health(request):
    db_status = 'ok'
    storage_status = 'unconfigured'
    all_healthy = True

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as exc:
        db_status = f'error: {str(exc)}'
        all_healthy = False

    if neon_storage.is_configured:
        storage_check = neon_storage.health_check()
        storage_status = storage_check.get('status', 'unknown')
        if storage_status != 'healthy':
            all_healthy = False

    res_data = {
        'status': 'healthy' if all_healthy else 'degraded',
        'database': db_status,
        'database_engine': connection.vendor,
        'object_storage': {
            'status': storage_status,
            'bucket': neon_storage.bucket_name if neon_storage.is_configured else None,
        },
        'application': 'Mintly Personal Finance API',
        'version': '1.0.0'
    }

    status_code = 200 if all_healthy else 503
    return Response(res_data, status=status_code)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', api_health, name='api-health'),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/budgets/', include('apps.budgets.urls')),
    path('api/v1/categories/', include('apps.categories.urls')),
    path('api/v1/transactions/', include('apps.transactions.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/storage/', include('apps.storage.urls')),
]
