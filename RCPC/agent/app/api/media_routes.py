"""Windows Multimedia controls endpoints."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.commands.models import StructuredResponse
from app.media.controller import (
    volume_up,
    volume_down,
    volume_mute_toggle,
    media_play_pause,
    media_next,
    media_prev,
    media_stop
)

router = APIRouter(prefix="/api/v1/media", tags=["Media Controls"])

class StepRequest(BaseModel):
    steps: int = 1

@router.post("/volume/up", response_model=StructuredResponse)
async def api_volume_up(req: StepRequest = StepRequest(), current_device: PairedDevice = Depends(get_current_device)):
    res = volume_up(req.steps)
    return StructuredResponse(success=True, action="media.volume.up", data=res)

@router.post("/volume/down", response_model=StructuredResponse)
async def api_volume_down(req: StepRequest = StepRequest(), current_device: PairedDevice = Depends(get_current_device)):
    res = volume_down(req.steps)
    return StructuredResponse(success=True, action="media.volume.down", data=res)

@router.post("/volume/mute", response_model=StructuredResponse)
async def api_volume_mute(current_device: PairedDevice = Depends(get_current_device)):
    res = volume_mute_toggle()
    return StructuredResponse(success=True, action="media.volume.mute", data=res)

@router.post("/playback/play-pause", response_model=StructuredResponse)
async def api_play_pause(current_device: PairedDevice = Depends(get_current_device)):
    res = media_play_pause()
    return StructuredResponse(success=True, action="media.playback.play_pause", data=res)

@router.post("/playback/next", response_model=StructuredResponse)
async def api_playback_next(current_device: PairedDevice = Depends(get_current_device)):
    res = media_next()
    return StructuredResponse(success=True, action="media.playback.next", data=res)

@router.post("/playback/prev", response_model=StructuredResponse)
async def api_playback_prev(current_device: PairedDevice = Depends(get_current_device)):
    res = media_prev()
    return StructuredResponse(success=True, action="media.playback.prev", data=res)

@router.post("/playback/stop", response_model=StructuredResponse)
async def api_playback_stop(current_device: PairedDevice = Depends(get_current_device)):
    res = media_stop()
    return StructuredResponse(success=True, action="media.playback.stop", data=res)
