"""WebSocket endpoint for real-time telemetry streaming and low-latency input."""
import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.auth.dependencies import get_websocket_device
from app.auth.vault import PairedDevice
from app.monitoring.collector import collect_telemetry
from app.config import settings
from app.input.controller import (
    move_mouse_relative,
    mouse_click,
    mouse_scroll,
    send_text,
    send_special_key
)

logger = logging.getLogger("rcpc.ws")
router = APIRouter(tags=["WebSocket Real-Time"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_json(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(
    websocket: WebSocket,
    token: str = Query(None)
):
    device = await get_websocket_device(websocket, token)
    if not device:
        await websocket.close(code=4001, reason="Unauthorized or revoked device")
        return

    await ws_manager.connect(websocket)
    logger.info(f"WebSocket connected from device {device.device_name} ({device.device_id})")

    async def stream_telemetry():
        try:
            while True:
                telemetry = collect_telemetry()
                msg = {
                    "type": "telemetry",
                    "timestamp": asyncio.get_event_loop().time(),
                    "data": telemetry
                }
                await websocket.send_text(json.dumps(msg))
                await asyncio.sleep(settings.telemetry_interval_ms / 1000.0)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.debug(f"Telemetry stream loop ended: {e}")

    stream_task = asyncio.create_task(stream_telemetry())

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                msg = json.loads(raw_text)
                msg_type = msg.get("type")
                
                # Handle ultra low-latency mouse/touchpad input over WebSocket
                if msg_type == "input.mouse.move":
                    dx = float(msg.get("dx", 0))
                    dy = float(msg.get("dy", 0))
                    sens = float(msg.get("sensitivity", 1.0))
                    move_mouse_relative(dx, dy, sens)
                elif msg_type == "input.mouse.click":
                    btn = msg.get("button", "left")
                    act = msg.get("action", "click")
                    mouse_click(btn, act)
                elif msg_type == "input.mouse.scroll":
                    delta = int(msg.get("delta", 0))
                    mouse_scroll(delta)
                elif msg_type == "input.keyboard.text":
                    text = msg.get("text", "")
                    send_text(text)
                elif msg_type == "input.keyboard.key":
                    key = msg.get("key", "")
                    send_special_key(key)
                elif msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "time": msg.get("time")}))
            except Exception as e:
                logger.debug(f"Error handling WS message: {e}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {device.device_name}")
    finally:
        stream_task.cancel()
        ws_manager.disconnect(websocket)
