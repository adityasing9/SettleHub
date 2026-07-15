from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.session import get_db, Base
from app.core.security import get_current_user
from app.models.models import User, UserPreference, Currency, ExchangeRate, Person, Group, GroupMember, Expense, ExpenseSplit, Transaction, Settlement
from app.schemas.schemas import UserPreferenceUpdate, UserPreferenceResponse, CurrencyResponse
import json

router = APIRouter(prefix="/settings", tags=["Settings & Preferences"])

@router.get("/preferences", response_model=UserPreferenceResponse)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.preferences:
        # Create default preferences if missing
        prefs = UserPreference(
            user_id=current_user.id,
            theme="dark",
            default_currency="INR",
            language="en"
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
        current_user.preferences = prefs
        
    return current_user.preferences

@router.put("/preferences", response_model=UserPreferenceResponse)
def update_preferences(
    prefs_in: UserPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    prefs = current_user.preferences
    if not prefs:
        prefs = UserPreference(user_id=current_user.id)
        db.add(prefs)
        
    for k, v in prefs_in.dict(exclude_unset=True).items():
        setattr(prefs, k, v)
        
    db.commit()
    db.refresh(prefs)
    return prefs

@router.get("/currencies", response_model=List[CurrencyResponse])
def get_currencies(db: Session = Depends(get_db)):
    return db.query(Currency).all()

# --- BACKUP & RESTORE ---
@router.post("/backup/export")
def export_backup_json(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only permit Admins to export database state
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admin can export full database backups")
        
    # Serialize all active database records
    data = {
        "users": [
            {"id": u.id, "username": u.username, "email": u.email, "hashed_password": u.hashed_password, "role": u.role}
            for u in db.query(User).filter(User.is_deleted == False).all()
        ],
        "people": [
            {"id": p.id, "name": p.name, "email": p.email, "phone": p.phone, "user_id": p.user_id, "status": p.status}
            for p in db.query(Person).filter(Person.is_deleted == False).all()
        ],
        "groups": [
            {"id": g.id, "name": g.name, "description": g.description, "created_by_user_id": g.created_by_user_id, "group_type": g.group_type}
            for g in db.query(Group).filter(Group.is_deleted == False).all()
        ],
        "group_members": [
            {"id": m.id, "group_id": m.group_id, "person_id": m.person_id}
            for m in db.query(GroupMember).filter(GroupMember.is_deleted == False).all()
        ],
        "expenses": [
            {"id": e.id, "amount": e.amount, "currency": e.currency, "description": e.description, "category_id": e.category_id, "merchant": e.merchant, "location": e.location, "payment_method": e.payment_method, "notes": e.notes, "user_id": e.user_id, "group_id": e.group_id}
            for e in db.query(Expense).filter(Expense.is_deleted == False).all()
        ],
        "expense_splits": [
            {"id": s.id, "expense_id": s.expense_id, "person_id": s.person_id, "share_amount": s.share_amount, "share_percent": s.share_percent, "owe_amount": s.owe_amount}
            for s in db.query(ExpenseSplit).filter(ExpenseSplit.is_deleted == False).all()
        ],
        "transactions": [
            {
                "id": t.id, "from_person_id": t.from_person_id, "to_person_id": t.to_person_id,
                "amount": t.amount, "currency": t.currency, "exchange_rate": t.exchange_rate,
                "description": t.description, "category_id": t.category_id, "payment_method": t.payment_method,
                "location": t.location, "notes": t.notes, "transaction_type": t.transaction_type,
                "created_by_user_id": t.created_by_user_id, "date": t.date.isoformat() if t.date else None,
                "status": t.status, "undo_of_transaction_id": t.undo_of_transaction_id
            }
            for t in db.query(Transaction).filter(Transaction.is_deleted == False).all()
        ]
    }
    return data

@router.post("/backup/import")
def import_backup_json(
    backup_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only admin can import full database backups")
        
    try:
        # Import Users (avoid duplicate usernames/emails)
        for u_data in backup_data.get("users", []):
            exists = db.query(User).filter(User.id == u_data["id"]).first()
            if not exists:
                user = User(
                    id=u_data["id"],
                    username=u_data["username"],
                    email=u_data["email"],
                    hashed_password=u_data["hashed_password"],
                    role=u_data["role"]
                )
                db.add(user)
        db.commit()
        
        # Import People
        for p_data in backup_data.get("people", []):
            exists = db.query(Person).filter(Person.id == p_data["id"]).first()
            if not exists:
                person = Person(
                    id=p_data["id"],
                    name=p_data["name"],
                    email=p_data["email"],
                    phone=p_data["phone"],
                    user_id=p_data["user_id"],
                    status=p_data["status"]
                )
                db.add(person)
        db.commit()

        # Import Groups
        for g_data in backup_data.get("groups", []):
            exists = db.query(Group).filter(Group.id == g_data["id"]).first()
            if not exists:
                group = Group(
                    id=g_data["id"],
                    name=g_data["name"],
                    description=g_data["description"],
                    created_by_user_id=g_data["created_by_user_id"],
                    group_type=g_data["group_type"]
                )
                db.add(group)
        db.commit()
        
        # Import Group Members
        for m_data in backup_data.get("group_members", []):
            exists = db.query(GroupMember).filter(GroupMember.id == m_data["id"]).first()
            if not exists:
                member = GroupMember(
                    id=m_data["id"],
                    group_id=m_data["group_id"],
                    person_id=m_data["person_id"]
                )
                db.add(member)
        db.commit()

        # Import Expenses
        for e_data in backup_data.get("expenses", []):
            exists = db.query(Expense).filter(Expense.id == e_data["id"]).first()
            if not exists:
                expense = Expense(
                    id=e_data["id"],
                    amount=e_data["amount"],
                    currency=e_data["currency"],
                    description=e_data["description"],
                    category_id=e_data["category_id"],
                    merchant=e_data["merchant"],
                    location=e_data["location"],
                    payment_method=e_data["payment_method"],
                    notes=e_data["notes"],
                    user_id=e_data["user_id"],
                    group_id=e_data["group_id"]
                )
                db.add(expense)
        db.commit()
        
        # Import Expense Splits
        for s_data in backup_data.get("expense_splits", []):
            exists = db.query(ExpenseSplit).filter(ExpenseSplit.id == s_data["id"]).first()
            if not exists:
                split = ExpenseSplit(
                    id=s_data["id"],
                    expense_id=s_data["expense_id"],
                    person_id=s_data["person_id"],
                    share_amount=s_data["share_amount"],
                    share_percent=s_data["share_percent"],
                    owe_amount=s_data["owe_amount"]
                )
                db.add(split)
        db.commit()

        # Import Transactions
        for t_data in backup_data.get("transactions", []):
            exists = db.query(Transaction).filter(Transaction.id == t_data["id"]).first()
            if not exists:
                date_val = datetime.fromisoformat(t_data["date"]) if t_data.get("date") else datetime.utcnow()
                tx = Transaction(
                    id=t_data["id"],
                    from_person_id=t_data["from_person_id"],
                    to_person_id=t_data["to_person_id"],
                    amount=t_data["amount"],
                    currency=t_data["currency"],
                    exchange_rate=t_data["exchange_rate"],
                    description=t_data["description"],
                    category_id=t_data["category_id"],
                    payment_method=t_data["payment_method"],
                    location=t_data["location"],
                    notes=t_data["notes"],
                    transaction_type=t_data["transaction_type"],
                    created_by_user_id=t_data["created_by_user_id"],
                    date=date_val,
                    status=t_data["status"],
                    undo_of_transaction_id=t_data["undo_of_transaction_id"]
                )
                db.add(tx)
        db.commit()
        
        return {"detail": "Database restored successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to restore database backup. Error: {e}")

# --- SECURITY CENTER ---
from app.models.models import Session as DbSession, SecurityLog

@router.get("/security/logs")
def get_security_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(SecurityLog).filter(
        SecurityLog.user_id == current_user.id
    ).order_by(SecurityLog.created_at.desc()).limit(50).all()

@router.get("/security/sessions")
def get_security_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(DbSession).filter(
        DbSession.user_id == current_user.id,
        DbSession.is_active == True
    ).all()

@router.post("/security/sessions/{session_id}/revoke")
def revoke_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sess = db.query(DbSession).filter(
        DbSession.id == session_id,
        DbSession.user_id == current_user.id
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    sess.is_active = False
    db.commit()
    return {"message": "Session revoked successfully"}

@router.post("/security/pin")
def setup_pin(
    pin: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if len(pin) != 4 or not pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be a 4-digit number")
        
    prefs = current_user.preferences
    if not prefs:
        prefs = UserPreference(user_id=current_user.id)
        db.add(prefs)
        
    settings_dict = {}
    if prefs.notification_settings:
        try:
            settings_dict = json.loads(prefs.notification_settings)
        except:
            pass
            
    settings_dict["security_pin"] = pin
    prefs.notification_settings = json.dumps(settings_dict)
    
    # Log event
    log = SecurityLog(
        user_id=current_user.id,
        event_type="pin_lock",
        details="Quick 4-digit security PIN lock updated"
    )
    db.add(log)
    db.commit()
    return {"message": "Security PIN updated successfully"}

# --- NOTIFICATION CENTER ---
from app.models.models import Notification

@router.get("/notifications")
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.sent_at.desc()).limit(30).all()

@router.post("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    n = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}
