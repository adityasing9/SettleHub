"""Windows System & Power Controller."""
import os
import sys
import subprocess
import logging

logger = logging.getLogger("rcpc.system")

def is_windows() -> bool:
    return sys.platform.startswith("win")

def lock_workstation() -> bool:
    """Lock the Windows workstation."""
    if not is_windows():
        logger.warning("Lock workstation called on non-Windows OS")
        return False
    try:
        import ctypes
        return bool(ctypes.windll.user32.LockWorkStation())
    except Exception as e:
        logger.error(f"Failed to lock workstation: {e}")
        raise RuntimeError(f"Lock workstation failed: {e}")

def sleep_pc() -> bool:
    """Put Windows PC into sleep mode."""
    if not is_windows():
        logger.warning("Sleep PC called on non-Windows OS")
        return False
    try:
        # Rundll32 powrprof.dll,SetSuspendState 0,1,0
        res = subprocess.run(
            ["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"],
            capture_output=True,
            text=True
        )
        return res.returncode == 0
    except Exception as e:
        logger.error(f"Failed to sleep PC: {e}")
        raise RuntimeError(f"Sleep failed: {e}")

def hibernate_pc() -> bool:
    """Put Windows PC into hibernation mode."""
    if not is_windows():
        logger.warning("Hibernate PC called on non-Windows OS")
        return False
    try:
        res = subprocess.run(
            ["shutdown.exe", "/h"],
            capture_output=True,
            text=True
        )
        return res.returncode == 0
    except Exception as e:
        logger.error(f"Failed to hibernate PC: {e}")
        raise RuntimeError(f"Hibernate failed: {e}")

def restart_pc(delay_seconds: int = 5) -> bool:
    """Restart the Windows PC with an optional safety countdown."""
    if not is_windows():
        logger.warning("Restart PC called on non-Windows OS")
        return False
    try:
        res = subprocess.run(
            ["shutdown.exe", "/r", "/t", str(delay_seconds), "/c", "RCPC Remote Restart Initiated"],
            capture_output=True,
            text=True
        )
        return res.returncode == 0
    except Exception as e:
        logger.error(f"Failed to restart PC: {e}")
        raise RuntimeError(f"Restart failed: {e}")

def shutdown_pc(delay_seconds: int = 5) -> bool:
    """Shut down the Windows PC with an optional safety countdown."""
    if not is_windows():
        logger.warning("Shutdown PC called on non-Windows OS")
        return False
    try:
        res = subprocess.run(
            ["shutdown.exe", "/s", "/t", str(delay_seconds), "/c", "RCPC Remote Shutdown Initiated"],
            capture_output=True,
            text=True
        )
        return res.returncode == 0
    except Exception as e:
        logger.error(f"Failed to shutdown PC: {e}")
        raise RuntimeError(f"Shutdown failed: {e}")

def abort_shutdown() -> bool:
    """Abort a scheduled shutdown or restart."""
    if not is_windows():
        return False
    try:
        res = subprocess.run(["shutdown.exe", "/a"], capture_output=True, text=True)
        return res.returncode == 0
    except Exception as e:
        logger.error(f"Failed to abort shutdown: {e}")
        return False
