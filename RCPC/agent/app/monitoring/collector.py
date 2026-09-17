"""Real-time system telemetry collector using psutil and Windows APIs."""
import shutil
import subprocess
import psutil
from typing import Any, Dict, List, Optional

def get_gpu_info() -> Optional[Dict[str, Any]]:
    """Query GPU usage via nvidia-smi if available."""
    if not shutil.which("nvidia-smi"):
        return None
    try:
        output = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,utilization.gpu,memory.total,memory.used,temperature.gpu", "--format=csv,noheader,nounits"],
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=2
        ).strip()
        if output:
            parts = [p.strip() for p in output.split(",")]
            if len(parts) >= 5:
                return {
                    "name": parts[0],
                    "load_percent": float(parts[1]) if parts[1].replace(".", "").isdigit() else 0.0,
                    "memory_total_mb": float(parts[2]) if parts[2].replace(".", "").isdigit() else 0.0,
                    "memory_used_mb": float(parts[3]) if parts[3].replace(".", "").isdigit() else 0.0,
                    "temperature_c": float(parts[4]) if parts[4].replace(".", "").isdigit() else 0.0,
                }
    except Exception:
        pass
    return None

def collect_telemetry() -> Dict[str, Any]:
    """Gather real-time metrics for CPU, RAM, Disks, Battery, and Network."""
    # CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
    cpu_freq = psutil.cpu_freq()
    
    # Memory
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    # Disks
    disks: List[Dict[str, Any]] = []
    for part in psutil.disk_partitions(all=False):
        # Skip removable/cdrom with no mount
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks.append({
                "device": part.device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total_bytes": usage.total,
                "used_bytes": usage.used,
                "free_bytes": usage.free,
                "percent": usage.percent
            })
        except (PermissionError, OSError):
            continue

    # Battery
    battery = psutil.sensors_battery()
    battery_info = None
    if battery:
        battery_info = {
            "percent": battery.percent,
            "power_plugged": battery.power_plugged,
            "secsleft": battery.secsleft if battery.secsleft != psutil.POWER_TIME_UNLIMITED else -1
        }

    # Network IO
    net_io = psutil.net_io_counters()
    
    # GPU
    gpu_info = get_gpu_info()

    return {
        "cpu": {
            "percent": cpu_percent,
            "per_core": cpu_per_core,
            "frequency_mhz": round(cpu_freq.current, 1) if cpu_freq else None
        },
        "memory": {
            "total": mem.total,
            "available": mem.available,
            "used": mem.used,
            "percent": mem.percent
        },
        "swap": {
            "total": swap.total,
            "used": swap.used,
            "percent": swap.percent
        },
        "disks": disks,
        "battery": battery_info,
        "network_io": {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv
        },
        "gpu": gpu_info
    }
