"""Windows Mobile Hotspot controller and active session safety protection."""
import ipaddress
import json
import logging
import subprocess
from typing import Any, Dict, Optional
import psutil

logger = logging.getLogger("rcpc.hotspot")

PS_GET_HOTSPOT_STATUS = """
[Windows.System.UserProfile.LockScreen,Windows.System.UserProfile,ContentType=WindowsRuntime] | Out-Null
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}
[Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime] | Out-Null
$connectionProfile = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
if ($connectionProfile -ne $null) {
    $tetheringManager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($connectionProfile)
    $status = $tetheringManager.TetheringOperationalState
    $clients = $tetheringManager.ClientCount
    @{
        supported = $true
        state = $status.ToString()
        client_count = $clients
    } | ConvertTo-Json -Compress
} else {
    @{
        supported = $false
        state = "NoInternetProfile"
        client_count = 0
    } | ConvertTo-Json -Compress
}
"""

PS_SET_HOTSPOT_STATE = """
param([string]$targetState)
[Windows.System.UserProfile.LockScreen,Windows.System.UserProfile,ContentType=WindowsRuntime] | Out-Null
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}
[Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime] | Out-Null
$connectionProfile = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
if ($connectionProfile -ne $null) {
    $tetheringManager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($connectionProfile)
    if ($targetState -eq "On") {
        $res = Await ($tetheringManager.StartTetheringAsync()) ([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult])
        @{ success = ($res.Status -eq 'Success'); status = $res.Status.ToString() } | ConvertTo-Json -Compress
    } else {
        $res = Await ($tetheringManager.StopTetheringAsync()) ([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult])
        @{ success = ($res.Status -eq 'Success'); status = $res.Status.ToString() } | ConvertTo-Json -Compress
    }
} else {
    @{ success = $false; error = "No active connection profile for tethering" } | ConvertTo-Json -Compress
}
"""

def is_client_on_hotspot(client_ip: str) -> bool:
    """Check if client IP matches subnet of any virtual or hotspot adapter."""
    if not client_ip or client_ip in ("127.0.0.1", "localhost", "::1"):
        return False
        
    try:
        c_ip = ipaddress.ip_address(client_ip)
        for name, addrs in psutil.net_if_addrs().items():
            lower = name.lower()
            # Windows Virtual WiFi adapter / hotspot adapter names
            if "local area connection*" in lower or "hotspot" in lower or "virtual" in lower:
                for addr in addrs:
                    if addr.family == 2: # AF_INET
                        net = ipaddress.ip_network(f"{addr.address}/{addr.netmask}", strict=False)
                        if c_ip in net:
                            return True
    except Exception:
        pass
    return False

def get_hotspot_status() -> Dict[str, Any]:
    """Query current Windows Mobile Hotspot state and connected clients."""
    # First attempt WinRT tethering via powershell
    try:
        cmd = ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", PS_GET_HOTSPOT_STATUS]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if res.returncode == 0 and res.stdout.strip():
            # Find json in output
            out = res.stdout.strip()
            data = json.loads(out)
            is_on = data.get("state") == "On" or data.get("state") == "1"
            return {
                "supported": data.get("supported", True),
                "is_enabled": is_on,
                "state": data.get("state", "Unknown"),
                "client_count": data.get("client_count", 0),
                "method": "WinRT_Tethering"
            }
    except Exception as e:
        logger.debug(f"WinRT tethering check error: {e}")

    # Fallback to netsh hostednetwork
    try:
        res = subprocess.run(["netsh", "wlan", "show", "hostednetwork"], capture_output=True, text=True, timeout=3)
        if res.returncode == 0:
            is_started = "Status                 : Started" in res.stdout
            return {
                "supported": "Mode                   : Allowed" in res.stdout,
                "is_enabled": is_started,
                "state": "Started" if is_started else "Stopped",
                "client_count": 0,
                "method": "Netsh_HostedNetwork"
            }
    except Exception:
        pass

    return {
        "supported": False,
        "is_enabled": False,
        "state": "Unavailable",
        "client_count": 0,
        "method": "None"
    }

def set_hotspot_state(enable: bool) -> Dict[str, Any]:
    """Toggle Windows Mobile Hotspot state."""
    target = "On" if enable else "Off"
    try:
        cmd = [
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            f"& {{ {PS_SET_HOTSPOT_STATE} }} -targetState '{target}'"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if res.returncode == 0 and res.stdout.strip():
            data = json.loads(res.stdout.strip())
            return {
                "success": data.get("success", False),
                "state": target,
                "detail": data
            }
    except Exception as e:
        logger.error(f"Failed to set hotspot state via WinRT: {e}")

    # Fallback to netsh hosted network
    try:
        action = "start" if enable else "stop"
        res = subprocess.run(["netsh", "wlan", f"{action}", "hostednetwork"], capture_output=True, text=True, timeout=5)
        return {
            "success": res.returncode == 0,
            "state": target,
            "detail": res.stdout.strip()
        }
    except Exception as e:
        return {
            "success": False,
            "state": target,
            "error": str(e)
        }
