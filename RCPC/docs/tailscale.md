# RCPC Tailscale & Secure Remote Connectivity

## Overview

RCPC supports secure remote internet connectivity without exposing your Windows PC to the public internet or configuring complex port forwarding on your home router.

By leveraging **Tailscale** (built on the WireGuard® protocol), communication between your phone and your Windows PC occurs within an encrypted, authenticated private mesh network (tailnet).

## Architecture

```
┌─────────────────────────────────┐
│           Mobile Phone          │
│   Tailscale App: 100.x.y.z      │
│   RCPC PWA                      │
└────────────────┬────────────────┘
                 │
   End-to-End Encrypted WireGuard
                 │
┌────────────────▼────────────────┐
│           Windows PC            │
│   Tailscale Client: 100.a.b.c   │
│   RCPC Agent: Port 8765         │
└─────────────────────────────────┘
```

## Setup Instructions

### 1. Install Tailscale on Windows PC
1. Download and install [Tailscale for Windows](https://tailscale.com/download/windows).
2. Sign in with your account.
3. Note your PC's Tailscale IPv4 address (e.g. `100.101.102.103`) or MagicDNS name (e.g. `my-laptop.tailnet-name.ts.net`).

### 2. Install Tailscale on Your Mobile Phone
1. Install Tailscale from the Google Play Store or Apple App Store.
2. Sign in with the same account.
3. Turn on the VPN toggle in the Tailscale app.

### 3. Connect via RCPC
1. Start the RCPC Windows Agent. It will automatically detect your Tailscale IP:
   ```
   [*] Tailscale URL: http://100.101.102.103:8765
   ```
2. In the RCPC PWA on your phone, enter this Tailscale URL or select "Tailscale" in Settings.
3. Enter your 6-digit pairing code.
4. You now have secure, encrypted remote control from anywhere in the world!
