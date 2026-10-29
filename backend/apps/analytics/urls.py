from django.urls import path
from apps.analytics.views import (
    AnalyticsOverviewView,
    AnalyticsCategoriesView,
    AnalyticsTrendsView,
    AnalyticsCalendarView,
)

urlpatterns = [
    path('overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('categories/', AnalyticsCategoriesView.as_view(), name='analytics-categories'),
    path('trends/', AnalyticsTrendsView.as_view(), name='analytics-trends'),
    path('calendar/', AnalyticsCalendarView.as_view(), name='analytics-calendar'),
]
