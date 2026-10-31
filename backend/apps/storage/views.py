import os
import uuid
import re
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from apps.storage.services import neon_storage

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'pdf', 'txt', 'csv'}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

def sanitize_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    return filename or 'file'

class StorageHealthView(APIView):
    """
    Check the connectivity and status of Neon Object Storage.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        health = neon_storage.health_check()
        http_status = status.HTTP_200_OK if health.get('status') == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(health, status=http_status)

class StorageUploadView(APIView):
    """
    Upload a file (e.g. transaction receipt, bill attachment, user avatar) to Neon Object Storage.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not neon_storage.is_configured:
            return Response(
                {"error": "Neon Object Storage service is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {"error": "No file was provided in the 'file' field."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if file_obj.size > MAX_FILE_SIZE_BYTES:
            return Response(
                {"error": f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024*1024)}MB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        orig_name = sanitize_filename(file_obj.name)
        ext = orig_name.rsplit('.', 1)[-1].lower() if '.' in orig_name else ''
        if ext and ext not in ALLOWED_EXTENSIONS:
            return Response(
                {"error": f"File extension '.{ext}' is not permitted. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        category = request.data.get('category', 'receipts').strip().lower()
        if category not in ('receipts', 'avatars', 'documents', 'attachments'):
            category = 'receipts'

        file_id = uuid.uuid4().hex[:12]
        storage_key = f"{category}/{request.user.id}/{file_id}_{orig_name}"
        content_type = file_obj.content_type or 'application/octet-stream'

        try:
            result = neon_storage.upload_file(
                file_obj=file_obj,
                key=storage_key,
                content_type=content_type,
                metadata={
                    'user_id': str(request.user.id),
                    'original_name': orig_name,
                    'category': category,
                }
            )

            return Response({
                "status": "success",
                "key": storage_key,
                "filename": orig_name,
                "size": file_obj.size,
                "content_type": content_type,
                "category": category,
                "presigned_url": result.get('presigned_url'),
                "bucket": result.get('bucket'),
            }, status=status.HTTP_201_CREATED)

        except Exception as exc:
            return Response(
                {"error": f"Failed to upload to Neon Object Storage: {str(exc)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class StoragePresignedUrlView(APIView):
    """
    Generate a fresh presigned URL for secure access to a user-owned object in Neon Object Storage.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        key = request.query_params.get('key')
        if not key:
            return Response({"error": "Query parameter 'key' is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure user owns this key (path starts with category/{user.id}/) or user is staff
        user_prefix = f"/{request.user.id}/"
        if not request.user.is_staff and user_prefix not in f"/{key}":
            return Response({"error": "Permission denied: key does not belong to this user."}, status=status.HTTP_403_FORBIDDEN)

        try:
            presigned_url = neon_storage.generate_presigned_url(key=key, expires_in=3600)
            return Response({
                "key": key,
                "presigned_url": presigned_url,
                "expires_in": 3600,
            })
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StorageFilesView(APIView):
    """
    List or delete files belonging to the authenticated user in Neon Object Storage.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        category = request.query_params.get('category', '').strip().lower()
        if category:
            prefix = f"{category}/{request.user.id}/"
        else:
            prefix = ""

        try:
            files = neon_storage.list_files(prefix=prefix)
            # Filter to user files
            user_id_str = str(request.user.id)
            user_files = [f for f in files if f"/{user_id_str}/" in f['key'] or request.user.is_staff]
            return Response({"files": user_files, "count": len(user_files)})
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        key = request.query_params.get('key') or request.data.get('key')
        if not key:
            return Response({"error": "Parameter 'key' is required."}, status=status.HTTP_400_BAD_REQUEST)

        user_prefix = f"/{request.user.id}/"
        if not request.user.is_staff and user_prefix not in f"/{key}":
            return Response({"error": "Permission denied: cannot delete other users' files."}, status=status.HTTP_403_FORBIDDEN)

        try:
            neon_storage.delete_file(key)
            return Response({"status": "deleted", "key": key}, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
