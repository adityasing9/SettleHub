"""Authentication and device pairing endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from app.auth.pairing import pairing_manager
from app.auth.vault import device_vault, PairedDevice
from app.auth.tokens import create_access_token
from app.auth.dependencies import get_current_device
from app.commands.models import StructuredResponse
from app.logging_config import audit_logger
from app.transports.detector import detect_transports

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & Pairing"])

class PairRequest(BaseModel):
    code: str
    device_id: str
    device_name: str
    client_type: str = "PWA"
    transport: Optional[str] = "wifi"

class DeviceActionRequest(BaseModel):
    device_id: str

@router.get("/pairing-info")
async def get_pairing_info():
    """Retrieve current pairing code, timeout, and connection endpoints."""
    code_info = pairing_manager.get_current_code_info()
    transports = detect_transports()
    return {
        **code_info,
        "transports": transports
    }

@router.post("/refresh-code")
async def refresh_pairing_code():
    """Regenerate a new pairing PIN."""
    new_code = pairing_manager.generate_new_code()
    code_info = pairing_manager.get_current_code_info()
    audit_logger.log_action(action="auth.code_refreshed", result="SUCCESS", metadata={"code": new_code})
    return code_info

@router.post("/pair", response_model=StructuredResponse)
async def pair_device(req: PairRequest, request: Request):
    """Verify pairing code and register new trusted device."""
    if not pairing_manager.validate_code(req.code):
        audit_logger.log_action(
            action="auth.pair_attempt",
            result="FAILED",
            device_id=req.device_id,
            device_name=req.device_name,
            transport=req.transport or "unknown",
            error="Invalid or expired pairing code"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired pairing code. Please check the code on your Windows screen."
        )

    # Register in vault
    device = device_vault.add_device(
        device_id=req.device_id,
        device_name=req.device_name,
        client_type=req.client_type
    )

    # Issue JWT token
    token = create_access_token({"sub": device.device_id, "name": device.device_name})

    # Log successful pair
    audit_logger.log_action(
        action="auth.device_paired",
        result="SUCCESS",
        device_id=device.device_id,
        device_name=device.device_name,
        transport=req.transport or "unknown"
    )

    return StructuredResponse(
        success=True,
        action="auth.pair",
        transport=req.transport or "unknown",
        data={
            "token": token,
            "device": device.model_dump(),
            "token_type": "bearer"
        },
        message="Device paired and trusted successfully"
    )

@router.get("/verify", response_model=StructuredResponse)
async def verify_token(current_device: PairedDevice = Depends(get_current_device)):
    """Validate current session token."""
    return StructuredResponse(
        success=True,
        action="auth.verify",
        data={"device": current_device.model_dump()},
        message="Token is valid"
    )

@router.get("/devices")
async def list_paired_devices(current_device: PairedDevice = Depends(get_current_device)):
    """List all registered devices in the vault."""
    return {"devices": [d.model_dump() for d in device_vault.list_devices()]}

@router.delete("/devices/{device_id}", response_model=StructuredResponse)
async def revoke_device(device_id: str, current_device: PairedDevice = Depends(get_current_device)):
    """Revoke or remove a device from the vault."""
    success = device_vault.revoke_device(device_id)
    if not success:
        raise HTTPException(status_code=404, detail="Device not found")
        
    audit_logger.log_action(
        action="auth.device_revoked",
        result="SUCCESS",
        device_id=current_device.device_id,
        device_name=current_device.device_name,
        metadata={"revoked_device_id": device_id}
    )
    return StructuredResponse(
        success=True,
        action="auth.revoke",
        message=f"Device {device_id} revoked successfully"
    )
