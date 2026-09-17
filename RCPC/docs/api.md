# RCPC REST & WebSocket API Reference

Base URL: `http://<agent-host>:8765/api/v1`

All endpoints (except `/auth/pairing-info`, `/auth/pair`, and `/health`) require the `Authorization: Bearer <jwt_token>` header.

## 1. Authentication & Pairing

### GET `/auth/pairing-info`
Returns current 6-digit pairing code and detected network endpoints.
```json
{
  "code": "849201",
  "expires_in_seconds": 284,
  "port": 8765,
  "hostname": "MY-LAPTOP",
  "transports": { ... }
}
```

### POST `/auth/pair`
Pair a new client device using the active code.
**Request Body**:
```json
{
  "code": "849201",
  "device_id": "unique-phone-uuid",
  "device_name": "Google Pixel 8",
  "client_type": "PWA",
  "transport": "wifi"
}
```
**Response**:
```json
{
  "success": true,
  "action": "auth.pair",
  "data": {
    "token": "eyJhbGciOi...",
    "device": { ... },
    "token_type": "bearer"
  }
}
```

### GET `/auth/verify`
Validate token validity and get device details.

### GET `/auth/devices`
List all paired devices.

### DELETE `/auth/devices/{device_id}`
Revoke access for a paired device.

---

## 2. System & Power Control

### GET `/system/info`
Retrieve system architecture, Windows edition, uptime, and user.

### POST `/system/lock`
Lock Windows desktop (`LockWorkStation`).

### POST `/system/sleep`
Put Windows PC into sleep state.
**Body**: `{"confirm": true}`

### POST `/system/hibernate`
Put Windows PC into hibernation.
**Body**: `{"confirm": true}`

### POST `/system/restart`
Restart Windows PC with delay.
**Body**: `{"confirm": true, "delay_seconds": 5}`

### POST `/system/shutdown`
Shut down Windows PC with delay.
**Body**: `{"confirm": true, "delay_seconds": 5}`

### POST `/system/abort-shutdown`
Abort scheduled shutdown or restart.

---

## 3. Real-Time Telemetry & Monitoring

### GET `/monitoring/status`
Returns CPU, RAM, Disk, Battery, GPU, and Network I/O snapshot.

### WebSocket `/ws/telemetry?token=<jwt_token>`
Streams live metrics every `RCPC_TELEMETRY_INTERVAL_MS` (default 1000ms).
Accepts low-latency input packets:
- `{"type": "input.mouse.move", "dx": 2.5, "dy": -1.0, "sensitivity": 1.0}`
- `{"type": "input.mouse.click", "button": "left", "action": "click"}`
- `{"type": "input.mouse.scroll", "delta": 1}`
- `{"type": "input.keyboard.text", "text": "hello"}`
- `{"type": "input.keyboard.key", "key": "enter"}`

---

## 4. Network & Hotspot

### GET `/network/interfaces`
List all network adapters, IPv4, IPv6, MAC, and Wi-Fi SSID.

### GET `/network/transports`
List status of all transports (Wi-Fi, Hotspot, Tailscale, USB, Bluetooth).

### GET `/network/hotspot`
Inspect Windows Mobile Hotspot state and connected clients.

### POST `/network/hotspot/toggle`
**Body**: `{"enable": true/false, "confirm_carrier_disconnect": false}`

---

## 5. Sandboxed Files

### GET `/files/roots`
List authorized sandbox roots.

### GET `/files/browse?path=<path>`
List contents of authorized folder.

### GET `/files/download?path=<path>`
Stream file content.

### POST `/files/upload`
Multipart upload: `file`, `target_dir`.

### POST `/files/mkdir`
**Body**: `{"parent_path": "...", "folder_name": "New Folder"}`

### POST `/files/rename`
**Body**: `{"source_path": "...", "new_name": "Renamed.txt"}`

### DELETE `/files/delete`
**Body**: `{"target_path": "...", "confirm": true}`

---

## 6. Remote Touchpad & Keyboard

### POST `/input/mouse/move`
**Body**: `{"dx": 10.0, "dy": 5.0, "sensitivity": 1.0}`

### POST `/input/mouse/click`
**Body**: `{"button": "left", "action": "click"}`

### POST `/input/mouse/scroll`
**Body**: `{"delta": 1}`

### POST `/input/keyboard/text`
**Body**: `{"text": "Hello Windows"}`

### POST `/input/keyboard/key`
**Body**: `{"key": "enter"}`

---

## 7. Media & Screen Capture

### POST `/media/volume/up`
### POST `/media/volume/down`
### POST `/media/volume/mute`
### POST `/media/playback/play-pause`
### POST `/media/playback/next`
### POST `/media/playback/prev`

### GET `/screen/capture?quality=70`
Returns JPEG image stream of current desktop.

---

## 8. Audit Log

### GET `/activity/logs?limit=50`
Returns audit events.
