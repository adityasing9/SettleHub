# RCPC Architecture Specification

## Overview

**RCPC (Remote Control & PC Management Platform)** is built with a decoupled client-agent architecture engineered for reliability, low latency, and defense-in-depth security.

```
┌─────────────────────────────────────────────────────────┐
│            Client: Mobile-First React PWA               │
│  (React 18 + TypeScript + Tailwind CSS + PWA Engine)    │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │ Transport Abstraction     │
              │  (Auto-select / Fallback) │
              └─────────────┬─────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
│  Local LAN  │      │   Hotspot   │      │  Tailscale  │
│    Wi-Fi    │      │  Tethering  │      │ Private VPN │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                  HTTP REST / WebSocket
                  (Bearer Auth / JWT)
                            │
┌───────────────────────────▼─────────────────────────────┐
│              Windows Agent (FastAPI / Python)           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Security Gateway: Rate Limiter & Token Auth       │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ Command Router: Risk Assessment (LOW/MED/HIGH)    │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ Windows Controllers:                              │  │
│  │  • Power (Lock, Sleep, Hibernate, Restart, Off)   │  │
│  │  • Telemetry (psutil, battery, disks, GPU)        │  │
│  │  • Network & WinRT Tethering (Hotspot Guard)      │  │
│  │  • Media & Volume (Virtual-Key Injection)         │  │
│  │  • Sandboxed Files (Path Traversal Proof)         │  │
│  │  • Apps & Processes (Allowlist Launcher)          │  │
│  │  • Clipboard (Explicit Two-Way Sync)              │  │
│  │  • Input (Touchpad Relative Mouse & Keyboard)     │  │
│  │  • Screen Capture (PIL ScreenGrab Stream)         │  │
│  │  • Audit Trail (Rotating Structured Log)          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Transport Abstraction Layer

The transport abstraction decouples high-level control and telemetry messages from physical network media. All transports implement the unified `ITransport` contract:

- `availability`: boolean status indicator
- `status`: connection lifecycle state (`connected`, `connecting`, `disconnected`, `error`)
- `latency`: dynamic round-trip ping time (ms)
- `identity`: human-readable transport name and endpoint
- `send_command`: robust request/response pipeline
- `disconnect`: graceful connection closure

### Priority & Automatic Transport Selection
By default, RCPC probes transports in order of latency and connection stability:
1. **USB / Reverse Tether** (when active)
2. **Local Wi-Fi** (sub-15ms latency)
3. **Hotspot** (sub-25ms latency)
4. **Tailscale / Private Mesh** (remote accessibility)
5. **Bluetooth** (via native helper bridge)

## Command Router & Risk Classification

All operations pass through the Command Router:
- **LOW Risk**: Telemetry metrics, host info, volume adjustments, read-only clipboard.
- **MEDIUM Risk**: File downloads, folder creation, allowlisted application launch, touchpad mouse movement.
- **HIGH Risk**: System shutdown, system restart, PC sleep, process termination, file deletion, hotspot toggle.
  *High-risk actions require explicit confirmation tokens and generate high-priority audit log events.*
