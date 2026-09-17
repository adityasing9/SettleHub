# RCPC USB Architecture & Connectivity

## Technical Realities & Browser Limitations

Standard browser PWAs cannot execute low-level USB bus commands or open raw USB bulk/interrupt endpoints to an arbitrary host PC due to browser security sandbox restrictions (`WebUSB` requires specific USB device class permissions and cannot arbitrarily hijack host networking).

## Supported USB Connectivity Methods

RCPC supports USB control through three verified mechanisms:

### 1. USB Tethering (Recommended & Zero-Config)
When you enable "USB Tethering" on Android or "Personal Hotspot via USB" on iOS:
1. Windows recognizes the device as an RNDIS or Apple Mobile Device Ethernet adapter.
2. A direct point-to-point network subnet is established (e.g. `192.168.42.x` or `172.20.10.x`).
3. RCPC Agent automatically detects this network adapter.
4. The PWA connects directly to the agent over this high-speed, sub-millisecond USB network interface.

### 2. ADB Reverse Port Forwarding (Developer Mode)
When connecting via USB with Android Developer Options enabled:
```bash
adb reverse tcp:8765 tcp:8765
```
Once executed, the PWA on the phone can connect to `http://localhost:8765` directly over the physical USB cable!

### 3. Native Android USB Accessory Bridge (AOA Protocol)
Using the Android Open Accessory (AOA) 2.0 protocol, a native Android helper app establishes a bidirectional bulk stream over USB to a Windows companion service without requiring USB debugging or tethering.
