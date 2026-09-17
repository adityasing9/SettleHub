"""Windows clipboard reader and writer via ctypes Win32 APIs."""
import sys
import ctypes
from ctypes import wintypes
from typing import Optional

def get_clipboard_text() -> str:
    """Retrieve text currently stored in Windows clipboard."""
    if not sys.platform.startswith("win"):
        return ""
        
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    CF_UNICODETEXT = 13

    if not user32.OpenClipboard(None):
        return ""

    try:
        handle = user32.GetClipboardData(CF_UNICODETEXT)
        if not handle:
            return ""
            
        data_ptr = kernel32.GlobalLock(handle)
        if not data_ptr:
            return ""
            
        try:
            text = ctypes.c_wchar_p(data_ptr).value or ""
            return text
        finally:
            kernel32.GlobalUnlock(handle)
    finally:
        user32.CloseClipboard()

def set_clipboard_text(text: str) -> bool:
    """Write text to Windows clipboard."""
    if not sys.platform.startswith("win"):
        return False

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    CF_UNICODETEXT = 13
    GMEM_MOVEABLE = 0x0002

    encoded = (text + "\0").encode("utf-16le")
    byte_len = len(encoded)

    h_mem = kernel32.GlobalAlloc(GMEM_MOVEABLE, byte_len)
    if not h_mem:
        return False

    p_mem = kernel32.GlobalLock(h_mem)
    if not p_mem:
        kernel32.GlobalFree(h_mem)
        return False

    try:
        ctypes.memmove(p_mem, encoded, byte_len)
    finally:
        kernel32.GlobalUnlock(h_mem)

    if not user32.OpenClipboard(None):
        kernel32.GlobalFree(h_mem)
        return False

    try:
        user32.EmptyClipboard()
        user32.SetClipboardData(CF_UNICODETEXT, h_mem)
        return True
    finally:
        user32.CloseClipboard()
