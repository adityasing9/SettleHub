"""Windows multimedia key controller."""
import sys
import time
import logging
from typing import Optional

logger = logging.getLogger("rcpc.media")

# Windows Virtual Key Codes
VK_VOLUME_MUTE = 0xAD
VK_VOLUME_DOWN = 0xAE
VK_VOLUME_UP = 0xAF
VK_MEDIA_NEXT_TRACK = 0xB0
VK_MEDIA_PREV_TRACK = 0xB1
VK_MEDIA_STOP = 0xB2
VK_MEDIA_PLAY_PAUSE = 0xB3

KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002

def _send_vk(vk_code: int):
    """Simulate keypress for virtual key code using ctypes."""
    if not sys.platform.startswith("win"):
        logger.warning(f"Simulate VK {hex(vk_code)} called on non-Windows")
        return
    import ctypes
    user32 = ctypes.windll.user32
    user32.keybd_event(vk_code, 0, KEYEVENTF_EXTENDEDKEY, 0)
    time.sleep(0.02)
    user32.keybd_event(vk_code, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0)

def volume_up(steps: int = 1) -> dict:
    for _ in range(max(1, min(steps, 10))):
        _send_vk(VK_VOLUME_UP)
    return {"action": "volume_up", "steps": steps}

def volume_down(steps: int = 1) -> dict:
    for _ in range(max(1, min(steps, 10))):
        _send_vk(VK_VOLUME_DOWN)
    return {"action": "volume_down", "steps": steps}

def volume_mute_toggle() -> dict:
    _send_vk(VK_VOLUME_MUTE)
    return {"action": "volume_mute_toggle"}

def media_play_pause() -> dict:
    _send_vk(VK_MEDIA_PLAY_PAUSE)
    return {"action": "media_play_pause"}

def media_next() -> dict:
    _send_vk(VK_MEDIA_NEXT_TRACK)
    return {"action": "media_next"}

def media_prev() -> dict:
    _send_vk(VK_MEDIA_PREV_TRACK)
    return {"action": "media_prev"}

def media_stop() -> dict:
    _send_vk(VK_MEDIA_STOP)
    return {"action": "media_stop"}
