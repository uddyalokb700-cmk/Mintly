import datetime
import calendar
from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.users.models import User
from apps.users.views import ensure_user_setup
from apps.budgets.models import Budget
from apps.transactions.models import Transaction

class Command(BaseCommand):
    help = 'Seeds realistic demo user, budget, categories, and transactions for Mintly.'

    def handle(self, *args, **options):
        email = 'demo@mintly.app'
        self.stdout.write(f"Seeding demo user: {email}...")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'name': 'Alex Johnson',
                'preferred_currency': 'INR',
                'timezone': 'Asia/Kolkata',
                'theme': 'dark'
            }
        )
        user.set_password('MintlyDemo2026!')
        user.save()
        ensure_user_setup(user)

        # Clear existing demo transactions and budgets to provide a clean state
        user.transactions.all().delete()
        user.budgets.all().delete()

        today = datetime.date.today()
        first_day = today.replace(day=1)
        _, last_day_num = calendar.monthrange(today.year, today.month)
        last_day = today.replace(day=last_day_num)

        budget = Budget.objects.create(
            user=user,
            period_start=first_day,
            period_end=last_day,
            monthly_income=Decimal('30000.00'),
            savings_target=Decimal('6000.00'),
            currency='INR',
            status=Budget.STATUS_ACTIVE,
            income_frequency='monthly',
            income_description='Full-time Salary'
        )

        food = user.categories.filter(name='Food & Dining').first()
        transport = user.categories.filter(name='Transport').first()
        groceries = user.categories.filter(name='Groceries').first()
        entertainment = user.categories.filter(name='Entertainment').first()
        bills = user.categories.filter(name='Bills & Utilities').first()
        shopping = user.categories.filter(name='Shopping').first()

        sample_transactions = [
            # Today's expenses (totals ₹200.00 -> 25% of ₹800 daily allowance!)
            (Decimal('150.00'), food, 'Healthy Salad Lunch', 'Subway', 'UPI', today, datetime.time(13, 0)),
            (Decimal('50.00'), transport, 'Metro commute to work', 'Metro Rail', 'Card', today, datetime.time(9, 15)),
            # Past days
            (Decimal('300.00'), groceries, 'Weekly vegetables and dairy', 'Nature Basket', 'UPI', today - datetime.timedelta(days=1), datetime.time(18, 30)),
            (Decimal('200.00'), entertainment, 'Cinema movie tickets', 'PVR Cinemas', 'Card', today - datetime.timedelta(days=2), datetime.time(20, 15)),
            (Decimal('450.00'), bills, 'High-speed broadband bill', 'Airtel Fiber', 'UPI', today - datetime.timedelta(days=3), datetime.time(11, 0)),
            (Decimal('280.00'), food, 'Dinner with team', 'Olive Bistro', 'Card', today - datetime.timedelta(days=4), datetime.time(21, 0)),
            (Decimal('120.00'), transport, 'Cab ride home', 'Uber', 'UPI', today - datetime.timedelta(days=5), datetime.time(22, 30)),
            (Decimal('650.00'), shopping, 'Running shoes & socks', 'Decathlon', 'Card', today - datetime.timedelta(days=6), datetime.time(16, 45)),
        ]

        for amt, cat, desc, merch, method, tdate, ttime in sample_transactions:
            Transaction.objects.create(
                user=user,
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

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
        self.stdout.write(f"Email: {email}")
        self.stdout.write(f"Password: MintlyDemo2026!")
        self.stdout.write(f"Monthly Income: ₹30,000 | Savings Target: ₹6,000 | Spendable: ₹24,000")
        self.stdout.write(f"Base Daily Allowance (30 days): ₹800.00")
