# RCPC Setup & Deployment Guide

## Quick Start (Development)

### 1. Requirements
- **Windows PC**: Windows 10 or 11 (64-bit)
- **Python**: 3.10+
- **Node.js**: 18+ and npm

### 2. Windows Agent Setup
```powershell
# In root directory:
cd agent

# Install dependencies:
pip install -r requirements.txt

# Start Agent:
python run_agent.py
```
The agent starts on `http://0.0.0.0:8765` and displays your 6-digit pairing code and local network IP addresses in the terminal.

### 3. Frontend PWA Setup
```powershell
# In a second terminal:
cd frontend

# Install dependencies:
npm install

# Start local dev server:
npm run dev
```

Open the displayed URL (e.g. `http://localhost:5173`) on your desktop or open your phone's browser to `http://<your-laptop-lan-ip>:5173`.

---

## Installing RCPC Agent as a Windows Background Task

To have the agent start automatically when you log in:
```powershell
cd agent
python service_install.py
```
This registers `RCPC_Windows_Agent` in Windows Task Scheduler with highest privileges.

---

## Deploying Frontend to Vercel

The frontend PWA can be deployed to Vercel:
1. Push this repository to GitHub.
2. Import project into Vercel with Root Directory set to `frontend`.
3. Framework preset: Vite.
4. Build command: `npm run build`, Output directory: `dist`.
5. In the deployed PWA, connect to your Windows PC using your Tailscale IP or local LAN IP!
