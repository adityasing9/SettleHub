from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.models import Budget, Expense, Notification, ExchangeRate

def get_exchange_rate(db: Session, base: str, target: str) -> float:
    if base == target:
        return 1.0
    rate_entry = db.query(ExchangeRate).filter(
        ExchangeRate.base_currency == base,
        ExchangeRate.target_currency == target
    ).first()
    if rate_entry:
        return rate_entry.rate
    rate_entry_inv = db.query(ExchangeRate).filter(
        ExchangeRate.base_currency == target,
        ExchangeRate.target_currency == base
    ).first()
    if rate_entry_inv and rate_entry_inv.rate != 0:
        return 1.0 / rate_entry_inv.rate
    return 1.0

def evaluate_budgets(db: Session, user_id: int, expense: Expense):
    """
    Evaluates active budgets against a newly logged expense.
    Calculates thresholds and creates notifications when crossed.
    """
    budgets = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.is_deleted == False
    ).all()
    
    thresholds = [50, 75, 90, 100, 110]
    
    for budget in budgets:
        # Determine if expense matches budget constraints
        matches = False
        
        if budget.budget_type == "category" and budget.category_id == expense.category_id:
            matches = True
        elif budget.budget_type == "group" and budget.group_id == expense.group_id:
            matches = True
        elif budget.budget_type == "monthly":
            # Check if expense is in the current month
            now = datetime.utcnow()
            start_of_month = datetime(now.year, now.month, 1)
            if expense.created_at >= start_of_month:
                matches = True
        elif budget.budget_type == "weekly":
            now = datetime.utcnow()
            start_of_week = now - timedelta(days=now.weekday())
            if expense.created_at >= start_of_week:
                matches = True
        elif budget.budget_type == "yearly":
            now = datetime.utcnow()
            start_of_year = datetime(now.year, 1, 1)
            if expense.created_at >= start_of_year:
                matches = True

        if matches:
            # Convert expense amount to budget currency
            rate = get_exchange_rate(db, expense.currency, budget.currency)
            converted_amount = expense.amount * rate
            
            old_spent = budget.spent_amount
            new_spent = old_spent + converted_amount
            
            # Calculate percentages
            old_pct = (old_spent / budget.amount) * 100
            new_pct = (new_spent / budget.amount) * 100
            
            # Check thresholds crossed
            for t in thresholds:
                if old_pct < t <= new_pct:
                    # Create notification
                    notif = Notification(
                        user_id=user_id,
                        title=f"Budget Warning: {budget.name}",
                        message=f"You have reached {t}% of your budget limit. Spent: {budget.currency} {new_spent:.2f} of {budget.currency} {budget.amount:.2f}.",
                        notification_type="system",
                        is_read=False,
                        sent_at=datetime.utcnow()
                    )
                    db.add(notif)
            
            budget.spent_amount = new_spent
            db.commit()
            db.refresh(budget)
