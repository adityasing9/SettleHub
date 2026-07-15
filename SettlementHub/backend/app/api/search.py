from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List, Dict, Any, Optional
import re
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User, Person, Transaction, Expense, Group, Receipt, AuditLog, ExpenseTag
from app.schemas.schemas import PersonResponse, TransactionResponse, ExpenseResponse, GroupResponse, ReceiptResponse, AuditLogResponse

router = APIRouter(prefix="/search", tags=["Smart Search"])

@router.get("/")
def perform_smart_search(
    q: str = Query(..., description="Google-like search query"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Scans contact names, transaction logs, groups, expenses, and audit logs.
    Supports operators like 'above 5000', 'borrowed', or 'pending'.
    """
    q_lower = q.lower()
    
    # 1. Parse amount criteria (e.g. above 5000)
    above_amt = None
    below_amt = None
    match_above = re.search(r"above\s*(\d+)", q_lower)
    if match_above:
        above_amt = float(match_above.group(1))
    match_below = re.search(r"below\s*(\d+)", q_lower)
    if match_below:
        below_amt = float(match_below.group(1))
        
    # Remove amount keywords to not pollute general search
    clean_q = re.sub(r"(above|below)\s*\d+", "", q_lower).strip()
    words = clean_q.split() if clean_q else []

    # Initialize results dict
    results = {
        "people": [],
        "transactions": [],
        "expenses": [],
        "groups": [],
        "receipts": [],
        "audit_logs": []
    }

    # -- SEARCH PEOPLE --
    people_query = db.query(Person).filter(
        Person.user_id == current_user.id,
        Person.is_deleted == False
    )
    if words:
        people_clauses = []
        for w in words:
            people_clauses.append(Person.name.ilike(f"%{w}%"))
            people_clauses.append(Person.email.ilike(f"%{w}%"))
            people_clauses.append(Person.phone.ilike(f"%{w}%"))
        people_query = people_query.filter(or_(*people_clauses))
    
    results["people"] = [
        {"id": p.id, "name": p.name, "email": p.email, "phone": p.phone, "status": p.status}
        for p in people_query.limit(20).all()
    ]

    # -- SEARCH TRANSACTIONS --
    tx_query = db.query(Transaction).filter(
        Transaction.created_by_user_id == current_user.id,
        Transaction.is_deleted == False
    )
    if above_amt is not None:
        tx_query = tx_query.filter(Transaction.amount > above_amt)
    if below_amt is not None:
        tx_query = tx_query.filter(Transaction.amount < below_amt)
        
    # Check type matches (e.g. borrowed, lent, settlement)
    if "borrow" in q_lower or "borrowed" in q_lower:
        tx_query = tx_query.filter(Transaction.transaction_type == "borrow")
    elif "return" in q_lower or "returned" in q_lower:
        tx_query = tx_query.filter(Transaction.transaction_type == "return")
    elif "settle" in q_lower or "settlement" in q_lower:
        tx_query = tx_query.filter(Transaction.transaction_type == "settlement")
        
    if words:
        tx_clauses = []
        for w in words:
            if w not in ["borrow", "borrowed", "return", "returned", "settle", "settlement"]:
                tx_clauses.append(Transaction.description.ilike(f"%{w}%"))
                tx_clauses.append(Transaction.notes.ilike(f"%{w}%"))
                tx_clauses.append(Transaction.location.ilike(f"%{w}%"))
        if tx_clauses:
            tx_query = tx_query.filter(or_(*tx_clauses))
            
    # Resolve names
    people_map = {p.id: p.name for p in db.query(Person).filter(Person.user_id == current_user.id).all()}
    for tx in tx_query.order_by(desc(Transaction.date)).limit(30).all():
        results["transactions"].append({
            "id": tx.id,
            "from_person_name": people_map.get(tx.from_person_id, "You" if tx.from_person_id == 1 else "Unknown"),
            "to_person_name": people_map.get(tx.to_person_id, "You" if tx.to_person_id == 1 else "Unknown"),
            "amount": tx.amount,
            "currency": tx.currency,
            "description": tx.description,
            "transaction_type": tx.transaction_type,
            "date": tx.date.strftime("%Y-%m-%d"),
            "status": tx.status
        })

    # -- SEARCH EXPENSES --
    exp_query = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.is_deleted == False
    )
    if above_amt is not None:
        exp_query = exp_query.filter(Expense.amount > above_amt)
    if below_amt is not None:
        exp_query = exp_query.filter(Expense.amount < below_amt)
        
    if words:
        exp_clauses = []
        for w in words:
            exp_clauses.append(Expense.description.ilike(f"%{w}%"))
            exp_clauses.append(Expense.notes.ilike(f"%{w}%"))
            exp_clauses.append(Expense.merchant.ilike(f"%{w}%"))
            exp_clauses.append(Expense.location.ilike(f"%{w}%"))
        if exp_clauses:
            exp_query = exp_query.filter(or_(*exp_clauses))
            
    for e in exp_query.order_by(desc(Expense.created_at)).limit(30).all():
        results["expenses"].append({
            "id": e.id,
            "description": e.description,
            "amount": e.amount,
            "currency": e.currency,
            "merchant": e.merchant,
            "date": e.created_at.strftime("%Y-%m-%d")
        })

    # -- SEARCH GROUPS --
    grp_query = db.query(Group).filter(
        Group.created_by_user_id == current_user.id,
        Group.is_deleted == False
    )
    if words:
        grp_clauses = []
        for w in words:
            grp_clauses.append(Group.name.ilike(f"%{w}%"))
            grp_clauses.append(Group.description.ilike(f"%{w}%"))
        grp_query = grp_query.filter(or_(*grp_clauses))
        
    for g in grp_query.limit(10).all():
        results["groups"].append({
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "group_type": g.group_type
        })

    # -- SEARCH AUDIT LOGS --
    audit_query = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.is_deleted == False
    )
    if words:
        audit_clauses = []
        for w in words:
            audit_clauses.append(AuditLog.action.ilike(f"%{w}%"))
            audit_clauses.append(AuditLog.table_name.ilike(f"%{w}%"))
        audit_query = audit_query.filter(or_(*audit_clauses))
        
    for a in audit_query.order_by(desc(AuditLog.created_at)).limit(20).all():
        results["audit_logs"].append({
            "id": a.id,
            "action": a.action,
            "table_name": a.table_name,
            "record_id": a.record_id,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })

    # -- SEARCH RECEIPTS --
    rec_query = db.query(Receipt).join(Transaction, Transaction.receipt_id == Receipt.id).filter(
        Transaction.created_by_user_id == current_user.id,
        Receipt.is_deleted == False
    )
    if words:
        rec_clauses = []
        for w in words:
            rec_clauses.append(Receipt.file_name.ilike(f"%{w}%"))
        rec_query = rec_query.filter(or_(*rec_clauses))
        
    for r in rec_query.limit(15).all():
        results["receipts"].append({
            "id": r.id,
            "file_name": r.file_name,
            "file_size": r.file_size,
            "mime_type": r.mime_type
        })

    return results
