from django.urls import path
from apps.transactions.views import (
    TransactionListCreateView,
    TransactionDetailView,
    TransactionExportCSVView,
)

urlpatterns = [
    path('', TransactionListCreateView.as_view(), name='transactions-list-create'),
    path('export-csv/', TransactionExportCSVView.as_view(), name='transactions-export-csv'),
    path('<uuid:pk>/', TransactionDetailView.as_view(), name='transactions-detail'),
]
