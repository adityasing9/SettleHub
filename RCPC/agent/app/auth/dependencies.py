"""FastAPI authentication dependencies."""
from typing import Optional
from fastapi import Depends, HTTPException, Security, status, Query, WebSocket
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.auth.tokens import decode_access_token
from app.auth.vault import device_vault, PairedDevice

security = HTTPBearer(auto_error=False)

async def get_current_device(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> PairedDevice:
    """Validate Bearer token and return active PairedDevice."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    device_id = payload.get("sub")
    if not device_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload"
        )
        
    device = device_vault.get_device(device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device not recognized or was removed"
        )
        
    if device.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device access has been revoked"
        )
        
    device_vault.update_last_seen(device_id)
    return device

async def get_websocket_device(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
) -> Optional[PairedDevice]:
    """Validate token passed via query param for WebSockets."""
    if not token:
        # Check Sec-WebSocket-Protocol or query parameter
        return None
        
    payload = decode_access_token(token)
    if not payload:
        return None
        
    device_id = payload.get("sub")
    if not device_id:
        return None
        
    device = device_vault.get_device(device_id)
    if not device or device.is_revoked:
        return None
        
    device_vault.update_last_seen(device_id)
    return device
