import io
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.storage.services import NeonObjectStorageService

User = get_user_model()

class NeonObjectStorageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='teststorage@example.com',
            password='Password123!',
            name='Storage Tester'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_storage_service_init(self):
        service = NeonObjectStorageService()
        self.assertIsNotNone(service.bucket_name)

    @patch('apps.storage.services.neon_storage.health_check')
    def test_storage_health_endpoint(self, mock_health):
        mock_health.return_value = {
            'status': 'healthy',
            'bucket': 'assets',
            'endpoint': 'https://test-endpoint.storage.aws.neon.tech',
            'key_count': 1
        }
        response = self.client.get('/api/v1/storage/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')
        self.assertEqual(response.data['bucket'], 'assets')

    @patch('apps.storage.services.neon_storage.upload_file')
    def test_storage_upload_endpoint(self, mock_upload):
        mock_upload.return_value = {
            'bucket': 'assets',
            'key': f'receipts/{self.user.id}/abc_receipt.jpg',
            'presigned_url': 'https://mock-presigned-url.com/receipt.jpg',
        }
        test_file = io.BytesIO(b'dummy image content')
        test_file.name = 'receipt.jpg'

        response = self.client.post(
            '/api/v1/storage/upload/',
            {'file': test_file, 'category': 'receipts'},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('presigned_url', response.data)
        self.assertIn(str(self.user.id), response.data['key'])

    @patch('apps.storage.services.neon_storage.generate_presigned_url')
    def test_storage_presigned_url_authorized(self, mock_presign):
        mock_presign.return_value = 'https://signed-url.com/download'
        key = f'receipts/{self.user.id}/file123_test.png'

        response = self.client.get(f'/api/v1/storage/presigned-url/?key={key}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['presigned_url'], 'https://signed-url.com/download')

    def test_storage_presigned_url_forbidden_other_user(self):
        other_key = 'receipts/00000000-0000-0000-0000-000000000000/stolen.png'
        response = self.client.get(f'/api/v1/storage/presigned-url/?key={other_key}')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
