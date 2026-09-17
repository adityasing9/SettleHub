# RCPC Bluetooth Architecture & Technical Limitations

## Technical Realities & Browser Limitations

Web browsers and Progressive Web Apps (PWAs) are sandboxed environments governed by W3C Web Bluetooth specifications:

1. **No Raw RFCOMM / L2CAP Sockets**: The Web Bluetooth API (`navigator.bluetooth`) only supports Bluetooth Low Energy (BLE) GATT attributes (Services, Characteristics, Descriptors).
2. **No Classic Bluetooth SPP**: Direct Serial Port Profile (SPP) connections to Windows COM ports or RFCOMM server sockets cannot be opened directly from standard browser JS.
3. **No Background Bluetooth in PWA**: Web Bluetooth connections cannot maintain arbitrary background connections when the PWA is minimized or screen is locked.

> **Honest Design Rule**: RCPC does NOT present fake Bluetooth buttons that claim to work directly inside a standard web browser.

## Native Android Helper Bridge Architecture

To enable zero-network, direct Bluetooth control without Wi-Fi, RCPC specifies a lightweight native helper bridge (e.g. Android Native / Flutter / Kotlin helper service):

```
┌────────────────────────┐
│   Phone: RCPC PWA      │
│  (Running in browser)  │
└───────────┬────────────┘
            │ Local Loopback (ws://127.0.0.1:8766)
┌───────────▼────────────┐
│ Android Native Bridge  │  <-- Lightweight Android APK / Foreground Service
│ (Kotlin / Background)  │
└───────────┬────────────┘
            │ Bluetooth Classic RFCOMM / SPP Socket
            │ (UUID: 00001101-0000-1000-8000-00805F9B34FB)
┌───────────▼────────────┐
│ Windows Bluetooth Host │
│ (Virtual COM Port / Py)│
└───────────┬────────────┘
            │ Local IPC / HTTP Proxy
┌───────────▼────────────┐
│   RCPC Windows Agent   │
└────────────────────────┘
```

### Bluetooth Message Framing
- 2-byte Big-Endian Length Header followed by JSON payload.
- Compatible with all standard RCPC Command Router endpoints.
