"""Secure device pairing manager for first-time authentication."""
import os
import secrets
import socket
import time
from typing import Dict, Any, Optional
from app.config import settings

class PairingManager:
    def __init__(self):
        self._current_code: Optional[str] = None
        self._code_expires_at: float = 0
        self.generate_new_code()

    def generate_new_code(self) -> str:
        """Generate a secure 6-digit numeric PIN for quick entry."""
        # 6-digit code formatted as e.g. "849201"
        self._current_code = f"{secrets.randbelow(900000) + 100000}"
        self._code_expires_at = time.time() + settings.pairing_code_expiry_seconds
        return self._current_code

    def get_current_code_info(self) -> Dict[str, Any]:
        """Return current pairing code and remaining valid seconds."""
        remaining = max(0, int(self._code_expires_at - time.time()))
        if remaining == 0:
            self.generate_new_code()
            remaining = int(self._code_expires_at - time.time())
            
        return {
            "code": self._current_code,
            "expires_in_seconds": remaining,
            "port": settings.port,
            "hostname": socket.gethostname()
        }

    def validate_code(self, candidate_code: str) -> bool:
        """Verify the candidate pairing code."""
        if not self._current_code:
            return False
            
        if time.time() > self._code_expires_at:
            return False
            
        # Constant time comparison
        candidate = candidate_code.strip().replace("-", "")
        return secrets.compare_digest(self._current_code, candidate)

pairing_manager = PairingManager()
