import secrets
from datetime import timedelta
from django.utils import timezone
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from apps.users.models import User, PasswordResetToken
from apps.users.serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    UserUpdateSerializer,
)
from apps.categories.models import Category
from apps.notifications.models import NotificationPreference
from apps.budgets.models import Budget

DEFAULT_EXPENSE_CATEGORIES = [
    ('Food & Dining', 'Utensils', '#35E6A0'),
    ('Transport', 'Car', '#38BDF8'),
    ('Shopping', 'ShoppingBag', '#F472B6'),
    ('Bills & Utilities', 'Receipt', '#FBBF24'),
    ('Entertainment', 'Film', '#A78BFA'),
    ('Health', 'HeartPulse', '#F87171'),
    ('Education', 'GraduationCap', '#60A5FA'),
    ('Groceries', 'ShoppingCart', '#34D399'),
    ('Travel', 'Plane', '#F59E0B'),
    ('Subscriptions', 'Zap', '#818CF8'),
    ('Other', 'CircleDollarSign', '#9CA3AF'),
]

DEFAULT_INCOME_CATEGORIES = [
    ('Salary', 'Briefcase', '#35E6A0'),
    ('Freelance', 'Laptop', '#38BDF8'),
    ('Scholarship', 'GraduationCap', '#FBBF24'),
    ('Allowance', 'Wallet', '#A78BFA'),
    ('Refund', 'RefreshCw', '#34D399'),
    ('Other Income', 'PlusCircle', '#9CA3AF'),
]

def seed_user_default_categories(user):
    for name, icon, color in DEFAULT_EXPENSE_CATEGORIES:
        Category.objects.get_or_create(
            user=user,
            name=name,
            category_type=Category.EXPENSE,
            defaults={'icon': icon, 'color': color}
        )
    for name, icon, color in DEFAULT_INCOME_CATEGORIES:
        Category.objects.get_or_create(
            user=user,
            name=name,
            category_type=Category.INCOME,
            defaults={'icon': icon, 'color': color}
        )

def ensure_user_setup(user):
    NotificationPreference.objects.get_or_create(user=user)
    seed_user_default_categories(user)

class RegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            ensure_user_setup(user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
                'has_budget': False,
                'message': 'Account created successfully.'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            ensure_user_setup(user)
            has_budget = Budget.objects.filter(user=user, status=Budget.STATUS_ACTIVE).exists()
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
                'has_budget': has_budget,
                'message': 'Logged in successfully.'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)

class MeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        has_budget = Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).exists()
        return Response({
            'user': UserSerializer(request.user).data,
            'has_budget': has_budget,
        })

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email'].lower().strip()
            user = User.objects.filter(email=email).first()
            if user:
                token_str = secrets.token_urlsafe(32)
                expires = timezone.now() + timedelta(hours=1)
                PasswordResetToken.objects.create(user=user, token=token_str, expires_at=expires)
                # In production send email. In development, return reset token for testing ease
                return Response({
                    'message': 'Password reset link generated.',
                    'reset_token': token_str
                })
            return Response({'message': 'If the email exists, a reset link was sent.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            token_str = serializer.validated_data['token']
            pr_token = PasswordResetToken.objects.filter(token=token_str, is_used=False).first()
            if not pr_token or not pr_token.is_valid():
                return Response({'token': 'Invalid or expired password reset token.'}, status=status.HTTP_400_BAD_REQUEST)
            user = pr_token.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            pr_token.is_used = True
            pr_token.save()
            Token.objects.filter(user=user).delete()
            return Response({'message': 'Password has been reset successfully. You can now login.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            if not request.user.check_password(serializer.validated_data['old_password']):
                return Response({'old_password': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return Response({'message': 'Password updated successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DemoLoginView(views.APIView):
    """
    Demo login endpoint: generates or fetches the demo account with sample data.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        demo_email = 'demo@mintly.app'
        demo_user, created = User.objects.get_or_create(
            email=demo_email,
            defaults={
                'name': 'Alex Demo',
                'preferred_currency': 'INR',
                'timezone': 'Asia/Kolkata',
                'theme': 'dark'
            }
        )
        if created:
            demo_user.set_password('MintlyDemo2026!')
            demo_user.save()
        ensure_user_setup(demo_user)

        # Check or seed demo budget and transactions
        from apps.budgets.models import Budget
        import datetime
        from decimal import Decimal
        today = datetime.date.today()
        first_day = today.replace(day=1)
        # last day of month
        import calendar
        _, last_day_num = calendar.monthrange(today.year, today.month)
        last_day = today.replace(day=last_day_num)

        budget = Budget.objects.filter(user=demo_user, status=Budget.STATUS_ACTIVE).first()
        if not budget:
            budget = Budget.objects.create(
                user=demo_user,
                period_start=first_day,
                period_end=last_day,
                monthly_income=Decimal('30000.00'),
                savings_target=Decimal('6000.00'),
                currency='INR',
                status=Budget.STATUS_ACTIVE,
                income_description='Full-time Salary'
            )

        # Seed sample demo transactions if user has fewer than 4 transactions
        from apps.transactions.models import Transaction
        if demo_user.transactions.count() < 4:
            food_cat = demo_user.categories.filter(name='Food & Dining').first()
            transport_cat = demo_user.categories.filter(name='Transport').first()
            groceries_cat = demo_user.categories.filter(name='Groceries').first()
            entertainment_cat = demo_user.categories.filter(name='Entertainment').first()

            sample_expenses = [
                (Decimal('150.00'), food_cat, 'Lunch at Subway', 'Subway', 'UPI', today, datetime.time(13, 15)),
                (Decimal('50.00'), transport_cat, 'Metro card recharge', 'Metro Rail', 'Card', today, datetime.time(9, 30)),
                (Decimal('300.00'), groceries_cat, 'Fresh fruits & dairy', 'Nature Basket', 'UPI', today - timedelta(days=1), datetime.time(18, 45)),
                (Decimal('200.00'), entertainment_cat, 'Cinema movie ticket', 'PVR Cinemas', 'Card', today - timedelta(days=2), datetime.time(20, 0)),
            ]
            for amt, cat, desc, merch, method, tdate, ttime in sample_expenses:
                Transaction.objects.create(
                    user=demo_user,
                    budget=budget,
                    category=cat,
                    transaction_type=Transaction.EXPENSE,
                    amount=amt,
                    currency='INR',
                    description=desc,
                    merchant=merch,
                    payment_method=method,
                    transaction_date=tdate,
                    transaction_time=ttime
                )

        token, _ = Token.objects.get_or_create(user=demo_user)
        return Response({
            'token': token.key,
            'user': UserSerializer(demo_user).data,
            'has_budget': True,
            'message': 'Logged in as Demo User.'
        })
