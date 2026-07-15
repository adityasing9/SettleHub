from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User, Person, Transaction, Settlement, Expense, ExpenseSplit, ExchangeRate
from app.schemas.schemas import PersonCreate, PersonUpdate, PersonResponse, PersonSummary
from app.repositories.repos import people_repo, transaction_repo
from sqlalchemy import or_, and_

router = APIRouter(prefix="/people", tags=["People"])

def get_self_person(db: Session, user: User) -> Person:
    self_person = db.query(Person).filter(
        Person.user_id == user.id,
        Person.email == user.email,
        Person.is_deleted == False
    ).first()
    
    if not self_person:
        self_person = db.query(Person).filter(
            Person.user_id == user.id,
            Person.name == "You",
            Person.is_deleted == False
        ).first()
        
    if not self_person:
        self_person = Person(
            name="You",
            email=user.email,
            user_id=user.id,
            status="active"
        )
        db.add(self_person)
        db.commit()
        db.refresh(self_person)
        
    return self_person

@router.get("/", response_model=List[PersonResponse])
def read_people(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure "You" exists
    get_self_person(db, current_user)
    return people_repo.get_by_user(db, current_user.id)

@router.get("/summary", response_model=List[PersonSummary])
def read_people_summaries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    self_p = get_self_person(db, current_user)
    people = people_repo.get_by_user(db, current_user.id)
    
    summaries = []
    for p in people:
        if p.id == self_p.id:
            continue  # Skip "You" in the list of contacts
            
        # Get all transactions between You and this person
        txs = transaction_repo.get_pair_transactions(db, current_user.id, self_p.id, p.id)
        
        total_lent = 0.0
        total_borrowed = 0.0
        settlements_count = 0
        
        for tx in txs:
            converted_amount = tx.amount * tx.exchange_rate
            if tx.transaction_type == 'settlement':
                settlements_count += 1
            
            if tx.from_person_id == self_p.id:
                # You paid/lent
                total_lent += converted_amount
            else:
                # They paid/lent
                total_borrowed += converted_amount
                
        current_balance = total_lent - total_borrowed
        pending_amount = abs(current_balance)
        
        summaries.append(
            PersonSummary(
                id=p.id,
                name=p.name,
                email=p.email,
                total_borrowed=total_borrowed,
                total_lent=total_lent,
                current_balance=current_balance,
                pending_amount=pending_amount,
                completed_settlements_count=settlements_count,
                status=p.status
            )
        )
    return summaries

@router.post("/", response_model=PersonResponse)
def create_person(
    person_in: PersonCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    obj_data = person_in.dict()
    obj_data["user_id"] = current_user.id
    return people_repo.create(db, obj_in=obj_data, user_id=current_user.id, ip_address=request.client.host if request.client else None)

@router.get("/{person_id}", response_model=PersonSummary)
def read_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    self_p = get_self_person(db, current_user)
    p = people_repo.get(db, person_id)
    if not p or p.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Person not found")
        
    txs = transaction_repo.get_pair_transactions(db, current_user.id, self_p.id, p.id)
    
    total_lent = 0.0
    total_borrowed = 0.0
    settlements_count = 0
    
    for tx in txs:
        converted_amount = tx.amount * tx.exchange_rate
        if tx.transaction_type == 'settlement':
            settlements_count += 1
        
        if tx.from_person_id == self_p.id:
            total_lent += converted_amount
        else:
            total_borrowed += converted_amount
            
    current_balance = total_lent - total_borrowed
    pending_amount = abs(current_balance)
    
    return PersonSummary(
        id=p.id,
        name=p.name,
        email=p.email,
        total_borrowed=total_borrowed,
        total_lent=total_lent,
        current_balance=current_balance,
        pending_amount=pending_amount,
        completed_settlements_count=settlements_count,
        status=p.status
    )

@router.put("/{person_id}", response_model=PersonResponse)
def update_person(
    person_id: int,
    person_in: PersonUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = people_repo.get(db, person_id)
    if not p or p.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Person not found")
    return people_repo.update(db, db_obj=p, obj_in=person_in, user_id=current_user.id, ip_address=request.client.host if request.client else None)

@router.delete("/{person_id}", response_model=PersonResponse)
def delete_person(
    person_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = people_repo.get(db, person_id)
    if not p or p.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Person not found")
    return people_repo.remove(db, id=person_id, user_id=current_user.id, ip_address=request.client.host if request.client else None)

@router.post("/{person_id}/archive", response_model=PersonResponse)
def archive_person(
    person_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p = people_repo.get(db, person_id)
    if not p or p.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Person not found")
        
    new_status = "archived" if p.status == "active" else "active"
    return people_repo.update(
        db,
        db_obj=p,
        obj_in={"status": new_status},
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )

@router.get("/{person_id}/ledger")
def get_person_ledger(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    self_p = get_self_person(db, current_user)
    p = people_repo.get(db, person_id)
    if not p or p.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Person not found")
        
    txs = transaction_repo.get_pair_transactions(db, current_user.id, self_p.id, p.id)
    
    splits = db.query(ExpenseSplit).join(Expense, ExpenseSplit.expense_id == Expense.id).filter(
        Expense.user_id == current_user.id,
        ExpenseSplit.person_id == p.id,
        Expense.is_deleted == False,
        ExpenseSplit.is_deleted == False
    ).all()
    
    ledger_entries = []
    
    for tx in txs:
        ledger_entries.append({
            "id": f"tx_{tx.id}",
            "type": "transaction",
            "date": tx.date,
            "description": tx.description,
            "amount": tx.amount,
            "currency": tx.currency,
            "exchange_rate": tx.exchange_rate,
            "converted_amount": tx.amount * tx.exchange_rate,
            "from_person_id": tx.from_person_id,
            "to_person_id": tx.to_person_id,
            "category_id": tx.category_id,
            "transaction_type": tx.transaction_type,
            "receipt_id": tx.receipt_id,
            "notes": tx.notes,
            "status": tx.status
        })
        
    for s in splits:
        exp = db.query(Expense).filter(Expense.id == s.expense_id).first()
        pref_currency = "INR"
        if current_user.preferences:
            pref_currency = current_user.preferences.default_currency
            
        rate_entry = db.query(ExchangeRate).filter(
            ExchangeRate.base_currency == exp.currency,
            ExchangeRate.target_currency == pref_currency
        ).first()
        rate = rate_entry.rate if rate_entry else 1.0
        
        from_id = self_p.id if s.owe_amount > 0 else p.id
        to_id = p.id if s.owe_amount > 0 else self_p.id
        
        ledger_entries.append({
            "id": f"exp_{exp.id}",
            "type": "expense",
            "date": exp.created_at,
            "description": f"Expense: {exp.description}",
            "amount": abs(s.owe_amount),
            "currency": exp.currency,
            "exchange_rate": rate,
            "converted_amount": abs(s.owe_amount) * rate,
            "from_person_id": from_id,
            "to_person_id": to_id,
            "category_id": exp.category_id,
            "transaction_type": "loan" if s.owe_amount > 0 else "borrow",
            "receipt_id": exp.receipt_id,
            "notes": exp.notes,
            "status": "completed"
        })
        
    ledger_entries.sort(key=lambda x: x["date"])
    
    running_balance = 0.0
    detailed_ledger = []
    
    for entry in ledger_entries:
        change = entry["converted_amount"]
        if entry["from_person_id"] == self_p.id:
            running_balance += change
            entry["running_balance"] = running_balance
        else:
            running_balance -= change
            entry["running_balance"] = running_balance
            
        detailed_ledger.append(entry)
        
    return {
        "person": p,
        "running_balance": running_balance,
        "ledger": detailed_ledger
    }

