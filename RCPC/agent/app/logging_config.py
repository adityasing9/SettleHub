"""Structured logging and audit trail system for RCPC Agent."""
import json
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from app.config import settings

# Setup standard logger
logger = logging.getLogger("rcpc")
logger.setLevel(logging.DEBUG if settings.debug else logging.INFO)

# Formatter
console_handler = logging.StreamHandler()
console_formatter = logging.Formatter(
    "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
console_handler.setFormatter(console_formatter)
logger.addHandler(console_handler)

# Rotating File Handler for general app logs
app_log_path = settings.data_dir / "rcpc_agent.log"
file_handler = RotatingFileHandler(
    app_log_path,
    maxBytes=5 * 1024 * 1024,  # 5MB
    backupCount=3,
    encoding="utf-8"
)
file_handler.setFormatter(console_formatter)
logger.addHandler(file_handler)

class AuditLogger:
    """Manages secure, append-only structured audit logs."""
    
    def __init__(self, log_path: Path):
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def log_action(
        self,
        action: str,
        result: str,
        device_id: Optional[str] = None,
        device_name: Optional[str] = None,
        transport: Optional[str] = "unknown",
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Record an action into the audit trail."""
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "result": result,
            "device_id": device_id or "anonymous",
            "device_name": device_name or "unknown",
            "transport": transport or "local",
            "error": error,
            "metadata": metadata or {}
        }
        
        try:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
        except Exception as e:
            logger.error(f"Failed to write to audit log: {e}")
            
        return record

    def get_recent_entries(self, limit: int = 50) -> list:
        """Fetch the most recent audit entries."""
        if not self.log_path.exists():
            return []
        
        entries = []
        try:
            with open(self.log_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                for line in reversed(lines[-limit:]):
                    line = line.strip()
                    if line:
                        try:
                            entries.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"Error reading audit log: {e}")
            
        return entries

audit_logger = AuditLogger(settings.audit_log_file)
