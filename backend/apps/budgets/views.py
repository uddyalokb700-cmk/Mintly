import datetime
from django.utils import timezone
import pytz
from rest_framework import status, views, permissions, generics
from rest_framework.response import Response
from apps.budgets.models import Budget
from apps.budgets.serializers import BudgetSerializer, BudgetCreateUpdateSerializer
from apps.budgets.engine import BudgetEngine

def get_user_today(user):
    user_tz_str = getattr(user, 'timezone', 'Asia/Kolkata') or 'Asia/Kolkata'
    try:
        tz = pytz.timezone(user_tz_str)
        return timezone.now().astimezone(tz).date()
    except Exception:
        return datetime.date.today()

class CurrentBudgetView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        budget = Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).first()
        if not budget:
            return Response({'has_budget': False, 'message': 'No active budget found.'}, status=status.HTTP_200_OK)

        user_today = get_user_today(request.user)
        summary = BudgetEngine.calculate_summary(budget, user_today=user_today)
        return Response({
            'has_budget': True,
            'budget': BudgetSerializer(budget).data,
            'summary': summary,
        })

class BudgetListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        budgets = Budget.objects.filter(user=request.user)
        return Response(BudgetSerializer(budgets, many=True).data)

    def post(self, request):
        serializer = BudgetCreateUpdateSerializer(data=request.data)
        if serializer.is_valid():
            # Archive previous active budgets
            Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).update(status=Budget.STATUS_ARCHIVED)

            budget = Budget.objects.create(
                user=request.user,
                status=Budget.STATUS_ACTIVE,
                **serializer.validated_data
            )
            user_today = get_user_today(request.user)
            summary = BudgetEngine.calculate_summary(budget, user_today=user_today)
            return Response({
                'budget': BudgetSerializer(budget).data,
                'summary': summary,
                'message': 'Budget configured successfully.'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BudgetDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        return generics.get_object_or_404(Budget, pk=pk, user=user)

    def get(self, request, pk):
        budget = self.get_object(pk, request.user)
        user_today = get_user_today(request.user)
        summary = BudgetEngine.calculate_summary(budget, user_today=user_today)
        return Response({
            'budget': BudgetSerializer(budget).data,
            'summary': summary,
        })

    def patch(self, request, pk):
        budget = self.get_object(pk, request.user)
        serializer = BudgetCreateUpdateSerializer(budget, data=request.data, partial=True)
        if serializer.is_valid():
            updated_budget = serializer.save()
            user_today = get_user_today(request.user)
            summary = BudgetEngine.calculate_summary(updated_budget, user_today=user_today)
            return Response({
                'budget': BudgetSerializer(updated_budget).data,
                'summary': summary,
                'message': 'Budget updated successfully.'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BudgetSummaryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        budget = Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).first()
        if not budget:
            return Response({'has_budget': False, 'message': 'No active budget found.'}, status=status.HTTP_404_NOT_FOUND)
        user_today = get_user_today(request.user)
        summary = BudgetEngine.calculate_summary(budget, user_today=user_today)
        return Response(summary)

class BudgetHistoryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        budgets = Budget.objects.filter(user=request.user, status=Budget.STATUS_ARCHIVED)
        results = []
        for b in budgets:
            summary = BudgetEngine.calculate_summary(b, user_today=b.period_end)
            data = BudgetSerializer(b).data
            data['final_summary'] = summary
            results.append(data)
        return Response(results)
