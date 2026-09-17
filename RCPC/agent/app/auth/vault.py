"""Persistent storage and management of paired devices and credentials."""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.config import settings

logger = logging.getLogger("rcpc.vault")

class PairedDevice(BaseModel):
    device_id: str
    device_name: str
    client_type: str = "PWA"
    paired_at: str
    last_seen: str
    is_revoked: bool = False
    permissions: List[str] = Field(default_factory=lambda: ["system", "network", "media", "files", "apps", "clipboard", "input"])

class DeviceVault:
    def __init__(self, vault_path: Path):
        self.vault_path = vault_path
        self._devices: Dict[str, PairedDevice] = {}
        self._load()

    def _load(self):
        if not self.vault_path.exists():
            self._save()
            return
        
        try:
            with open(self.vault_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                devices_data = data.get("devices", {})
                self._devices = {k: PairedDevice(**v) for k, v in devices_data.items()}
        except Exception as e:
            logger.error(f"Failed to read vault file {self.vault_path}: {e}")
            self._devices = {}

    def _save(self):
        try:
            self.vault_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "version": "1.0.0",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "devices": {k: v.model_dump() for k, v in self._devices.items()}
            }
            with open(self.vault_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save vault file {self.vault_path}: {e}")

    def add_device(self, device_id: str, device_name: str, client_type: str = "PWA") -> PairedDevice:
        now_str = datetime.now(timezone.utc).isoformat()
        device = PairedDevice(
            device_id=device_id,
            device_name=device_name,
            client_type=client_type,
            paired_at=now_str,
            last_seen=now_str,
            is_revoked=False
        )
        self._devices[device_id] = device
        self._save()
        return device

    def get_device(self, device_id: str) -> Optional[PairedDevice]:
        return self._devices.get(device_id)

    def list_devices(self) -> List[PairedDevice]:
        return list(self._devices.values())

    def update_last_seen(self, device_id: str):
        if device_id in self._devices:
            self._devices[device_id].last_seen = datetime.now(timezone.utc).isoformat()
            self._save()

    def revoke_device(self, device_id: str) -> bool:
        if device_id in self._devices:
            self._devices[device_id].is_revoked = True
            self._save()
            return True
        return False

    def remove_device(self, device_id: str) -> bool:
        if device_id in self._devices:
            del self._devices[device_id]
            self._save()
            return True
        return False

device_vault = DeviceVault(settings.vault_file)
