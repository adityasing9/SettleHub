from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.services.ai_service import ask_ai_agent
from app.services.prediction_service import predict_spending
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["AI Features"])

class AskRequest(BaseModel):
    question: str

@router.post("/ask")
def ask_ai(
    req: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    answer = ask_ai_agent(db, current_user.id, req.question)
    return {"answer": answer}

@router.get("/summary")
def get_monthly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    answer = ask_ai_agent(db, current_user.id, "Generate financial summary")
    return {"summary": answer}

@router.get("/predict")
def get_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates spending projections for next month using historical regression"""
    return predict_spending(db, current_user.id)
