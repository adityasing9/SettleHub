"""Process management and allowlisted application launcher."""
import os
import subprocess
import psutil
from typing import Any, Dict, List, Optional
from app.config import settings

PROTECTED_PROCESS_NAMES = {
    "system", "system idle process", "registry", "smss.exe", "csrss.exe",
    "wininit.exe", "services.exe", "lsass.exe", "winlogon.exe", "svchost.exe"
}

def get_running_processes(limit: int = 100) -> List[Dict[str, Any]]:
    """Enumerate running processes sorted by memory usage."""
    procs = []
    for p in psutil.process_iter(["pid", "name", "username", "cpu_percent", "memory_percent", "status"]):
        try:
            info = p.info
            name = info.get("name") or "Unknown"
            pid = info.get("pid")
            
            # Identify if it's protected
            is_protected = (pid in (0, 4, os.getpid())) or (name.lower() in PROTECTED_PROCESS_NAMES)
            
            procs.append({
                "pid": pid,
                "name": name,
                "username": info.get("username") or "",
                "cpu_percent": round(info.get("cpu_percent") or 0.0, 1),
                "memory_percent": round(info.get("memory_percent") or 0.0, 1),
                "status": info.get("status") or "running",
                "is_protected": is_protected
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Sort by memory descending
    procs.sort(key=lambda x: x["memory_percent"], reverse=True)
    return procs[:limit]

def get_allowlisted_apps() -> List[Dict[str, str]]:
    """Return all configured allowlisted applications."""
    return [
        {"name": name, "command": cmd}
        for name, cmd in settings.allowed_apps.items()
    ]

def launch_application(app_name: str) -> Dict[str, Any]:
    """Launch an application strictly from the allowlist."""
    if app_name not in settings.allowed_apps:
        raise ValueError(f"Application '{app_name}' is not in the authorized allowlist")

    command = settings.allowed_apps[app_name]
    
    # Spawn detached process on Windows
    DETACHED_PROCESS = 0x00000008
    CREATE_NEW_PROCESS_GROUP = 0x00000200
    
    flags = DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    proc = subprocess.Popen(
        command,
        shell=True,
        creationflags=flags,
        close_fds=True
    )
    
    return {
        "app_name": app_name,
        "pid": proc.pid,
        "status": "launched"
    }

def terminate_process(pid: int) -> Dict[str, Any]:
    """Safely terminate a process by PID after checking safety rules."""
    if pid in (0, 4, os.getpid()):
        raise PermissionError("Cannot terminate critical system or agent process")

    try:
        proc = psutil.Process(pid)
        proc_name = proc.name().lower()
        if proc_name in PROTECTED_PROCESS_NAMES:
            raise PermissionError(f"Process '{proc_name}' is protected by Windows OS")

        proc.terminate()
        proc.wait(timeout=3)
        return {"pid": pid, "name": proc_name, "status": "terminated"}
    except psutil.TimeoutExpired:
        proc.kill()
        return {"pid": pid, "name": proc_name, "status": "killed"}
    except psutil.NoSuchProcess:
        raise ValueError(f"No process found with PID {pid}")
    except psutil.AccessDenied:
        raise PermissionError(f"Access denied terminating PID {pid}. Administrator rights required.")
