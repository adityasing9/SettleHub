from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.api.people import get_person_ledger
from app.services.export_service import generate_csv_ledger, generate_excel_ledger, generate_pdf_ledger
from io import BytesIO

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/ledger/{person_id}/export")
def export_ledger(
    person_id: int,
    format: str = Query(..., pattern="^(csv|excel|pdf)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ledger_data = get_person_ledger(person_id=person_id, db=db, current_user=current_user)
    
    person = ledger_data["person"]
    pref_currency = "INR"
    if current_user.preferences:
        pref_currency = current_user.preferences.default_currency
        
    entries = ledger_data["ledger"]
    
    if format == "csv":
        csv_data = generate_csv_ledger(entries)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=ledger_{person.name.replace(' ', '_')}.csv"}
        )
        
    elif format == "excel":
        excel_buffer = generate_excel_ledger(entries)
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=ledger_{person.name.replace(' ', '_')}.xlsx"}
        )
        
    elif format == "pdf":
        pdf_buffer = generate_pdf_ledger(entries, person.name, pref_currency)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=ledger_{person.name.replace(' ', '_')}.pdf"}
        )
