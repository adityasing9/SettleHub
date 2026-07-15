from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class UserPreferenceUpdate(BaseModel):
    theme: Optional[str] = "dark"
    default_currency: Optional[str] = "INR"
    language: Optional[str] = "en"
    date_format: Optional[str] = "YYYY-MM-DD"
    number_format: Optional[str] = "comma"
    notification_settings: Optional[str] = None # JSON string

class UserPreferenceResponse(UserPreferenceUpdate):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# --- Person Schemas ---
class PersonBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = "active"

class PersonCreate(PersonBase):
    pass

class PersonUpdate(PersonBase):
    pass

class PersonResponse(PersonBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PersonSummary(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    total_borrowed: float = 0.0
    total_lent: float = 0.0
    current_balance: float = 0.0
    pending_amount: float = 0.0
    completed_settlements_count: int = 0
    status: str

# --- Group Schemas ---
class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    group_type: Optional[str] = "friends"

class GroupCreate(GroupBase):
    member_ids: List[int] = []

class GroupUpdate(GroupBase):
    member_ids: Optional[List[int]] = None

class GroupResponse(GroupBase):
    id: int
    created_by_user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class GroupDetailResponse(GroupResponse):
    members: List[PersonResponse] = []

    class Config:
        from_attributes = True

# --- Expense Schemas ---
class ExpenseSplitCreate(BaseModel):
    person_id: int
    share_amount: float
    share_percent: float
    owe_amount: float

class ExpenseSplitResponse(BaseModel):
    id: int
    person_id: int
    person_name: str
    share_amount: float
    share_percent: float
    owe_amount: float

    class Config:
        from_attributes = True

class ExpenseCreate(BaseModel):
    amount: float
    currency: Optional[str] = "INR"
    description: str
    category_id: int
    merchant: Optional[str] = None
    location: Optional[str] = None
    payment_method: Optional[str] = "cash"
    notes: Optional[str] = None
    is_recurring: Optional[bool] = False
    recurring_interval: Optional[str] = None
    group_id: Optional[int] = None
    splits: List[ExpenseSplitCreate]
    tags: Optional[List[str]] = []

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    merchant: Optional[str] = None
    location: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurring_interval: Optional[str] = None
    splits: Optional[List[ExpenseSplitCreate]] = None
    tags: Optional[List[str]] = None

class ExpenseResponse(BaseModel):
    id: int
    amount: float
    currency: str
    description: str
    category_id: int
    category_name: str
    receipt_id: Optional[int] = None
    merchant: Optional[str] = None
    location: Optional[str] = None
    payment_method: str
    notes: Optional[str] = None
    is_recurring: bool
    recurring_interval: Optional[str] = None
    user_id: int
    group_id: Optional[int] = None
    created_at: datetime
    splits: List[ExpenseSplitResponse] = []
    tags: List[str] = []

    class Config:
        from_attributes = True

# --- Transaction Schemas ---
class TransactionCreate(BaseModel):
    from_person_id: int
    to_person_id: int
    amount: float
    currency: str
    exchange_rate: Optional[float] = 1.0
    description: str
    category_id: Optional[int] = None
    payment_method: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    transaction_type: str # borrow, return, settlement, adjustment, transfer, donation, loan
    date: Optional[datetime] = None

class TransactionUpdate(BaseModel):
    from_person_id: Optional[int] = None
    to_person_id: Optional[int] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    payment_method: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    transaction_type: Optional[str] = None
    date: Optional[datetime] = None
    status: Optional[str] = None
    change_reason: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    from_person_id: int
    from_person_name: str
    to_person_id: int
    to_person_name: str
    amount: float
    currency: str
    exchange_rate: float
    description: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    receipt_id: Optional[int] = None
    payment_method: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    transaction_type: str
    created_by_user_id: int
    date: datetime
    status: str
    undo_of_transaction_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Settlement Schemas ---
class SettlementCreate(BaseModel):
    from_person_id: int
    to_person_id: int
    amount: float
    currency: str
    payment_method: str

class SettlementResponse(BaseModel):
    id: int
    from_person_id: int
    from_person_name: str
    to_person_id: int
    to_person_name: str
    amount: float
    currency: str
    payment_method: str
    status: str
    transaction_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Receipt Schemas ---
class ReceiptResponse(BaseModel):
    id: int
    file_name: str
    file_size: int
    mime_type: str
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- AuditLog Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    table_name: str
    record_id: int
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Currency & ExchangeRate Schemas ---
class CurrencyResponse(BaseModel):
    id: int
    code: str
    symbol: str
    name: str

    class Config:
        from_attributes = True

class ExchangeRateResponse(BaseModel):
    id: int
    base_currency: str
    target_currency: str
    rate: float
    date: datetime

    class Config:
        from_attributes = True

# --- Enterprise Schemas ---
class TransactionVersionResponse(BaseModel):
    id: int
    transaction_id: int
    version_number: int
    from_person_id: int
    to_person_id: int
    amount: float
    currency: str
    exchange_rate: float
    description: str
    changed_by_user_id: int
    change_reason: Optional[str] = None
    ip_address: Optional[str] = None
    snapshot_json: str
    created_at: datetime

    class Config:
        from_attributes = True

class BudgetCreate(BaseModel):
    name: str
    amount: float
    currency: Optional[str] = "INR"
    budget_type: str # weekly, monthly, yearly, category, group
    category_id: Optional[int] = None
    group_id: Optional[int] = None

class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    budget_type: Optional[str] = None
    category_id: Optional[int] = None
    group_id: Optional[int] = None

class BudgetResponse(BaseModel):
    id: int
    user_id: int
    name: str
    amount: float
    currency: str
    budget_type: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    group_id: Optional[int] = None
    group_name: Optional[str] = None
    spent_amount: float
    created_at: datetime

    class Config:
        from_attributes = True

class FraudLogResponse(BaseModel):
    id: int
    user_id: int
    entity_type: str
    entity_id: int
    fraud_score: float
    reasons_json: str
    is_dismissed: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SuggestedSettlementResponse(BaseModel):
    id: int
    user_id: int
    group_id: Optional[int] = None
    from_person_id: int
    from_person_name: str
    to_person_id: int
    to_person_name: str
    amount: float
    currency: str
    status: str
    explanation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SecurityLogResponse(BaseModel):
    id: int
    user_id: int
    event_type: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

