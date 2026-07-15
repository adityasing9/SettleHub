from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User, Settlement, Transaction, Person, ExchangeRate, SuggestedSettlement
from app.schemas.schemas import SettlementCreate, SettlementResponse, SuggestedSettlementResponse
from app.repositories.repos import settlement_repo, transaction_repo, people_repo
from app.services.settlement_engine import calculate_net_balances, minimize_payments, get_detailed_optimization_flow
from datetime import datetime

router = APIRouter(prefix="/settlements", tags=["Settlements"])

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

def format_settlement_response(db: Session, s: Settlement) -> SettlementResponse:
    from_p = db.query(Person).filter(Person.id == s.from_person_id).first()
    to_p = db.query(Person).filter(Person.id == s.to_person_id).first()
    return SettlementResponse(
        id=s.id,
        from_person_id=s.from_person_id,
        from_person_name=from_p.name if from_p else "Unknown",
        to_person_id=s.to_person_id,
        to_person_name=to_p.name if to_p else "Unknown",
        amount=s.amount,
        currency=s.currency,
        payment_method=s.payment_method,
        status=s.status,
        transaction_id=s.transaction_id,
        created_at=s.created_at
    )

def refresh_db_suggestions(db: Session, user_id: int, group_id: Optional[int] = None):
    # Calculate suggestions from optimization engine
    flow = get_detailed_optimization_flow(db, user_id, group_id)
    
    # Fetch existing pending suggestions
    existing = db.query(SuggestedSettlement).filter(
        SuggestedSettlement.user_id == user_id,
        SuggestedSettlement.group_id == group_id,
        SuggestedSettlement.status == "pending"
    ).all()
    
    # Delete pending suggestions (to replace with fresh engine output)
    for ex in existing:
        db.delete(ex)
    db.commit()
    
    # Save new pending suggestions
    for p in flow["optimized_payments"]:
        db_s = SuggestedSettlement(
            user_id=user_id,
            group_id=group_id,
            from_person_id=p["from_person_id"],
            to_person_id=p["to_person_id"],
            amount=p["amount"],
            currency=p["currency"],
            status="pending",
            explanation=p["explanation"]
        )
        db.add(db_s)
    db.commit()

@router.get("/", response_model=List[SettlementResponse])
def read_settlements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settlements = settlement_repo.get_by_user(db, current_user.id)
    return [format_settlement_response(db, s) for s in settlements]

@router.post("/", response_model=SettlementResponse)
def create_settlement(
    settlement_in: SettlementCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from_p = people_repo.get(db, settlement_in.from_person_id)
    to_p = people_repo.get(db, settlement_in.to_person_id)
    if not from_p or from_p.user_id != current_user.id or not to_p or to_p.user_id != current_user.id:
        raise HTTPException(status_code=400, detail="Invalid person IDs")
        
    pref_currency = "INR"
    if current_user.preferences:
        pref_currency = current_user.preferences.default_currency
        
    rate = get_exchange_rate(db, settlement_in.currency, pref_currency)
    
    tx = Transaction(
        from_person_id=settlement_in.from_person_id,
        to_person_id=settlement_in.to_person_id,
        amount=settlement_in.amount,
        currency=settlement_in.currency,
        exchange_rate=rate,
        description=f"Settlement: {from_p.name} paid {to_p.name}",
        payment_method=settlement_in.payment_method,
        transaction_type="settlement",
        created_by_user_id=current_user.id,
        date=datetime.utcnow(),
        status="completed"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    
    obj_data = settlement_in.dict()
    obj_data["transaction_id"] = tx.id
    obj_data["status"] = "completed"
    
    db_s = settlement_repo.create(
        db,
        obj_in=obj_data,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return format_settlement_response(db, db_s)

@router.get("/calculate")
def get_optimized_settlements(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    people = people_repo.get_by_user(db, current_user.id)
    people_map = {p.id: p.name for p in people}
    
    pref_currency = "INR"
    if current_user.preferences:
        pref_currency = current_user.preferences.default_currency
        
    balances = calculate_net_balances(db, current_user.id, group_id=group_id)
    suggested = minimize_payments(balances, people_map, currency=pref_currency)
    return {
        "balances": [{
            "person_id": pid,
            "person_name": people_map.get(pid, "Unknown"),
            "net_balance": round(bal, 2)
        } for pid, bal in balances.items() if round(bal, 2) != 0],
        "suggested_payments": suggested,
        "currency": pref_currency
    }

@router.get("/calculate-flow")
def get_optimization_flow_endpoint(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Sync database with fresh suggestions first
    refresh_db_suggestions(db, current_user.id, group_id)
    return get_detailed_optimization_flow(db, current_user.id, group_id)

@router.get("/suggestions", response_model=List[SuggestedSettlementResponse])
def get_db_suggestions(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SuggestedSettlement).filter(
        SuggestedSettlement.user_id == current_user.id
    )
    if group_id:
        query = query.filter(SuggestedSettlement.group_id == group_id)
    else:
        query = query.filter(SuggestedSettlement.group_id == None)
        
    suggestions = query.all()
    res = []
    for s in suggestions:
        from_p = db.query(Person).filter(Person.id == s.from_person_id).first()
        to_p = db.query(Person).filter(Person.id == s.to_person_id).first()
        res.append(SuggestedSettlementResponse(
            id=s.id,
            user_id=s.user_id,
            group_id=s.group_id,
            from_person_id=s.from_person_id,
            from_person_name=from_p.name if from_p else "Unknown",
            to_person_id=s.to_person_id,
            to_person_name=to_p.name if to_p else "Unknown",
            amount=s.amount,
            currency=s.currency,
            status=s.status,
            explanation=s.explanation,
            created_at=s.created_at
        ))
    return res

@router.post("/suggestions/{id}/action")
def action_suggestion(
    id: int,
    action: str, # accept, reject
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    suggestion = db.query(SuggestedSettlement).filter(
        SuggestedSettlement.id == id,
        SuggestedSettlement.user_id == current_user.id
    ).first()
    
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
        
    if suggestion.status != "pending":
        raise HTTPException(status_code=400, detail=f"Suggestion is already {suggestion.status}")
        
    if action == "reject":
        suggestion.status = "rejected"
        db.commit()
        return {"message": "Suggestion rejected successfully"}
        
    elif action == "accept":
        # 1. Create settlement & matching transaction
        from_p = people_repo.get(db, suggestion.from_person_id)
        to_p = people_repo.get(db, suggestion.to_person_id)
        if not from_p or not to_p:
            raise HTTPException(status_code=400, detail="Invalid person IDs associated with suggestion")
            
        rate = get_exchange_rate(db, suggestion.currency, suggestion.currency)
        
        tx = Transaction(
            from_person_id=suggestion.from_person_id,
            to_person_id=suggestion.to_person_id,
            amount=suggestion.amount,
            currency=suggestion.currency,
            exchange_rate=rate,
            description=f"Accepted Settlement Suggestion: {from_p.name} paid {to_p.name}",
            payment_method="cash",
            transaction_type="settlement",
            created_by_user_id=current_user.id,
            date=datetime.utcnow(),
            status="completed"
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
        
        # Link to settlement table
        settle_in = SettlementCreate(
            from_person_id=suggestion.from_person_id,
            to_person_id=suggestion.to_person_id,
            amount=suggestion.amount,
            currency=suggestion.currency,
            payment_method="cash"
        )
        obj_data = settle_in.dict()
        obj_data["transaction_id"] = tx.id
        obj_data["status"] = "completed"
        
        settlement_repo.create(
            db,
            obj_in=obj_data,
            user_id=current_user.id,
            ip_address=request.client.host if request.client else None
        )
        
        suggestion.status = "accepted"
        db.commit()
        return {"message": "Suggestion accepted and settlement logged successfully"}
        
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'accept' or 'reject'.")
