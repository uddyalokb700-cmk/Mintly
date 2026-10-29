import csv
import datetime
from decimal import Decimal
from django.http import HttpResponse
from django.db.models import Q
from rest_framework import status, views, permissions, generics
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from apps.transactions.models import Transaction
from apps.transactions.serializers import TransactionSerializer
from apps.budgets.models import Budget
from apps.budgets.engine import BudgetEngine
from apps.budgets.views import get_user_today
from apps.notifications.services import check_and_trigger_spending_alerts

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class TransactionListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Transaction.objects.filter(user=request.user)

        # Filters
        tx_type = request.query_params.get('type')
        if tx_type:
            qs = qs.filter(transaction_type=tx_type)

        category_id = request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)

        start_date = request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(transaction_date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(transaction_date__lte=end_date)

        min_amount = request.query_params.get('min_amount')
        if min_amount:
            try:
                qs = qs.filter(amount__gte=Decimal(min_amount))
            except Exception:
                pass

        max_amount = request.query_params.get('max_amount')
        if max_amount:
            try:
                qs = qs.filter(amount__lte=Decimal(max_amount))
            except Exception:
                pass

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(description__icontains=search) |
                Q(merchant__icontains=search) |
                Q(category__name__icontains=search)
            )

        ordering = request.query_params.get('ordering', '-transaction_date')
        valid_orderings = ['transaction_date', '-transaction_date', 'amount', '-amount', 'created_at', '-created_at']
        if ordering in valid_orderings:
            qs = qs.order_by(ordering, '-created_at')
        else:
            qs = qs.order_by('-transaction_date', '-created_at')

        # Pagination option: can pass paginate=false to get all transactions (e.g. for calendar/reports)
        if request.query_params.get('paginate', 'true').lower() == 'false':
            serializer = TransactionSerializer(qs, many=True)
            return Response(serializer.data)

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = TransactionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = TransactionSerializer(data=request.data)
        if serializer.is_valid():
            active_budget = Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).first()
            tx_date = serializer.validated_data.get('transaction_date', get_user_today(request.user))
            tx_time = serializer.validated_data.get('transaction_time') or datetime.datetime.now().time()

            transaction = serializer.save(
                user=request.user,
                budget=active_budget,
                transaction_date=tx_date,
                transaction_time=tx_time
            )

            # Check and trigger notifications
            check_and_trigger_spending_alerts(request.user, transaction)

            # Return updated summary along with transaction
            user_today = get_user_today(request.user)
            summary = None
            if active_budget:
                summary = BudgetEngine.calculate_summary(active_budget, user_today=user_today)

            return Response({
                'transaction': TransactionSerializer(transaction).data,
                'summary': summary,
                'message': 'Transaction recorded successfully.'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TransactionDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        return generics.get_object_or_404(Transaction, pk=pk, user=user)

    def get(self, request, pk):
        tx = self.get_object(pk, request.user)
        return Response(TransactionSerializer(tx).data)

    def patch(self, request, pk):
        tx = self.get_object(pk, request.user)
        serializer = TransactionSerializer(tx, data=request.data, partial=True)
        if serializer.is_valid():
            updated_tx = serializer.save()
            check_and_trigger_spending_alerts(request.user, updated_tx)

            active_budget = Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).first()
            user_today = get_user_today(request.user)
            summary = None
            if active_budget:
                summary = BudgetEngine.calculate_summary(active_budget, user_today=user_today)

            return Response({
                'transaction': TransactionSerializer(updated_tx).data,
                'summary': summary,
                'message': 'Transaction updated successfully.'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        tx = self.get_object(pk, request.user)
        tx.delete()

        active_budget = Budget.objects.filter(user=request.user, status=Budget.STATUS_ACTIVE).first()
        user_today = get_user_today(request.user)
        summary = None
        if active_budget:
            summary = BudgetEngine.calculate_summary(active_budget, user_today=user_today)

        return Response({
            'message': 'Transaction deleted successfully.',
            'summary': summary
        }, status=status.HTTP_200_OK)

class TransactionExportCSVView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Transaction.objects.filter(user=request.user).order_by('-transaction_date', '-transaction_time')

        # Filter by date range if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(transaction_date__gte=start_date)
        if end_date:
            qs = qs.filter(transaction_date__lte=end_date)

        response = HttpResponse(content_type='text/csv')
        filename = f"mintly_transactions_{datetime.date.today().isoformat()}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow([
            'Date',
            'Time',
            'Type',
            'Category',
            'Description',
            'Merchant',
            'Payment Method',
            'Amount',
            'Currency'
        ])

        for tx in qs:
            cat_name = tx.category.name if tx.category else 'Uncategorized'
            time_str = tx.transaction_time.strftime('%H:%M:%S') if tx.transaction_time else ''
            writer.writerow([
                tx.transaction_date.isoformat(),
                time_str,
                tx.transaction_type,
                cat_name,
                tx.description,
                tx.merchant,
                tx.payment_method,
                str(tx.amount),
                tx.currency
            ])

        return response
