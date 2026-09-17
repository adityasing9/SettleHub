"""System and Power management endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.commands.models import StructuredResponse
from app.system.controller import (
    lock_workstation,
    sleep_pc,
    hibernate_pc,
    restart_pc,
    shutdown_pc,
    abort_shutdown
)
from app.system.info import get_system_info
from app.logging_config import audit_logger

router = APIRouter(prefix="/api/v1/system", tags=["System & Power Control"])

class PowerCommandRequest(BaseModel):
    confirm: bool = False
    delay_seconds: int = 5
    transport: Optional[str] = "local"

@router.get("/info", response_model=StructuredResponse)
async def system_info(current_device: PairedDevice = Depends(get_current_device)):
    """Get system architecture, OS version, and uptime."""
    info = get_system_info()
    return StructuredResponse(
        success=True,
        action="system.info",
        data=info
    )

@router.post("/lock", response_model=StructuredResponse)
async def system_lock(
    req: PowerCommandRequest,
    current_device: PairedDevice = Depends(get_current_device)
):
    """Lock the Windows workstation."""
    try:
        lock_workstation()
        audit_logger.log_action(
            action="system.lock",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            transport=req.transport
        )
        return StructuredResponse(
            success=True,
            action="system.lock",
            transport=req.transport or "local",
            message="Workstation locked"
        )
    except Exception as e:
        audit_logger.log_action(
            action="system.lock",
            result="ERROR",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            transport=req.transport,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sleep", response_model=StructuredResponse)
async def system_sleep(
    req: PowerCommandRequest,
    current_device: PairedDevice = Depends(get_current_device)
):
    """Put Windows PC into sleep mode."""
    if not req.confirm:
        raise HTTPException(status_code=400, detail="Sleep requires explicit confirmation")
    try:
        sleep_pc()
        audit_logger.log_action(
            action="system.sleep",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            transport=req.transport
        )
        return StructuredResponse(
            success=True,
            action="system.sleep",
            transport=req.transport or "local",
            message="PC entering sleep mode"
        )
    except Exception as e:
        audit_logger.log_action(
            action="system.sleep",
            result="ERROR",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            transport=req.transport,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/hibernate", response_model=StructuredResponse)
async def system_hibernate(
    req: PowerCommandRequest,
    current_device: PairedDevice = Depends(get_current_device)
):
    """Put Windows PC into hibernation."""
    if not req.confirm:
        raise HTTPException(status_code=400, detail="Hibernate requires explicit confirmation")
    try:
        hibernate_pc()
        audit_logger.log_action(
            action="system.hibernate",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            transport=req.transport
        )
        return StructuredResponse(
            success=True,
            action="system.hibernate",
            transport=req.transport or "local",
            message="PC entering hibernation"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/restart", response_model=StructuredResponse)
async def system_restart(
    req: PowerCommandRequest,
    current_device: PairedDevice = Depends(get_current_device)
):
    """Restart Windows PC."""
    if not req.confirm:
        raise HTTPException(status_code=400, detail="Restart requires explicit confirmation")
    try:
        restart_pc(delay_seconds=req.delay_seconds)
        audit_logger.log_action(
            action="system.restart",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            transport=req.transport,
            metadata={"delay": req.delay_seconds}
        )
        return StructuredResponse(
            success=True,
            action="system.restart",
            transport=req.transport or "local",
            message=f"PC will restart in {req.delay_seconds} seconds"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shutdown", response_model=StructuredResponse)
async def system_shutdown(
    req: PowerCommandRequest,
    current_device: PairedDevice = Depends(get_current_device)
):
    """Shut down Windows PC."""
    if not req.confirm:
        raise HTTPException(status_code=400, detail="Shutdown requires explicit confirmation")
    try:
        shutdown_pc(delay_seconds=req.delay_seconds)
        audit_logger.log_action(
            action="system.shutdown",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            transport=req.transport,
            metadata={"delay": req.delay_seconds}
        )
        return StructuredResponse(
            success=True,
            action="system.shutdown",
            transport=req.transport or "local",
            message=f"PC will shut down in {req.delay_seconds} seconds"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/abort-shutdown", response_model=StructuredResponse)
async def system_abort_shutdown(
    req: PowerCommandRequest,
    current_device: PairedDevice = Depends(get_current_device)
):
    """Cancel a scheduled shutdown or restart."""
    success = abort_shutdown()
    return StructuredResponse(
        success=success,
        action="system.abort_shutdown",
        transport=req.transport or "local",
        message="Shutdown cancelled" if success else "No pending shutdown to abort"
    )
