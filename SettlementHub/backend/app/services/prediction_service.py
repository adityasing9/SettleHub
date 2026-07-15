from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.models import Expense, ExpenseCategory, ExchangeRate, UserPreference
from collections import defaultdict

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

def predict_spending(db: Session, user_id: int) -> dict:
    """
    Analyzes historical expense data to project future monthly spending,
    category limits, upcoming cash flow needs, and budget overruns.
    """
    pref_currency = "INR"
    prefs = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if prefs:
        pref_currency = prefs.default_currency

    expenses = db.query(Expense).filter(
        Expense.user_id == user_id,
        Expense.is_deleted == False
    ).all()
    
    if not expenses:
        return {
            "predicted_monthly": 0.0,
            "predicted_yearly": 0.0,
            "category_predictions": {},
            "confidence_percentage": 50.0,
            "currency": pref_currency,
            "message": "No expense data found to make predictions."
        }
        
    # Group expenses by month and category
    monthly_totals = defaultdict(float)
    category_totals = defaultdict(float)
    
    for exp in expenses:
        rate = get_exchange_rate(db, exp.currency, pref_currency)
        amount_pref = exp.amount * rate
        
        # YYYY-MM
        month_key = exp.created_at.strftime("%Y-%m")
        monthly_totals[month_key] += amount_pref
        category_totals[exp.category_id] += amount_pref

    # Determine unique months count
    unique_months = list(monthly_totals.keys())
    unique_months.sort()
    
    # Calculate average burn rate
    avg_monthly = sum(monthly_totals.values()) / len(monthly_totals)
    
    # Simple linear extrapolation or pacing for current month
    now = datetime.utcnow()
    current_month_key = now.strftime("%Y-%m")
    current_month_spent = monthly_totals[current_month_key]
    
    day_of_month = now.day
    days_in_month = 30 # default
    if now.month in [1, 3, 5, 7, 8, 10, 12]:
        days_in_month = 31
    elif now.month == 2:
        days_in_month = 29 if now.year % 4 == 0 else 28
        
    pacing_current_month = (current_month_spent / day_of_month) * days_in_month
    
    # Weighted prediction: 60% historical average, 40% current burn pacing
    if len(unique_months) > 1:
        next_month_prediction = (avg_monthly * 0.6) + (pacing_current_month * 0.4)
        confidence = 80.0
    else:
        next_month_prediction = pacing_current_month
        confidence = 60.0
        
    # Categories predictions for next month (proportional share)
    category_predictions = {}
    total_spent = sum(category_totals.values())
    for cat_id, cat_total in category_totals.items():
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == cat_id).first()
        cat_name = cat.name if cat else "Others"
        share = cat_total / total_spent
        category_predictions[cat_name] = round(next_month_prediction * share, 2)

    return {
        "predicted_monthly": round(next_month_prediction, 2),
        "predicted_yearly": round(next_month_prediction * 12, 2),
        "category_predictions": category_predictions,
        "confidence_percentage": confidence,
        "currency": pref_currency,
        "pacing_current_month": round(pacing_current_month, 2),
        "current_month_spent": round(current_month_spent, 2)
    }
