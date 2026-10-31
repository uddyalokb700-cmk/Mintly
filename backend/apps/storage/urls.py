from django.urls import path
from apps.storage.views import (
    StorageHealthView,
    StorageUploadView,
    StoragePresignedUrlView,
    StorageFilesView,
)

urlpatterns = [
    path('health/', StorageHealthView.as_view(), name='storage-health'),
    path('upload/', StorageUploadView.as_view(), name='storage-upload'),
    path('presigned-url/', StoragePresignedUrlView.as_view(), name='storage-presigned-url'),
    path('files/', StorageFilesView.as_view(), name='storage-files'),
]
