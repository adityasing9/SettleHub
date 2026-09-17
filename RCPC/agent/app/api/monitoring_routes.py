"""System monitoring and telemetry endpoints."""
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.commands.models import StructuredResponse
from app.monitoring.collector import collect_telemetry

router = APIRouter(prefix="/api/v1/monitoring", tags=["Monitoring & Telemetry"])

@router.get("/status", response_model=StructuredResponse)
async def get_status(current_device: PairedDevice = Depends(get_current_device)):
    """Fetch current snapshot of system resources."""
    telemetry = collect_telemetry()
    return StructuredResponse(
        success=True,
        action="monitoring.status",
        data=telemetry
    )
