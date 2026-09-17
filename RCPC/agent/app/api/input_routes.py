"""Remote touchpad and keyboard input simulation endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.commands.models import StructuredResponse
from app.input.controller import (
    move_mouse_relative,
    mouse_click,
    mouse_scroll,
    send_text,
    send_special_key
)

router = APIRouter(prefix="/api/v1/input", tags=["Remote Input"])

class MouseMoveRequest(BaseModel):
    dx: float
    dy: float
    sensitivity: float = 1.0

class MouseClickRequest(BaseModel):
    button: str = "left"  # left, right, middle
    action: str = "click"  # click, double_click, down, up

class MouseScrollRequest(BaseModel):
    delta: int  # 1 for up, -1 for down

class KeyTextRequest(BaseModel):
    text: str

class SpecialKeyRequest(BaseModel):
    key: str

@router.post("/mouse/move", response_model=StructuredResponse)
async def api_mouse_move(req: MouseMoveRequest, current_device: PairedDevice = Depends(get_current_device)):
    move_mouse_relative(req.dx, req.dy, req.sensitivity)
    return StructuredResponse(success=True, action="input.mouse.move")

@router.post("/mouse/click", response_model=StructuredResponse)
async def api_mouse_click(req: MouseClickRequest, current_device: PairedDevice = Depends(get_current_device)):
    mouse_click(req.button, req.action)
    return StructuredResponse(success=True, action="input.mouse.click")

@router.post("/mouse/scroll", response_model=StructuredResponse)
async def api_mouse_scroll(req: MouseScrollRequest, current_device: PairedDevice = Depends(get_current_device)):
    mouse_scroll(req.delta)
    return StructuredResponse(success=True, action="input.mouse.scroll")

@router.post("/keyboard/text", response_model=StructuredResponse)
async def api_keyboard_text(req: KeyTextRequest, current_device: PairedDevice = Depends(get_current_device)):
    send_text(req.text)
    return StructuredResponse(success=True, action="input.keyboard.text")

@router.post("/keyboard/key", response_model=StructuredResponse)
async def api_keyboard_key(req: SpecialKeyRequest, current_device: PairedDevice = Depends(get_current_device)):
    ok = send_special_key(req.key)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Unsupported special key: {req.key}")
    return StructuredResponse(success=True, action="input.keyboard.key")
