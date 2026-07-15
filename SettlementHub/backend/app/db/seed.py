from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.models import (
    Currency, ExchangeRate, ExpenseCategory, ExpenseTag, User, UserPreference,
    TransactionVersion, Budget, FraudLog, SuggestedSettlement, SecurityLog
)
from app.core.security import get_password_hash
from datetime import datetime

def seed_db(db: Session):
    # 1. Create Tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed Currencies
    currencies = [
        {"code": "INR", "symbol": "₹", "name": "Indian Rupee"},
        {"code": "USD", "symbol": "$", "name": "US Dollar"},
        {"code": "EUR", "symbol": "€", "name": "Euro"},
        {"code": "GBP", "symbol": "£", "name": "British Pound"},
        {"code": "AED", "symbol": "د.إ", "name": "UAE Dirham"},
        {"code": "JPY", "symbol": "¥", "name": "Japanese Yen"},
    ]
    for cur in currencies:
        exists = db.query(Currency).filter(Currency.code == cur["code"]).first()
        if not exists:
            db.add(Currency(**cur))
    db.commit()

    # 3. Seed Exchange Rates (relative to USD)
    rates = [
        {"base_currency": "USD", "target_currency": "INR", "rate": 83.50},
        {"base_currency": "USD", "target_currency": "EUR", "rate": 0.92},
        {"base_currency": "USD", "target_currency": "GBP", "rate": 0.78},
        {"base_currency": "USD", "target_currency": "AED", "rate": 3.67},
        {"base_currency": "USD", "target_currency": "JPY", "rate": 158.50},
        
        {"base_currency": "INR", "target_currency": "USD", "rate": 1 / 83.50},
        {"base_currency": "EUR", "target_currency": "USD", "rate": 1 / 0.92},
        {"base_currency": "GBP", "target_currency": "USD", "rate": 1 / 0.78},
        {"base_currency": "AED", "target_currency": "USD", "rate": 1 / 3.67},
        {"base_currency": "JPY", "target_currency": "USD", "rate": 1 / 158.50},
        
        # Self rates
        {"base_currency": "INR", "target_currency": "INR", "rate": 1.0},
        {"base_currency": "USD", "target_currency": "USD", "rate": 1.0},
        {"base_currency": "EUR", "target_currency": "EUR", "rate": 1.0},
        {"base_currency": "GBP", "target_currency": "GBP", "rate": 1.0},
        {"base_currency": "AED", "target_currency": "AED", "rate": 1.0},
        {"base_currency": "JPY", "target_currency": "JPY", "rate": 1.0},
    ]
    for rate in rates:
        exists = db.query(ExchangeRate).filter(
            ExchangeRate.base_currency == rate["base_currency"],
            ExchangeRate.target_currency == rate["target_currency"]
        ).first()
        if not exists:
            db.add(ExchangeRate(**rate))
    db.commit()

    # 4. Seed Expense Categories
    categories = [
        {"name": "Food", "icon": "utensils"},
        {"name": "Travel", "icon": "plane"},
        {"name": "Fuel", "icon": "fuel"},
        {"name": "Medical", "icon": "heart-pulse"},
        {"name": "Bills", "icon": "receipt"},
        {"name": "Shopping", "icon": "shopping-bag"},
        {"name": "Investment", "icon": "trending-up"},
        {"name": "Education", "icon": "graduation-cap"},
        {"name": "Entertainment", "icon": "film"},
        {"name": "Others", "icon": "help-circle"},
    ]
    for cat in categories:
        exists = db.query(ExpenseCategory).filter(ExpenseCategory.name == cat["name"]).first()
        if not exists:
            db.add(ExpenseCategory(**cat))
    db.commit()

    # 5. Seed Tags
    tags = ["Trip2026", "Office", "Rent", "Utilities", "Groceries", "Dinner"]
    for tag_name in tags:
        exists = db.query(ExpenseTag).filter(ExpenseTag.name == tag_name).first()
        if not exists:
            db.add(ExpenseTag(name=tag_name))
    db.commit()

    # 6. Seed Default Admin User
    admin_email = "admin@settlementhub.com"
    exists = db.query(User).filter(User.email == admin_email).first()
    if not exists:
        admin_pwd = get_password_hash("admin")
        admin = User(
            username="admin",
            email=admin_email,
            hashed_password=admin_pwd,
            role="Admin"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        # Preferences
        prefs = UserPreference(
            user_id=admin.id,
            theme="dark",
            default_currency="INR",
            language="en"
        )
        db.add(prefs)
        db.commit()
        print("Admin user and preferences successfully seeded!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_db(db)
        print("Database seeding completed.")
    finally:
        db.close()
