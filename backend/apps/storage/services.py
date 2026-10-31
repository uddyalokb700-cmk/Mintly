import os
import logging
from typing import Optional, Dict, Any, List
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)

class NeonObjectStorageService:
    """
    Service client for Neon Object Storage (S3-compatible, branch-aware object storage).
    Uses path-style addressing and SigV4 as required by Neon Object Storage.
    """

    def __init__(self):
        self.endpoint_url = getattr(settings, 'AWS_ENDPOINT_URL_S3', os.environ.get('AWS_ENDPOINT_URL_S3', ''))
        self.access_key_id = getattr(settings, 'AWS_ACCESS_KEY_ID', os.environ.get('AWS_ACCESS_KEY_ID', ''))
        self.secret_access_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', os.environ.get('AWS_SECRET_ACCESS_KEY', ''))
        self.region_name = getattr(settings, 'AWS_REGION', os.environ.get('AWS_REGION', 'ap-southeast-1'))
        self.bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', os.environ.get('AWS_STORAGE_BUCKET_NAME', 'assets'))
        self._client = None

    @property
    def is_configured(self) -> bool:
        return bool(self.endpoint_url and self.access_key_id and self.secret_access_key and self.bucket_name)

    def get_client(self):
        if not self.is_configured:
            raise ValueError(
                "Neon Object Storage is not configured. "
                "Ensure AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY are set."
            )

        if self._client is None:
            # Neon requires path-style addressing
            s3_config = Config(
                s3={'addressing_style': 'path'},
                signature_version='s3v4',
                retries={'max_attempts': 3, 'mode': 'standard'}
            )
            self._client = boto3.client(
                's3',
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name=self.region_name,
                config=s3_config
            )
        return self._client

    def upload_file(self, file_obj, key: str, content_type: Optional[str] = None, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Uploads a file-like object to Neon Object Storage.
        """
        client = self.get_client()
        extra_args: Dict[str, Any] = {}
        if content_type:
            extra_args['ContentType'] = content_type
        if metadata:
            extra_args['Metadata'] = metadata

        client.upload_fileobj(
            Fileobj=file_obj,
            Bucket=self.bucket_name,
            Key=key,
            ExtraArgs=extra_args
        )

        presigned_url = self.generate_presigned_url(key, expires_in=3600)
        return {
            'bucket': self.bucket_name,
            'key': key,
            'presigned_url': presigned_url,
            'endpoint': self.endpoint_url,
        }

    def upload_bytes(self, data: bytes, key: str, content_type: str = 'application/octet-stream', metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Uploads raw bytes to Neon Object Storage.
        """
        client = self.get_client()
        extra_args: Dict[str, Any] = {
            'Bucket': self.bucket_name,
            'Key': key,
            'Body': data,
            'ContentType': content_type
        }
        if metadata:
            extra_args['Metadata'] = metadata

        client.put_object(**extra_args)
        presigned_url = self.generate_presigned_url(key, expires_in=3600)
        return {
            'bucket': self.bucket_name,
            'key': key,
            'size': len(data),
            'presigned_url': presigned_url,
        }

    def download_bytes(self, key: str) -> bytes:
        """
        Downloads object bytes from Neon Object Storage.
        """
        client = self.get_client()
        response = client.get_object(Bucket=self.bucket_name, Key=key)
        return response['Body'].read()

    def generate_presigned_url(self, key: str, client_method: str = 'get_object', expires_in: int = 3600) -> str:
        """
        Generates a secure presigned URL for private bucket access.
        """
        client = self.get_client()
        return client.generate_presigned_url(
            ClientMethod=client_method,
            Params={'Bucket': self.bucket_name, 'Key': key},
            ExpiresIn=expires_in
        )

    def delete_file(self, key: str) -> bool:
        """
        Deletes an object from Neon Object Storage.
        """
        client = self.get_client()
        client.delete_object(Bucket=self.bucket_name, Key=key)
        return True

    def list_files(self, prefix: str = '', max_keys: int = 50) -> List[Dict[str, Any]]:
        """
        Lists objects under a given prefix.
        """
        client = self.get_client()
        resp = client.list_objects_v2(
            Bucket=self.bucket_name,
            Prefix=prefix,
            MaxKeys=max_keys
        )
        items = []
        for obj in resp.get('Contents', []):
            items.append({
                'key': obj['Key'],
                'size': obj['Size'],
                'last_modified': obj['LastModified'].isoformat(),
            })
        return items

    def health_check(self) -> Dict[str, Any]:
        """
        Performs connectivity and permission check against the Neon Object Storage bucket.
        """
        if not self.is_configured:
            return {
                'status': 'unconfigured',
                'detail': 'Neon Object Storage environment variables are not set'
            }

        try:
            client = self.get_client()
            resp = client.list_objects_v2(Bucket=self.bucket_name, MaxKeys=1)
            return {
                'status': 'healthy',
                'bucket': self.bucket_name,
                'endpoint': self.endpoint_url,
                'region': self.region_name,
                'key_count': resp.get('KeyCount', 0),
            }
        except Exception as exc:
            logger.error(f"Neon Object Storage health check error: {exc}")
            return {
                'status': 'error',
                'detail': str(exc),
                'bucket': self.bucket_name,
            }

# Global singleton
neon_storage = NeonObjectStorageService()
