from django.urls import path
from apps.categories.views import CategoryListCreateView, CategoryDetailView

urlpatterns = [
    path('', CategoryListCreateView.as_view(), name='categories-list-create'),
    path('<uuid:pk>/', CategoryDetailView.as_view(), name='categories-detail'),
]
