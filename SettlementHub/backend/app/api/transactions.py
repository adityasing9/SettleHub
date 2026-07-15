from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User, Transaction, Person, ExchangeRate, ExpenseCategory, TransactionVersion, FraudLog
from app.schemas.schemas import TransactionCreate, TransactionUpdate, TransactionResponse, TransactionVersionResponse, FraudLogResponse
from app.repositories.repos import transaction_repo, people_repo
from app.services.fraud_service import run_fraud_checks
from datetime import datetime

router = APIRouter(prefix="/transactions", tags=["Transactions"])

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

def format_tx_response(db: Session, tx: Transaction) -> TransactionResponse:
    from_p = db.query(Person).filter(Person.id == tx.from_person_id).first()
    to_p = db.query(Person).filter(Person.id == tx.to_person_id).first()
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == tx.category_id).first() if tx.category_id else None
    
    return TransactionResponse(
        id=tx.id,
        from_person_id=tx.from_person_id,
        from_person_name=from_p.name if from_p else "Unknown",
        to_person_id=tx.to_person_id,
        to_person_name=to_p.name if to_p else "Unknown",
        amount=tx.amount,
        currency=tx.currency,
        exchange_rate=tx.exchange_rate,
        description=tx.description,
        category_id=tx.category_id,
        category_name=cat.name if cat else None,
        receipt_id=tx.receipt_id,
        payment_method=tx.payment_method,
        location=tx.location,
        notes=tx.notes,
        transaction_type=tx.transaction_type,
        created_by_user_id=tx.created_by_user_id,
        date=tx.date,
        status=tx.status,
        undo_of_transaction_id=tx.undo_of_transaction_id,
        created_at=tx.created_at
    )

@router.get("/", response_model=List[TransactionResponse])
def read_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    txs = transaction_repo.get_by_user(db, current_user.id)
    return [format_tx_response(db, tx) for tx in txs]

@router.get("/fraud/logs", response_model=List[FraudLogResponse])
def read_fraud_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(FraudLog).filter(
        FraudLog.user_id == current_user.id,
        FraudLog.is_dismissed == False
    ).order_by(FraudLog.created_at.desc()).all()

@router.post("/fraud/logs/{log_id}/dismiss")
def dismiss_fraud_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = db.query(FraudLog).filter(
        FraudLog.id == log_id,
        FraudLog.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    log.is_dismissed = True
    db.commit()
    return {"message": "Fraud log dismissed"}

@router.post("/", response_model=TransactionResponse)
def create_transaction(
    tx_in: TransactionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from_p = people_repo.get(db, tx_in.from_person_id)
    to_p = people_repo.get(db, tx_in.to_person_id)
    if not from_p or from_p.user_id != current_user.id or not to_p or to_p.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Invalid person IDs")
        
    pref_currency = "INR"
    if current_user.preferences:
        pref_currency = current_user.preferences.default_currency
        
    exchange_rate = get_exchange_rate(db, tx_in.currency, pref_currency)
    
    obj_data = tx_in.dict()
    obj_data["created_by_user_id"] = current_user.id
    obj_data["exchange_rate"] = exchange_rate
    if not obj_data.get("date"):
        obj_data["date"] = datetime.utcnow()
        
    db_tx = transaction_repo.create(
        db,
        obj_in=obj_data,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    # Run Fraud Checks
    run_fraud_checks(db, db_tx)
    
    return format_tx_response(db, db_tx)

@router.get("/{transaction_id}/versions", response_model=List[TransactionVersionResponse])
def get_transaction_versions(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = transaction_repo.get(db, transaction_id)
    if not tx or tx.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    return db.query(TransactionVersion).filter(
        TransactionVersion.transaction_id == transaction_id
    ).order_by(TransactionVersion.version_number.desc()).all()

@router.post("/{transaction_id}/versions/{version_number}/restore", response_model=TransactionResponse)
def restore_transaction_version(
    transaction_id: int,
    version_number: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = transaction_repo.get(db, transaction_id)
    if not tx or tx.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    version = db.query(TransactionVersion).filter(
        TransactionVersion.transaction_id == transaction_id,
        TransactionVersion.version_number == version_number
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Specified transaction version not found")
        
    # Parse snapshot data
    data = json.loads(version.snapshot_json)
    
    # Save a version of the CURRENT state before rolling back
    curr_version_count = db.query(TransactionVersion).filter(
        TransactionVersion.transaction_id == tx.id
    ).count()
    
    curr_snapshot = {
        "from_person_id": tx.from_person_id,
        "to_person_id": tx.to_person_id,
        "amount": tx.amount,
        "currency": tx.currency,
        "exchange_rate": tx.exchange_rate,
        "description": tx.description,
        "category_id": tx.category_id,
        "payment_method": tx.payment_method,
        "location": tx.location,
        "notes": tx.notes,
        "transaction_type": tx.transaction_type,
        "date": tx.date.isoformat() if tx.date else None,
        "status": tx.status
    }
    
    rollback_log = TransactionVersion(
        transaction_id=tx.id,
        version_number=curr_version_count + 1,
        from_person_id=tx.from_person_id,
        to_person_id=tx.to_person_id,
        amount=tx.amount,
        currency=tx.currency,
        exchange_rate=tx.exchange_rate,
        description=tx.description,
        changed_by_user_id=current_user.id,
        change_reason=f"System Restore to Version {version_number}",
        ip_address=request.client.host if request.client else None,
        snapshot_json=json.dumps(curr_snapshot)
    )
    db.add(rollback_log)
    
    # Apply snapshot fields
    tx.from_person_id = data["from_person_id"]
    tx.to_person_id = data["to_person_id"]
    tx.amount = data["amount"]
    tx.currency = data["currency"]
    tx.exchange_rate = data["exchange_rate"]
    tx.description = data["description"]
    tx.category_id = data["category_id"]
    tx.payment_method = data["payment_method"]
    tx.location = data["location"]
    tx.notes = data["notes"]
    tx.transaction_type = data["transaction_type"]
    if data["date"]:
        tx.date = datetime.fromisoformat(data["date"])
    tx.status = data["status"]
    
    db.commit()
    db.refresh(tx)
    
    return format_tx_response(db, tx)

@router.get("/{transaction_id}", response_model=TransactionResponse)
def read_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = transaction_repo.get(db, transaction_id)
    if not tx or tx.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return format_tx_response(db, tx)

@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    tx_in: TransactionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = transaction_repo.get(db, transaction_id)
    if not tx or tx.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # 1. Save snapshot of old state to version log
    version_count = db.query(TransactionVersion).filter(
        TransactionVersion.transaction_id == tx.id
    ).count()
    
    snapshot = {
        "from_person_id": tx.from_person_id,
        "to_person_id": tx.to_person_id,
        "amount": tx.amount,
        "currency": tx.currency,
        "exchange_rate": tx.exchange_rate,
        "description": tx.description,
        "category_id": tx.category_id,
        "payment_method": tx.payment_method,
        "location": tx.location,
        "notes": tx.notes,
        "transaction_type": tx.transaction_type,
        "date": tx.date.isoformat() if tx.date else None,
        "status": tx.status
    }
    
    version_entry = TransactionVersion(
        transaction_id=tx.id,
        version_number=version_count + 1,
        from_person_id=tx.from_person_id,
        to_person_id=tx.to_person_id,
        amount=tx.amount,
        currency=tx.currency,
        exchange_rate=tx.exchange_rate,
        description=tx.description,
        changed_by_user_id=current_user.id,
        change_reason=tx_in.change_reason or "Update details",
        ip_address=request.client.host if request.client else None,
        snapshot_json=json.dumps(snapshot)
    )
    db.add(version_entry)
    db.commit()
    
    # 2. Update the transaction
    updated_tx = transaction_repo.update(
        db,
        db_obj=tx,
        obj_in=tx_in,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    # 3. Run Fraud Detection checks on updated state
    run_fraud_checks(db, updated_tx)
    
    return format_tx_response(db, updated_tx)

@router.delete("/{transaction_id}", response_model=TransactionResponse)
def delete_transaction(
    transaction_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = transaction_repo.get(db, transaction_id)
    if not tx or tx.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    removed_tx = transaction_repo.remove(
        db,
        id=transaction_id,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return format_tx_response(db, removed_tx)

@router.post("/{transaction_id}/undo", response_model=TransactionResponse)
def undo_transaction(
    transaction_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx = transaction_repo.get(db, transaction_id)
    if not tx or tx.created_by_user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.undo_of_transaction_id is not None:
        raise HTTPException(status_code=400, detail="Transaction is already an undo action")
        
    already_undone = db.query(Transaction).filter(
        Transaction.undo_of_transaction_id == tx.id,
        Transaction.is_deleted == False
    ).first()
    if already_undone:
        raise HTTPException(status_code=400, detail="Transaction has already been undone")
        
    reverse_tx = Transaction(
        from_person_id=tx.to_person_id,
        to_person_id=tx.from_person_id,
        amount=tx.amount,
        currency=tx.currency,
        exchange_rate=tx.exchange_rate,
        description=f"Undo of: {tx.description}",
        category_id=tx.category_id,
        payment_method=tx.payment_method,
        location=tx.location,
        notes=f"Reversed transaction ID {tx.id}",
        transaction_type="adjustment",
        created_by_user_id=current_user.id,
        date=datetime.utcnow(),
        status="completed",
        undo_of_transaction_id=tx.id
    )
    db.add(reverse_tx)
    db.commit()
    db.refresh(reverse_tx)
    
    transaction_repo._log_audit(
        db,
        action="UNDO",
        record_id=tx.id,
        old_values={"status": tx.status},
        new_values={"undo_of_transaction_id": reverse_tx.id},
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    return format_tx_response(db, reverse_tx)
