"""Windows mouse and keyboard input simulation using ctypes Win32 APIs."""
import sys
import time
import logging

logger = logging.getLogger("rcpc.input")

# Mouse event flags
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800

# Virtual key codes
VK_BACK = 0x08
VK_TAB = 0x09
VK_RETURN = 0x0D
VK_ESCAPE = 0x1B
VK_SPACE = 0x20
VK_LEFT = 0x25
VK_UP = 0x26
VK_RIGHT = 0x27
VK_DOWN = 0x28
VK_DELETE = 0x2E
VK_LWIN = 0x5B

KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_UNICODE = 0x0004

SPECIAL_KEYS = {
    "enter": VK_RETURN,
    "backspace": VK_BACK,
    "tab": VK_TAB,
    "escape": VK_ESCAPE,
    "esc": VK_ESCAPE,
    "space": VK_SPACE,
    "left": VK_LEFT,
    "up": VK_UP,
    "right": VK_RIGHT,
    "down": VK_DOWN,
    "delete": VK_DELETE,
    "win": VK_LWIN,
}

def move_mouse_relative(dx: float, dy: float, sensitivity: float = 1.0):
    """Move cursor by relative delta pixels."""
    if not sys.platform.startswith("win"):
        return
    import ctypes
    user32 = ctypes.windll.user32
    scaled_dx = int(round(dx * sensitivity))
    scaled_dy = int(round(dy * sensitivity))
    user32.mouse_event(MOUSEEVENTF_MOVE, scaled_dx, scaled_dy, 0, 0)

def mouse_click(button: str = "left", action: str = "click"):
    """
    Perform mouse action:
    - button: 'left', 'right', 'middle'
    - action: 'click', 'double_click', 'down', 'up'
    """
    if not sys.platform.startswith("win"):
        return
    import ctypes
    user32 = ctypes.windll.user32
    
    down_flag = MOUSEEVENTF_LEFTDOWN
    up_flag = MOUSEEVENTF_LEFTUP
    
    if button == "right":
        down_flag = MOUSEEVENTF_RIGHTDOWN
        up_flag = MOUSEEVENTF_RIGHTUP
    elif button == "middle":
        down_flag = MOUSEEVENTF_MIDDLEDOWN
        up_flag = MOUSEEVENTF_MIDDLEUP

    if action == "down":
        user32.mouse_event(down_flag, 0, 0, 0, 0)
    elif action == "up":
        user32.mouse_event(up_flag, 0, 0, 0, 0)
    elif action == "click":
        user32.mouse_event(down_flag, 0, 0, 0, 0)
        time.sleep(0.01)
        user32.mouse_event(up_flag, 0, 0, 0, 0)
    elif action == "double_click":
        user32.mouse_event(down_flag, 0, 0, 0, 0)
        time.sleep(0.01)
        user32.mouse_event(up_flag, 0, 0, 0, 0)
        time.sleep(0.05)
        user32.mouse_event(down_flag, 0, 0, 0, 0)
        time.sleep(0.01)
        user32.mouse_event(up_flag, 0, 0, 0, 0)

def mouse_scroll(delta: int):
    """Scroll mouse wheel vertically."""
    if not sys.platform.startswith("win"):
        return
    import ctypes
    user32 = ctypes.windll.user32
    # Windows standard WHEEL_DELTA is 120
    amount = int(delta * 120)
    user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, amount, 0)

def send_special_key(key_name: str) -> bool:
    """Send a named special key like enter, backspace, etc."""
    if not sys.platform.startswith("win"):
        return False
    import ctypes
    user32 = ctypes.windll.user32
    vk = SPECIAL_KEYS.get(key_name.lower())
    if not vk:
        return False
        
    user32.keybd_event(vk, 0, 0, 0)
    time.sleep(0.01)
    user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
    return True

def send_text(text: str):
    """Send unicode text characters directly."""
    if not sys.platform.startswith("win"):
        return
    import ctypes
    user32 = ctypes.windll.user32
    for char in text:
        code = ord(char)
        user32.keybd_event(0, code, KEYEVENTF_UNICODE, 0)
        time.sleep(0.005)
        user32.keybd_event(0, code, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, 0)
