"""Audit activity logs endpoints."""
from fastapi import APIRouter, Depends, Query
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.commands.models import StructuredResponse
from app.logging_config import audit_logger

router = APIRouter(prefix="/api/v1/activity", tags=["Audit Activity Logs"])

@router.get("/logs", response_model=StructuredResponse)
async def get_logs(
    limit: int = Query(50, ge=1, le=500),
    current_device: PairedDevice = Depends(get_current_device)
):
    entries = audit_logger.get_recent_entries(limit=limit)
    return StructuredResponse(
        success=True,
        action="activity.logs",
        data={"entries": entries, "count": len(entries)}
    )
