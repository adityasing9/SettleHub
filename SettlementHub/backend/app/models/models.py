from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Table, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

# Many-to-many relationship helper for Expense tags
expense_tag_association = Table(
    'expense_tag_mappings',
    Base.metadata,
    Column('expense_id', Integer, ForeignKey('expenses.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('expense_tags.id', ondelete='CASCADE'), primary_key=True)
)

class BaseMixin:
    """Base mixin to include standard columns in every table"""
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)

class User(Base, BaseMixin):
    __tablename__ = "users"
    
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="Member", nullable=False) # Admin, Member, Viewer
    
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    people = relationship("Person", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    activity_logs = relationship("ActivityLog", back_populates="user")

class UserPreference(Base, BaseMixin):
    __tablename__ = "user_preferences"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    theme = Column(String(10), default="dark", nullable=False) # light, dark
    default_currency = Column(String(3), default="INR", nullable=False)
    language = Column(String(5), default="en", nullable=False)
    date_format = Column(String(20), default="YYYY-MM-DD", nullable=False)
    number_format = Column(String(10), default="comma", nullable=False) # comma, indian
    notification_settings = Column(Text, nullable=True) # JSON string
    
    user = relationship("User", back_populates="preferences")

class Session(Base, BaseMixin):
    __tablename__ = "sessions"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    user = relationship("User", back_populates="sessions")

class Person(Base, BaseMixin):
    __tablename__ = "people"
    
    name = Column(String(100), nullable=False, index=True)
    email = Column(String(100), nullable=True, index=True)
    phone = Column(String(20), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="active", nullable=False) # active, archived
    
    user = relationship("User", back_populates="people")
    group_memberships = relationship("GroupMember", back_populates="person", cascade="all, delete-orphan")
    splits = relationship("ExpenseSplit", back_populates="person", cascade="all, delete-orphan")

class Group(Base, BaseMixin):
    __tablename__ = "groups"
    
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    group_type = Column(String(50), default="friends", nullable=False) # trip, office, roommates, friends, family, event
    
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="group", cascade="all, delete-orphan")

class GroupMember(Base, BaseMixin):
    __tablename__ = "group_members"
    
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False, index=True)
    
    group = relationship("Group", back_populates="members")
    person = relationship("Person", back_populates="group_memberships")

class ExpenseCategory(Base, BaseMixin):
    __tablename__ = "expense_categories"
    
    name = Column(String(50), unique=True, index=True, nullable=False)
    icon = Column(String(50), nullable=True)
    
    expenses = relationship("Expense", back_populates="category")

class ExpenseTag(Base, BaseMixin):
    __tablename__ = "expense_tags"
    
    name = Column(String(50), unique=True, index=True, nullable=False)
    
    expenses = relationship("Expense", secondary=expense_tag_association, back_populates="tags")

class Expense(Base, BaseMixin):
    __tablename__ = "expenses"
    
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    description = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id", ondelete="SET NULL"), nullable=True, index=True)
    merchant = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    payment_method = Column(String(50), default="cash", nullable=False) # cash, card, upi, netbanking
    notes = Column(Text, nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurring_interval = Column(String(50), nullable=True) # daily, weekly, monthly, yearly
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True, index=True)
    
    category = relationship("ExpenseCategory", back_populates="expenses")
    receipt = relationship("Receipt", back_populates="expenses")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")
    group = relationship("Group", back_populates="expenses")
    tags = relationship("ExpenseTag", secondary=expense_tag_association, back_populates="expenses")

class ExpenseSplit(Base, BaseMixin):
    __tablename__ = "expense_splits"
    
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False, index=True)
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False, index=True)
    share_amount = Column(Float, nullable=False)
    share_percent = Column(Float, nullable=False)
    owe_amount = Column(Float, nullable=False)
    
    expense = relationship("Expense", back_populates="splits")
    person = relationship("Person", back_populates="splits")

class Transaction(Base, BaseMixin):
    __tablename__ = "transactions"
    
    from_person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False, index=True)
    to_person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)
    exchange_rate = Column(Float, default=1.0, nullable=False)
    description = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_method = Column(String(50), nullable=True)
    location = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    transaction_type = Column(String(50), nullable=False) # borrow, return, settlement, adjustment, transfer, donation, loan
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    status = Column(String(20), default="completed", nullable=False) # pending, completed, failed
    undo_of_transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)
    
    from_person = relationship("Person", foreign_keys=[from_person_id])
    to_person = relationship("Person", foreign_keys=[to_person_id])
    category = relationship("ExpenseCategory")
    receipt = relationship("Receipt", back_populates="transactions")
    reminder_queues = relationship("ReminderQueue", back_populates="transaction", cascade="all, delete-orphan")

class Settlement(Base, BaseMixin):
    __tablename__ = "settlements"
    
    from_person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False, index=True)
    to_person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)
    payment_method = Column(String(50), nullable=False)
    status = Column(String(20), default="completed", nullable=False) # pending, completed
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    from_person = relationship("Person", foreign_keys=[from_person_id])
    to_person = relationship("Person", foreign_keys=[to_person_id])
    transaction = relationship("Transaction")

class Currency(Base, BaseMixin):
    __tablename__ = "currencies"
    
    code = Column(String(3), unique=True, index=True, nullable=False) # INR, USD, EUR, etc.
    symbol = Column(String(10), nullable=False)
    name = Column(String(50), nullable=False)

class ExchangeRate(Base, BaseMixin):
    __tablename__ = "exchange_rates"
    
    base_currency = Column(String(3), nullable=False, index=True)
    target_currency = Column(String(3), nullable=False, index=True)
    rate = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

class Receipt(Base, BaseMixin):
    __tablename__ = "receipts"
    
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    metadata_json = Column(Text, nullable=True) # OCR results JSON string
    
    expenses = relationship("Expense", back_populates="receipt")
    transactions = relationship("Transaction", back_populates="receipt")

class Notification(Base, BaseMixin):
    __tablename__ = "notifications"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False) # reminder, payment_due, recurring, system
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    user = relationship("User", back_populates="notifications")

class ReminderQueue(Base, BaseMixin):
    __tablename__ = "reminder_queues"
    
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    due_date = Column(DateTime, nullable=False, index=True)
    reminder_interval_days = Column(Integer, default=7, nullable=False)
    last_sent_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="pending", nullable=False) # pending, sent
    
    transaction = relationship("Transaction", back_populates="reminder_queues")

class AuditLog(Base, BaseMixin):
    __tablename__ = "audit_logs"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True) # create, edit, delete, login, logout, etc.
    table_name = Column(String(50), nullable=False, index=True)
    record_id = Column(Integer, nullable=False, index=True)
    old_values = Column(Text, nullable=True) # JSON string
    new_values = Column(Text, nullable=True) # JSON string
    ip_address = Column(String(45), nullable=True)
    
    user = relationship("User", back_populates="audit_logs")

class ActivityLog(Base, BaseMixin):
    __tablename__ = "activity_logs"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="activity_logs")

class RecurringTransaction(Base, BaseMixin):
    __tablename__ = "recurring_transactions"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_template_json = Column(Text, nullable=False) # JSON template
    cron_expression = Column(String(50), nullable=False)
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="active", nullable=False) # active, paused

class TransactionVersion(Base, BaseMixin):
    __tablename__ = "transaction_versions"
    
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    from_person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False)
    to_person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)
    exchange_rate = Column(Float, default=1.0, nullable=False)
    description = Column(String(255), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    change_reason = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    snapshot_json = Column(Text, nullable=False) # Full JSON data
    
    transaction = relationship("Transaction")
    changed_by_user = relationship("User")

class Budget(Base, BaseMixin):
    __tablename__ = "budgets"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    budget_type = Column(String(20), default="monthly", nullable=False) # weekly, monthly, yearly, category, group
    category_id = Column(Integer, ForeignKey("expense_categories.id", ondelete="SET NULL"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    spent_amount = Column(Float, default=0.0, nullable=False)
    
    user = relationship("User")
    category = relationship("ExpenseCategory")
    group = relationship("Group")

class FraudLog(Base, BaseMixin):
    __tablename__ = "fraud_logs"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False) # transaction, receipt, settlement
    entity_id = Column(Integer, nullable=False)
    fraud_score = Column(Float, default=0.0, nullable=False)
    reasons_json = Column(Text, nullable=False) # JSON array of strings
    is_dismissed = Column(Boolean, default=False, nullable=False, index=True)
    
    user = relationship("User")

class SuggestedSettlement(Base, BaseMixin):
    __tablename__ = "suggested_settlements"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    from_person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False)
    to_person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    status = Column(String(20), default="pending", nullable=False) # pending, accepted, rejected
    explanation = Column(Text, nullable=True)
    
    user = relationship("User")
    from_person = relationship("Person", foreign_keys=[from_person_id])
    to_person = relationship("Person", foreign_keys=[to_person_id])

class SecurityLog(Base, BaseMixin):
    __tablename__ = "security_logs"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True) # login_attempt, pin_lock, 2fa_enable, password_change, device_auth
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    
    user = relationship("User")
