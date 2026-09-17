"""Command definitions and models for RCPC."""
from enum import Enum
from typing import Any, Dict, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class StructuredResponse(BaseModel):
    success: bool
    action: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    transport: str = "local"
    data: Optional[Any] = None
    error_code: Optional[str] = None
    message: Optional[str] = None

class CommandPayload(BaseModel):
    action: str
    params: Dict[str, Any] = Field(default_factory=dict)
    confirmation_token: Optional[str] = None
    transport: Optional[str] = "local"
