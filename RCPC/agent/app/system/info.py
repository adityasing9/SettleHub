"""System information inspector for Windows."""
import os
import platform
import socket
import time
from datetime import datetime, timezone
import psutil

def get_system_info() -> dict:
    """Retrieve static and runtime host information."""
    boot_time_ts = psutil.boot_time()
    uptime_seconds = int(time.time() - boot_time_ts)
    
    # Format uptime as Xd Xh Xm
    days = uptime_seconds // 86400
    hours = (uptime_seconds % 86400) // 3600
    minutes = (uptime_seconds % 3600) // 60
    uptime_str = f"{days}d {hours}h {minutes}m" if days > 0 else f"{hours}h {minutes}m"

    return {
        "hostname": socket.gethostname(),
        "os_name": platform.system(),
        "os_release": platform.release(),
        "os_version": platform.version(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "cpu_count_physical": psutil.cpu_count(logical=False) or 1,
        "cpu_count_logical": psutil.cpu_count(logical=True) or 1,
        "boot_time": datetime.fromtimestamp(boot_time_ts, timezone.utc).isoformat(),
        "uptime_seconds": uptime_seconds,
        "uptime_formatted": uptime_str,
        "current_user": os.getlogin() if hasattr(os, "getlogin") else "user"
    }
