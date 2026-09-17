# RCPC — Remote Control & PC Management Platform

<div align="center">

![RCPC Banner](https://img.shields.io/badge/RCPC-Remote%20Control%20Platform-06b6d4?style=for-the-badge&logo=windows&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4?style=for-the-badge&logo=windows)
![Client](https://img.shields.io/badge/Client-React%20%7C%20TypeScript%20%7C%20PWA-10b981?style=for-the-badge&logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Uvicorn%20%7C%20Python-3776ab?style=for-the-badge&logo=python)
![Security](https://img.shields.io/badge/Security-Cryptographic%20Pairing%20%26%20Sandboxed-f59e0b?style=for-the-badge&logo=shield)

**Production-grade, modular remote control and monitoring platform connecting authorized mobile devices (PWA) to Windows PCs through multiple connection transports.**

</div>

---

## 📖 Table of Contents

1. [Project Overview](#-project-overview)
2. [Architecture](#-architecture)
3. [Key Features](#-key-features)
4. [Technology Stack](#-technology-stack)
5. [Transport Abstraction & Connectivity](#-transport-abstraction--connectivity)
6. [Security & Device Pairing](#-security--device-pairing)
7. [Getting Started](#-getting-started)
   - [Windows Agent Setup](#1-windows-agent-setup)
   - [Frontend PWA Setup](#2-frontend-pwa-setup)
   - [Running as a Windows Background Service](#3-running-as-a-windows-background-service)
8. [Deployment to Vercel](#-deployment-to-vercel)
9. [Documentation Directory](#-documentation-directory)
10. [Automated Testing](#-automated-testing)
11. [License](#-license)

---

## 🌟 Project Overview

**RCPC** is built for real-world day-to-day PC management from a phone. Unlike simple mockups or toy web remotes, RCPC is a fully functional, defense-in-depth system:

- **True Hardware & OS Integration**: Executes real Windows API calls (`LockWorkStation`, `SetSuspendState`, `ExitWindowsEx`, `SendInput`, `netsh`, WinRT Tethering, `psutil`, Windows Virtual Keys).
- **Mobile-First Progressive Web App (PWA)**: Installable directly on iOS and Android home screens with zero app store friction, responsive dark technical UI, and offline resiliency.
- **Adaptive Transport Selection**: Seamlessly switches between Local Wi-Fi, Phone Hotspot, Laptop Hotspot, Tailscale VPN mesh, and USB reverse tethering.
- **Zero-Trust Security**: Device pairing with rotating 6-digit cryptographic PINs, HMAC-SHA256 JWT bearer tokens, sliding-window rate limiting, and strictly sandboxed directory validation.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│            Mobile Phone: React + Vite + PWA             │
│   (TypeScript • Tailwind CSS • Service Worker Cache)   │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │    Transport Manager      │
              │ (Auto-Priority & Fallback)│
              └─────────────┬─────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────┐
│ Local Wi-Fi │      │ Mobile/PC   │      │  Tailscale  │
│ Sub-15ms RTT│      │   Hotspot   │      │ WireGuard®  │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
               HTTP REST + Live WebSocket
                  (Bearer Auth / JWT)
                            │
┌───────────────────────────▼─────────────────────────────┐
│          Windows Host: RCPC Agent (FastAPI)             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Security Gateway: Token Auth, Rate Limiter, CORS  │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ Command Router: Risk Model (LOW / MEDIUM / HIGH)  │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ Windows OS Controller Modules:                    │  │
│  │  • System & Power (Lock, Sleep, Restart, Shutdown)│  │
│  │  • Live Telemetry (CPU, RAM, Disks, Battery, GPU) │  │
│  │  • Network & Hotspot (Carrier Disconnect Guard)   │  │
│  │  • Media & Volume (Virtual-Key Injection)         │  │
│  │  • Sandboxed Files (Path Traversal Proof)         │  │
│  │  • Application & Process Manager (Allowlist)      │  │
│  │  • Touchpad & Keyboard (SendInput Simulation)     │  │
│  │  • Screen Capture (High-Performance PIL Grab)     │  │
│  │  • Structured Rotating Audit Log                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Features

| Category | Capabilities |
|---|---|
| **Dashboard** | Real-time connection badge, active transport & latency ping, CPU/RAM/Battery/Disk resource gauges, quick power triggers. |
| **Power Control** | Lock desktop instantly, low-power Sleep, Hibernate, Restart with safety timer, Shutdown with safety timer, and Abort Shutdown. |
| **Telemetry** | Live WebSocket telemetry broadcasting CPU % per core, frequency, RAM used/total %, disk mount partitions, battery charging status, and GPU load/temp. |
| **Touchpad & Keys** | Mobile touchpad canvas with relative cursor tracking, left/right clicks, vertical scroll bar, sensitivity controls, and on-screen keyboard text/virtual key sender (`Enter`, `Bksp`, `Esc`, `Tab`, `Win`, Arrows). |
| **Media & Volume** | Volume up/down, mute toggle, play/pause, next track, previous track, and stop playback via Windows virtual multimedia keystrokes. |
| **Screen Capture** | Live on-demand desktop screenshot capture with full-screen viewer and high-res image download. |
| **Network & Hotspot** | Network adapter inspector (IPs, MAC, Wi-Fi SSID, signal quality) and Mobile Hotspot toggle with **Carrier Disconnect Protection** (warns before dropping active session). |
| **Sandboxed Files** | Restricted filesystem explorer (`RCPC Shared`, `Downloads`, `Documents`, `Uploads`), traversal-proof path resolution, file upload, file download, folder creation, and safe deletion. |
| **App Management** | Allowlisted 1-click launcher (Chrome, VS Code, Terminal, Spotify, etc.) and running processes table with real-time memory usage and guarded termination. |
| **Clipboard Sync** | Transparent two-way clipboard exchange (fetch text from Windows clipboard or paste text from phone directly into Windows clipboard). |
| **Audit Trail** | Tamper-evident structured JSON/text audit log recording timestamp, device ID, action, transport, and result. |

---

## 🛠 Technology Stack

### Frontend (PWA)
- **Framework**: React 18 with TypeScript
- **Tooling**: Vite + `@tailwindcss/postcss` + Autoprefixer
- **Icons**: Lucide React
- **PWA**: `vite-plugin-pwa` with auto-updating Service Worker and Web App Manifest
- **Networking**: Axios HTTP client with JWT interceptor + native resilient WebSocket

### Windows Agent
- **Framework**: Python 3.10+, FastAPI, Uvicorn (ASGI)
- **Validation**: Pydantic V2 + Pydantic-Settings
- **System APIs**: `psutil`, `ctypes` (Win32 `user32.dll`, `kernel32.dll`), `subprocess` (netsh, shutdown.exe, WinRT tethering)
- **Imaging**: Pillow (PIL) for desktop capture
- **Security**: PyJWT (HMAC-SHA256), in-memory sliding-window rate limiting

---

## 📡 Transport Abstraction & Connectivity

RCPC abstracts network interfaces behind an adaptive `TransportManager`. Transports are automatically probed and selected according to user-configurable priority:

1. **Local Wi-Fi**: Connects phone to laptop over home/office LAN (lowest latency).
2. **Phone Hotspot**: Laptop connects to phone's Wi-Fi hotspot.
3. **Laptop Hotspot**: Phone connects to Windows Hosted Network / Mobile Hotspot.
4. **Tailscale / Private Mesh**: Encrypted WireGuard® mesh network enabling global remote access without opening public router ports or dynamic DNS.
5. **USB Reverse Tethering**: Physical USB cable connection using USB tethering or `adb reverse tcp:8765 tcp:8765`.
6. **Bluetooth**: Designed with an explicit Native Android Helper Bridge architecture (raw classic RFCOMM sockets cannot be opened by browser sandboxes; documented in `docs/bluetooth.md`).

---

## 🔒 Security & Device Pairing

1. **Initial Pairing**: When the Windows Agent starts, it generates a random 6-digit numeric PIN with a 5-minute expiration timer and prints it to the console.
2. **Key Exchange**: The mobile user enters the PIN into the pairing modal. The agent verifies the code, creates an authorized entry in `rcpc_vault.json`, and issues a cryptographically signed JWT token.
3. **Sandbox Enforcement**: File endpoints canonicalize target paths using `.resolve()` and verify against permitted root directories. Any directory traversal (`../`, null bytes, drive jumping) immediately yields HTTP 403.
4. **No Arbitrary Shell**: The agent exposes zero arbitrary command execution endpoints. All commands are validated against structured schemas.
5. **Risk Classification**:
   - `LOW`: Monitoring, info, volume.
   - `MEDIUM`: App launch, clipboard, file read.
   - `HIGH`: Shutdown, restart, sleep, kill process, file delete, hotspot toggle (requires explicit confirmation).

---

## 🚀 Getting Started

### 1. Windows Agent Setup

```powershell
# Open Windows Terminal / PowerShell:
cd agent

# Install dependencies:
pip install -r requirements.txt

# Start the agent:
python run_agent.py
```

The agent will start on port `8765` and display your connection endpoints and 6-digit pairing PIN:

```
=================================================================
   RCPC — Remote Control & PC Management Platform
   Windows Agent v1.0.0
=================================================================
[*] Pairing Code:  >>> 849201 <<<
[*] Code Validity: 300 seconds
[*] Local LAN URL:   http://192.168.1.50:8765
=================================================================
```

### 2. Frontend PWA Setup

```powershell
# Open a second terminal:
cd frontend

# Install packages:
npm install

# Start development server:
npm run dev
```

Open `http://localhost:5173` on your desktop or open `http://<your-laptop-ip>:5173` in your mobile browser. Tap **Pair PC**, enter the 6-digit PIN, and you're in control!

### 3. Running as a Windows Background Service

To run the agent automatically upon Windows login:

```powershell
cd agent
python service_install.py
```

This registers the agent into Windows Task Scheduler (`schtasks`) with elevated privileges.

---

## ☁️ Deployment to Vercel

The frontend PWA is ready for deployment on Vercel:

1. Push this repository to GitHub.
2. Link the repository in the Vercel Dashboard.
3. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy! Open the deployed URL on your phone and connect to your PC using your Tailscale IP (e.g. `http://100.x.y.z:8765`).

---

## 📚 Documentation Directory

Detailed specifications are available in the [`docs/`](./docs) folder:

- [Architecture & Design (`docs/architecture.md`)](./docs/architecture.md)
- [Security Model & Sandboxing (`docs/security.md`)](./docs/security.md)
- [Networking & Carrier Protection (`docs/networking.md`)](./docs/networking.md)
- [Complete Setup & Deployment (`docs/setup.md`)](./docs/setup.md)
- [REST & WebSocket API Reference (`docs/api.md`)](./docs/api.md)
- [Bluetooth Bridge Architecture (`docs/bluetooth.md`)](./docs/bluetooth.md)
- [USB Tethering & ADB Architecture (`docs/usb.md`)](./docs/usb.md)
- [Tailscale Remote Access Guide (`docs/tailscale.md`)](./docs/tailscale.md)

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests
```powershell
cd agent
python -m pytest tests -v
```

**Results**:
- `test_pairing_info_endpoint` ✅
- `test_pair_device_success_and_verify` ✅
- `test_pair_device_invalid_code` ✅
- `test_command_router_execution` ✅
- `test_path_traversal_attempts` ✅
- `test_telemetry_collection` ✅
- `test_system_info` ✅

### Frontend Build Verification
```powershell
cd frontend
npm run build
```
Generates verified production bundle (`dist/index.html`, `dist/sw.js`, PWA manifests) with zero TypeScript or bundler errors.

---

## 📄 License

MIT License © 2026 RCPC Development Team
