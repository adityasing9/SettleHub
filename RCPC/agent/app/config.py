"""RCPC Windows Agent Configuration."""
import os
import secrets
from pathlib import Path
from typing import Dict, List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DATA_DIR = Path.home() / ".rcpc"
DEFAULT_DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    """Application settings loaded from environment or defaults."""
    app_name: str = "RCPC Windows Agent"
    version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8765
    debug: bool = False
    allowed_origins: List[str] = ["*"]
    
    # Security & Tokens
    jwt_secret: str = ""
    token_expiry_seconds: int = 30 * 24 * 3600  # 30 days
    rate_limit_per_minute: int = 120
    pairing_code_expiry_seconds: int = 300  # 5 minutes
    
    # File Sandbox Configuration
    allowed_file_dirs: List[str] = []
    
    # Application Allowlist
    allowed_apps: Dict[str, str] = {
        "Google Chrome": "chrome.exe",
        "VS Code": "code.cmd",
        "Windows Terminal": "wt.exe",
        "Notepad": "notepad.exe",
        "Calculator": "calc.exe",
        "Task Manager": "taskmgr.exe",
        "Spotify": "spotify.exe",
        "File Explorer": "explorer.exe",
    }
    
    # Telemetry
    telemetry_interval_ms: int = 1000
    require_high_risk_confirmation: bool = True
    
    # Storage Paths
    data_dir: Path = DEFAULT_DATA_DIR
    vault_file: Path = DEFAULT_DATA_DIR / "rcpc_vault.json"
    audit_log_file: Path = DEFAULT_DATA_DIR / "rcpc_audit.log"
    
    model_config = SettingsConfigDict(
        env_prefix="RCPC_",
        env_file=".env",
        extra="ignore"
    )

    def get_effective_file_dirs(self) -> List[Path]:
        """Return canonical Path objects for allowed directories."""
        dirs: List[Path] = []
        if self.allowed_file_dirs:
            for d in self.allowed_file_dirs:
                p = Path(d).expanduser().resolve()
                if p.exists() and p.is_dir():
                    dirs.append(p)
        else:
            # Default safe user directories
            user_home = Path.home()
            defaults = [
                user_home / "Desktop" / "RCPC Shared",
                user_home / "Downloads",
                user_home / "Documents",
                user_home / "Downloads" / "RCPC Uploads",
            ]
            for p in defaults:
                p.mkdir(parents=True, exist_ok=True)
                dirs.append(p.resolve())
        return dirs

settings = Settings()

# Ensure JWT secret exists
if not settings.jwt_secret:
    secret_path = settings.data_dir / "secret.key"
    if secret_path.exists():
        settings.jwt_secret = secret_path.read_text(encoding="utf-8").strip()
    else:
        generated = secrets.token_hex(32)
        settings.jwt_secret = generated
        secret_path.write_text(generated, encoding="utf-8")
