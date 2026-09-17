"""Network interfaces inspection and Wi-Fi state detection."""
import re
import socket
import subprocess
import psutil
from typing import Any, Dict, List, Optional

def get_wifi_details() -> Optional[Dict[str, Any]]:
    """Query current Wi-Fi SSID, BSSID, and Signal quality via netsh."""
    try:
        res = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True,
            text=True,
            timeout=3
        )
        if res.returncode != 0:
            return None

        lines = res.stdout.splitlines()
        details = {}
        for line in lines:
            if ":" in line:
                k, v = line.split(":", 1)
                key = k.strip().lower()
                val = v.strip()
                if "state" in key:
                    details["state"] = val
                elif "ssid" in key and "bssid" not in key:
                    details["ssid"] = val
                elif "bssid" in key:
                    details["bssid"] = val
                elif "signal" in key:
                    details["signal"] = val
                elif "radio type" in key:
                    details["radio_type"] = val
                elif "receive rate" in key:
                    details["rx_rate"] = val
                elif "transmit rate" in key:
                    details["tx_rate"] = val
        return details if details else None
    except Exception:
        return None

def get_network_interfaces() -> List[Dict[str, Any]]:
    """Enumerate all network adapters with IPv4, IPv6, MAC, and operational status."""
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    wifi_details = get_wifi_details()
    
    interfaces: List[Dict[str, Any]] = []

    for name, addr_list in addrs.items():
        stat = stats.get(name)
        ipv4_list = []
        ipv6_list = []
        mac_addr = None

        for addr in addr_list:
            if addr.family == socket.AF_INET:
                ipv4_list.append(addr.address)
            elif addr.family == socket.AF_INET6:
                # Remove scope id if present
                clean_ip = addr.address.split("%")[0]
                ipv6_list.append(clean_ip)
            elif hasattr(psutil, "AF_LINK") and addr.family == psutil.AF_LINK:
                mac_addr = addr.address

        # Check if this interface is Wi-Fi or Ethernet or Hotspot or Tailscale
        iface_type = "other"
        lower_name = name.lower()
        if "wi-fi" in lower_name or "wlan" in lower_name or "wireless" in lower_name:
            iface_type = "wifi"
        elif "ethernet" in lower_name or "eth" in lower_name:
            iface_type = "ethernet"
        elif "tailscale" in lower_name:
            iface_type = "tailscale"
        elif "hotspot" in lower_name or "local area connection*" in lower_name:
            iface_type = "hotspot"

        is_up = stat.isup if stat else False
        speed = stat.speed if stat else 0

        # Don't list loopback if no IPs
        if name.lower() == "loopback" or name.lower().startswith("lo"):
            continue

        interfaces.append({
            "name": name,
            "type": iface_type,
            "is_up": is_up,
            "speed_mbps": speed,
            "ipv4": ipv4_list,
            "ipv6": ipv6_list,
            "mac_address": mac_addr,
            "wifi_details": wifi_details if iface_type == "wifi" and is_up else None
        })

    return interfaces
