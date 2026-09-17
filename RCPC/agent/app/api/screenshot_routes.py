"""Secure screen capture endpoint."""
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from PIL import ImageGrab
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.logging_config import audit_logger

router = APIRouter(prefix="/api/v1/screen", tags=["Screen Capture"])

@router.get("/capture")
async def capture_screen(quality: int = 70, current_device: PairedDevice = Depends(get_current_device)):
    """Capture current Windows screen and return JPEG image."""
    try:
        # Capture all monitors or primary monitor
        screenshot = ImageGrab.grab(all_screens=True)
        
        # Optimize size if very large
        max_width = 1920
        if screenshot.width > max_width:
            ratio = max_width / screenshot.width
            new_size = (max_width, int(screenshot.height * ratio))
            screenshot = screenshot.resize(new_size)

        buffer = io.BytesIO()
        screenshot.save(buffer, format="JPEG", quality=max(10, min(quality, 95)))
        jpeg_bytes = buffer.getvalue()

        audit_logger.log_action(
            action="screen.capture",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            metadata={"width": screenshot.width, "height": screenshot.height, "bytes": len(jpeg_bytes)}
        )

        return Response(content=jpeg_bytes, media_type="image/jpeg")
    except Exception as e:
        audit_logger.log_action(
            action="screen.capture",
            result="ERROR",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Failed to capture screen: {e}")
