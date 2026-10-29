from django.urls import path
from apps.users.views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ChangePasswordView,
    DemoLoginView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='auth-password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('demo/', DemoLoginView.as_view(), name='auth-demo'),
]
