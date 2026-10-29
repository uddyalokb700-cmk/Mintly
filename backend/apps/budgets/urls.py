from django.urls import path
from apps.budgets.views import (
    CurrentBudgetView,
    BudgetListCreateView,
    BudgetDetailView,
    BudgetSummaryView,
    BudgetHistoryView,
)

urlpatterns = [
    path('current/', CurrentBudgetView.as_view(), name='budgets-current'),
    path('', BudgetListCreateView.as_view(), name='budgets-list-create'),
    path('summary/', BudgetSummaryView.as_view(), name='budgets-summary'),
    path('history/', BudgetHistoryView.as_view(), name='budgets-history'),
    path('<uuid:pk>/', BudgetDetailView.as_view(), name='budgets-detail'),
]
