# RCPC Networking Specification

## Supported Network Topologies

RCPC seamlessly transitions between local, ad-hoc, and mesh network topologies.

```
1. Local Wi-Fi Network
   [Phone PWA] ──(Wi-Fi Router / AP)──> [Windows Laptop Agent]

2. Phone Hotspot (Tethering)
   [Phone Hotspot] ──(WLAN)──> [Windows Laptop Agent]

3. Windows Laptop Hotspot
   [Windows Laptop Agent / Hotspot] ──(Hosted Network)──> [Phone PWA]

4. Tailscale / WireGuard Remote Mesh
   [Phone PWA (100.x.y.z)] ──(Encrypted Tunnel)──> [Windows Laptop (100.a.b.c)]

5. USB Reverse Tethering
   [Phone PWA / Native Bridge] ──(USB Cable / ADB)──> [Windows Laptop Agent]
```

## Hotspot Carrier Disconnect Protection

A critical hazard in remote PC control is accidentally shutting off the network interface that is currently carrying the remote control connection.

RCPC inspects the incoming client IP address:
1. When a client requests disabling the hotspot via `/api/v1/network/hotspot/toggle`:
2. The agent checks if `is_client_on_hotspot(client_ip)` is true.
3. If true and `confirm_carrier_disconnect` is false, the agent rejects the request with code `CARRIER_DISCONNECT_WARNING`.
4. The PWA displays a modal prompt:
   > *"Turning off this hotspot may disconnect your current RCPC session. Do you want to proceed?"*
5. Only upon explicit confirmation is the hotspot shutdown.

## Reconnection & Backoff Strategy

The PWA client implements an exponential backoff reconnect algorithm with jitter:
- Base interval: 1000ms
- Backoff multiplier: 1.5x
- Max interval: 15000ms
- Automatic fallback: If the primary transport fails after 3 retries, the client attempts secondary available endpoints (e.g. falling back from LAN IP to Tailscale IP).
