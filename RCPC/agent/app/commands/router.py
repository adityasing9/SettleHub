"""Centralized command routing, permission checks, and audit integration."""
import logging
from typing import Any, Callable, Dict, Optional
from app.commands.models import RiskLevel, StructuredResponse
from app.logging_config import audit_logger

logger = logging.getLogger("rcpc.commands")

class CommandRouter:
    def __init__(self):
        self._handlers: Dict[str, Dict[str, Any]] = {}

    def register(self, action: str, handler: Callable, risk: RiskLevel = RiskLevel.LOW):
        self._handlers[action] = {
            "handler": handler,
            "risk": risk
        }

    async def execute(
        self,
        action: str,
        params: Dict[str, Any],
        device_id: str,
        device_name: str,
        transport: str = "local",
        confirmed: bool = False
    ) -> StructuredResponse:
        entry = self._handlers.get(action)
        if not entry:
            err = f"Unknown command: {action}"
            audit_logger.log_action(action=action, result="FAILED", device_id=device_id, device_name=device_name, transport=transport, error=err)
            return StructuredResponse(
                success=False,
                action=action,
                transport=transport,
                error_code="UNKNOWN_COMMAND",
                message=err
            )

        handler = entry["handler"]
        risk = entry["risk"]

        # Check HIGH-risk operations confirmation
        if risk == RiskLevel.HIGH and not confirmed:
            msg = f"Command '{action}' is HIGH risk and requires explicit user confirmation"
            audit_logger.log_action(action=action, result="BLOCKED", device_id=device_id, device_name=device_name, transport=transport, error=msg)
            return StructuredResponse(
                success=False,
                action=action,
                transport=transport,
                error_code="CONFIRMATION_REQUIRED",
                message=msg
            )

        try:
            res = handler(**params) if params else handler()
            audit_logger.log_action(action=action, result="SUCCESS", device_id=device_id, device_name=device_name, transport=transport)
            return StructuredResponse(
                success=True,
                action=action,
                transport=transport,
                data=res,
                message=f"Command '{action}' executed successfully"
            )
        except Exception as e:
            err_msg = str(e)
            logger.error(f"Error executing command {action}: {err_msg}")
            audit_logger.log_action(action=action, result="ERROR", device_id=device_id, device_name=device_name, transport=transport, error=err_msg)
            return StructuredResponse(
                success=False,
                action=action,
                transport=transport,
                error_code="EXECUTION_FAILED",
                message=err_msg
            )

command_router = CommandRouter()
