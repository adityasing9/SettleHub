from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User, Budget, ExpenseCategory, Group
from app.schemas.schemas import BudgetCreate, BudgetUpdate, BudgetResponse
from datetime import datetime

router = APIRouter(prefix="/budgets", tags=["Budgets"])

def format_budget_response(db: Session, b: Budget) -> BudgetResponse:
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == b.category_id).first() if b.category_id else None
    grp = db.query(Group).filter(Group.id == b.group_id).first() if b.group_id else None
    
    return BudgetResponse(
        id=b.id,
        user_id=b.user_id,
        name=b.name,
        amount=b.amount,
        currency=b.currency,
        budget_type=b.budget_type,
        category_id=b.category_id,
        category_name=cat.name if cat else None,
        group_id=b.group_id,
        group_name=grp.name if grp else None,
        spent_amount=b.spent_amount,
        created_at=b.created_at
    )

@router.get("/", response_model=List[BudgetResponse])
def read_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.is_deleted == False
    ).all()
    return [format_budget_response(db, b) for b in budgets]

@router.post("/", response_model=BudgetResponse)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify category if provided
    if budget_in.category_id:
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == budget_in.category_id).first()
        if not cat:
            raise HTTPException(status_code=400, detail="Invalid expense category ID")
            
    # Verify group if provided
    if budget_in.group_id:
        grp = db.query(Group).filter(Group.id == budget_in.group_id, Group.created_by_user_id == current_user.id).first()
        if not grp:
            raise HTTPException(status_code=400, detail="Invalid group ID")
            
    # Create budget
    db_b = Budget(
        user_id=current_user.id,
        name=budget_in.name,
        amount=budget_in.amount,
        currency=budget_in.currency or "INR",
        budget_type=budget_in.budget_type,
        category_id=budget_in.category_id,
        group_id=budget_in.group_id,
        spent_amount=0.0
    )
    db.add(db_b)
    db.commit()
    db.refresh(db_b)
    
    return format_budget_response(db, db_b)

@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    b = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id, Budget.is_deleted == False).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    for k, v in budget_in.dict(exclude_unset=True).items():
        setattr(b, k, v)
        
    db.commit()
    db.refresh(b)
    return format_budget_response(db, b)

@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    b = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id, Budget.is_deleted == False).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    b.is_deleted = True
    b.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Budget deleted successfully"}
