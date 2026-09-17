"""Network management and hotspot control endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.commands.models import StructuredResponse
from app.network.interfaces import get_network_interfaces
from app.network.hotspot import get_hotspot_status, set_hotspot_state, is_client_on_hotspot
from app.transports.detector import detect_transports
from app.logging_config import audit_logger

router = APIRouter(prefix="/api/v1/network", tags=["Network & Hotspot"])

class HotspotToggleRequest(BaseModel):
    enable: bool
    confirm_carrier_disconnect: bool = False
    transport: Optional[str] = "local"

@router.get("/interfaces", response_model=StructuredResponse)
async def list_interfaces(current_device: PairedDevice = Depends(get_current_device)):
    """Enumerate network adapters, IPs, and Wi-Fi state."""
    interfaces = get_network_interfaces()
    return StructuredResponse(
        success=True,
        action="network.interfaces",
        data=interfaces
    )

@router.get("/transports", response_model=StructuredResponse)
async def list_transports(current_device: PairedDevice = Depends(get_current_device)):
    """Inspect status of all transport layers."""
    transports = detect_transports()
    return StructuredResponse(
        success=True,
        action="network.transports",
        data=transports
    )

@router.get("/hotspot", response_model=StructuredResponse)
async def hotspot_status(
    request: Request,
    current_device: PairedDevice = Depends(get_current_device)
):
    """Get Windows hotspot status and check if active client is using it."""
    status_info = get_hotspot_status()
    client_ip = request.client.host if request.client else ""
    is_carrier = is_client_on_hotspot(client_ip)
    
    return StructuredResponse(
        success=True,
        action="network.hotspot.status",
        data={
            **status_info,
            "is_client_connected_via_hotspot": is_carrier
        }
    )

@router.post("/hotspot/toggle", response_model=StructuredResponse)
async def toggle_hotspot(
    req: HotspotToggleRequest,
    request: Request,
    current_device: PairedDevice = Depends(get_current_device)
):
    """Enable or disable Windows Mobile Hotspot with carrier disconnect guard."""
    client_ip = request.client.host if request.client else ""
    is_carrier = is_client_on_hotspot(client_ip)

    # If disabling and client is on the hotspot, require explicit warning confirmation
    if not req.enable and is_carrier and not req.confirm_carrier_disconnect:
        return StructuredResponse(
            success=False,
            action="network.hotspot.toggle",
            error_code="CARRIER_DISCONNECT_WARNING",
            message="Turning off this hotspot may disconnect your current RCPC session. Confirm to proceed."
        )

    result = set_hotspot_state(req.enable)
    audit_logger.log_action(
        action=f"network.hotspot.{'enable' if req.enable else 'disable'}",
        result="SUCCESS" if result.get("success") else "FAILED",
        device_id=current_device.device_id,
        device_name=current_device.device_name,
        transport=req.transport
    )
    
    return StructuredResponse(
        success=result.get("success", False),
        action="network.hotspot.toggle",
        data=result,
        message=f"Hotspot {'enabled' if req.enable else 'disabled'} successfully" if result.get("success") else "Failed to toggle hotspot"
    )
