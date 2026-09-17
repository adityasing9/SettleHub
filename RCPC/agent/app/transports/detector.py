"""Transport detector reporting availability and connectivity states."""
import shutil
import socket
import subprocess
from typing import Any, Dict, List
import psutil
from app.config import settings

def get_tailscale_ip() -> str:
    """Detect Tailscale 100.x.y.z IP address if Tailscale is running."""
    # Check network interfaces for 100.x.y.z
    for name, addrs in psutil.net_if_addrs().items():
        if "tailscale" in name.lower() or "ts0" in name.lower():
            for a in addrs:
                if a.family == socket.AF_INET and a.address.startswith("100."):
                    return a.address
    
    # Fallback to tailscale CLI if in PATH
    if shutil.which("tailscale"):
        try:
            res = subprocess.run(["tailscale", "ip", "-4"], capture_output=True, text=True, timeout=2)
            if res.returncode == 0:
                ip = res.stdout.strip().splitlines()[0]
                if ip.startswith("100."):
                    return ip
        except Exception:
            pass
            
    return ""

def get_lan_ips() -> List[str]:
    """Return non-loopback IPv4 addresses."""
    ips = []
    for name, addrs in psutil.net_if_addrs().items():
        if "loopback" in name.lower() or "tailscale" in name.lower():
            continue
        for a in addrs:
            if a.family == socket.AF_INET and not a.address.startswith("127."):
                ips.append(a.address)
    return ips

def detect_transports() -> Dict[str, Any]:
    """Report status and endpoints for all supported connection modes."""
    lan_ips = get_lan_ips()
    tailscale_ip = get_tailscale_ip()
    port = settings.port
    
    # Check for USB tethering network interface (Remote NDIS or Apple Mobile Device or USB Ethernet)
    usb_detected = False
    for name in psutil.net_if_addrs().keys():
        lower = name.lower()
        if "ndis" in lower or "usb" in lower or "apple mobile" in lower:
            usb_detected = True
            break

    return {
        "wifi": {
            "name": "Local Wi-Fi",
            "available": len(lan_ips) > 0,
            "status": "active" if lan_ips else "unavailable",
            "ips": lan_ips,
            "port": port,
            "url": f"http://{lan_ips[0]}:{port}" if lan_ips else None
        },
        "hotspot": {
            "name": "Mobile Hotspot",
            "available": True,
            "status": "ready",
            "port": port
        },
        "tailscale": {
            "name": "Tailscale / Private Mesh",
            "available": bool(tailscale_ip),
            "status": "active" if tailscale_ip else "not_detected",
            "ip": tailscale_ip or None,
            "url": f"http://{tailscale_ip}:{port}" if tailscale_ip else None
        },
        "usb": {
            "name": "USB Cable / Reverse Tether",
            "available": usb_detected,
            "status": "connected" if usb_detected else "requires_cable_or_adb_bridge",
            "note": "Requires native USB tethering or ADB reverse port forward (adb reverse tcp:8765 tcp:8765)"
        },
        "bluetooth": {
            "name": "Bluetooth RFCOMM",
            "available": False,
            "status": "requires_native_helper_bridge",
            "note": "PWAs cannot open raw RFCOMM sockets directly. Requires the RCPC Android Native Helper Bridge."
        }
    }
