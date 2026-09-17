"""Clipboard synchronization endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.commands.models import StructuredResponse
from app.clipboard.manager import get_clipboard_text, set_clipboard_text
from app.logging_config import audit_logger

router = APIRouter(prefix="/api/v1/clipboard", tags=["Clipboard Synchronization"])

class SetClipboardRequest(BaseModel):
    text: str

@router.get("", response_model=StructuredResponse)
async def read_clipboard(current_device: PairedDevice = Depends(get_current_device)):
    text = get_clipboard_text()
    audit_logger.log_action(
        action="clipboard.read",
        result="SUCCESS",
        device_id=current_device.device_id,
        device_name=current_device.device_name,
        metadata={"length": len(text)}
    )
    return StructuredResponse(
        success=True,
        action="clipboard.read",
        data={"text": text, "length": len(text)}
    )

@router.post("", response_model=StructuredResponse)
async def write_clipboard(req: SetClipboardRequest, current_device: PairedDevice = Depends(get_current_device)):
    ok = set_clipboard_text(req.text)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to write to Windows clipboard")
        
    audit_logger.log_action(
        action="clipboard.write",
        result="SUCCESS",
        device_id=current_device.device_id,
        device_name=current_device.device_name,
        metadata={"length": len(req.text)}
    )
    return StructuredResponse(
        success=True,
        action="clipboard.write",
        message="Text copied to Windows clipboard"
    )
