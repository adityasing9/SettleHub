"""Path traversal protection and sandbox validation for RCPC."""
from pathlib import Path
from typing import List, Optional
from fastapi import HTTPException, status
from app.config import settings

class PathSecurityError(HTTPException):
    def __init__(self, detail: str = "Access to requested path is forbidden"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

def validate_and_resolve_path(target_path_str: str, allowed_dirs: Optional[List[Path]] = None) -> Path:
    """
    Validate that a given path string resolves strictly within one of the authorized directories.
    Protects against:
    - Path traversal attacks (../, ..\\)
    - Null-byte injection
    - Drive-letter hopping (C:\\, D:\\)
    - Unauthorized access outside sandbox
    """
    if not target_path_str or "\x00" in target_path_str:
        raise PathSecurityError("Invalid path argument provided")
    
    if allowed_dirs is None:
        allowed_dirs = settings.get_effective_file_dirs()
        
    if not allowed_dirs:
        raise PathSecurityError("No sandboxed directories are configured on this Windows PC")

    target_candidate = Path(target_path_str)
    
    # Check if target is relative to an allowed root or absolute
    resolved_path: Optional[Path] = None
    
    if target_candidate.is_absolute():
        try:
            candidate_resolved = target_candidate.resolve()
        except Exception as e:
            raise PathSecurityError(f"Cannot resolve path: {e}")
            
        for root in allowed_dirs:
            try:
                # If candidate_resolved is within or is root
                candidate_resolved.relative_to(root)
                resolved_path = candidate_resolved
                break
            except ValueError:
                continue
    else:
        # Relative path: attempt resolution against each allowed root
        for root in allowed_dirs:
            try:
                candidate_resolved = (root / target_candidate).resolve()
                candidate_resolved.relative_to(root)
                resolved_path = candidate_resolved
                break
            except (ValueError, Exception):
                continue

    if resolved_path is None:
        raise PathSecurityError(f"Access denied: path '{target_path_str}' is outside authorized directories")

    return resolved_path
