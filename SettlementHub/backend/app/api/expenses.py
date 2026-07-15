from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil
import json
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User, Expense, ExpenseSplit, ExpenseCategory, ExpenseTag, Receipt, Person
from app.schemas.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseCategoryResponse, ExpenseTagResponse, ReceiptResponse
from app.repositories.repos import expense_repo, people_repo
from app.core.config import settings
from app.services.ocr_service import parse_receipt_file
from app.services.budget_service import evaluate_budgets

router = APIRouter(prefix="/expenses", tags=["Expenses"])

def format_expense_response(db: Session, exp: Expense) -> ExpenseResponse:
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == exp.category_id).first()
    splits = db.query(ExpenseSplit).filter(
        ExpenseSplit.expense_id == exp.id,
        ExpenseSplit.is_deleted == False
    ).all()
    
    split_responses = []
    for s in splits:
        p = db.query(Person).filter(Person.id == s.person_id).first()
        split_responses.append({
            "id": s.id,
            "person_id": s.person_id,
            "person_name": p.name if p else "Unknown",
            "share_amount": s.share_amount,
            "share_percent": s.share_percent,
            "owe_amount": s.owe_amount
        })
        
    tag_names = [t.name for t in exp.tags]
    
    return ExpenseResponse(
        id=exp.id,
        amount=exp.amount,
        currency=exp.currency,
        description=exp.description,
        category_id=exp.category_id,
        category_name=cat.name if cat else "Others",
        receipt_id=exp.receipt_id,
        merchant=exp.merchant,
        location=exp.location,
        payment_method=exp.payment_method,
        notes=exp.notes,
        is_recurring=exp.is_recurring,
        recurring_interval=exp.recurring_interval,
        user_id=exp.user_id,
        group_id=exp.group_id,
        created_at=exp.created_at,
        splits=split_responses,
        tags=tag_names
    )

@router.get("/", response_model=List[ExpenseResponse])
def read_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expenses = expense_repo.get_by_user(db, current_user.id)
    return [format_expense_response(db, exp) for exp in expenses]

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    return db.query(ExpenseCategory).all()

@router.get("/tags")
def get_tags(db: Session = Depends(get_db)):
    return db.query(ExpenseTag).all()

@router.post("/", response_model=ExpenseResponse)
def create_expense(
    exp_in: ExpenseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    split_sum = sum(s.share_amount for s in exp_in.splits)
    if abs(split_sum - exp_in.amount) > 0.05:
        raise HTTPException(status_code=400, detail="Sum of splits share must equal expense amount")
        
    for split in exp_in.splits:
        p = people_repo.get(db, split.person_id)
        if not p or p.user_id != current_user.id:
            raise HTTPException(status_code=400, detail=f"Invalid person ID: {split.person_id}")
            
    tags = []
    if exp_in.tags:
        for tname in exp_in.tags:
            tag = db.query(ExpenseTag).filter(ExpenseTag.name == tname).first()
            if not tag:
                tag = ExpenseTag(name=tname)
                db.add(tag)
                db.commit()
                db.refresh(tag)
            tags.append(tag)
            
    exp_data = exp_in.dict(exclude={"splits", "tags"})
    exp_data["user_id"] = current_user.id
    
    db_exp = Expense(**exp_data)
    db_exp.tags = tags
    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)
    
    for s_in in exp_in.splits:
        split = ExpenseSplit(
            expense_id=db_exp.id,
            person_id=s_in.person_id,
            share_amount=s_in.share_amount,
            share_percent=s_in.share_percent,
            owe_amount=s_in.owe_amount
        )
        db.add(split)
        
    db.commit()
    db.refresh(db_exp)
    
    # Evaluate budgets spending
    evaluate_budgets(db, current_user.id, db_exp)
    
    expense_repo._log_audit(
        db,
        action="CREATE",
        record_id=db_exp.id,
        old_values=None,
        new_values=exp_in.dict(),
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    return format_expense_response(db, db_exp)

@router.delete("/{expense_id}", response_model=ExpenseResponse)
def delete_expense(
    expense_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = expense_repo.get(db, expense_id)
    if not exp or exp.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense_id).update({
        "is_deleted": True,
        "deleted_at": datetime.utcnow()
    })
    
    removed_exp = expense_repo.remove(
        db,
        id=expense_id,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return format_expense_response(db, removed_exp)

@router.post("/upload-receipt", response_model=ReceiptResponse)
def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_size = os.path.getsize(file_path)
    
    # Call Gemini Receipt OCR Scanner
    ocr_results = parse_receipt_file(file_path, file.content_type)
    
    receipt = Receipt(
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        metadata_json=json.dumps(ocr_results)
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    
    return receipt
