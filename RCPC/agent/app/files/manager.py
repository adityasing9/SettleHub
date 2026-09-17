"""Sandboxed file operations engine."""
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from app.config import settings
from app.security.path_validator import validate_and_resolve_path, PathSecurityError

def get_allowed_roots() -> List[Dict[str, Any]]:
    """Return the list of allowed root directory descriptors for UI display."""
    roots = settings.get_effective_file_dirs()
    return [
        {
            "name": p.name or str(p),
            "path": str(p),
            "exists": p.exists(),
        }
        for p in roots
    ]

def list_directory(target_path_str: Optional[str] = None) -> Dict[str, Any]:
    """List files and folders in an authorized directory."""
    allowed_roots = settings.get_effective_file_dirs()
    if not allowed_roots:
        return {"current_path": "", "entries": [], "roots": []}

    # If no target provided, default to first root
    if not target_path_str or target_path_str == "/":
        resolved_dir = allowed_roots[0]
    else:
        resolved_dir = validate_and_resolve_path(target_path_str)

    if not resolved_dir.is_dir():
        raise PathSecurityError(f"Path is not a directory: {target_path_str}")

    entries = []
    try:
        with os.scandir(resolved_dir) as it:
            for entry in it:
                try:
                    stat_info = entry.stat()
                    is_dir = entry.is_dir()
                    entries.append({
                        "name": entry.name,
                        "path": str(Path(entry.path).resolve()),
                        "is_dir": is_dir,
                        "size_bytes": stat_info.st_size if not is_dir else 0,
                        "modified": datetime.fromtimestamp(stat_info.st_mtime, timezone.utc).isoformat(),
                        "extension": Path(entry.name).suffix.lower() if not is_dir else ""
                    })
                except (PermissionError, OSError):
                    continue
    except PermissionError:
        raise PathSecurityError("Permission denied accessing this directory")

    # Sort directories first, then alphabetical
    entries.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

    # Find which root this directory belongs to
    root_match = None
    for r in allowed_roots:
        try:
            resolved_dir.relative_to(r)
            root_match = str(r)
            break
        except ValueError:
            continue

    return {
        "current_path": str(resolved_dir),
        "root_path": root_match,
        "is_root": any(resolved_dir == r for r in allowed_roots),
        "entries": entries,
        "roots": get_allowed_roots()
    }

def get_file_details(file_path_str: str) -> Dict[str, Any]:
    resolved = validate_and_resolve_path(file_path_str)
    if not resolved.is_file():
        raise PathSecurityError("Target is not a file")

    stat = resolved.stat()
    return {
        "name": resolved.name,
        "path": str(resolved),
        "size_bytes": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        "extension": resolved.suffix.lower()
    }

def create_directory(parent_path_str: str, folder_name: str) -> str:
    # Disallow slashes in folder name to avoid nested path escapes
    if "/" in folder_name or "\\" in folder_name or ".." in folder_name:
        raise PathSecurityError("Invalid directory name")
        
    parent = validate_and_resolve_path(parent_path_str)
    new_dir = parent / folder_name
    new_dir.mkdir(parents=False, exist_ok=True)
    return str(new_dir.resolve())

def rename_item(source_path_str: str, new_name: str) -> str:
    if "/" in new_name or "\\" in new_name or ".." in new_name:
        raise PathSecurityError("Invalid target name")
        
    src = validate_and_resolve_path(source_path_str)
    dest = src.parent / new_name
    
    # Validate destination is also inside sandbox
    validate_and_resolve_path(str(dest.parent))
    
    src.rename(dest)
    return str(dest.resolve())

def delete_item(target_path_str: str) -> bool:
    target = validate_and_resolve_path(target_path_str)
    
    # Don't allow deleting the root sandbox directory itself!
    for r in settings.get_effective_file_dirs():
        if target == r:
            raise PathSecurityError("Cannot delete sandbox root directory")

    if target.is_dir():
        shutil.rmtree(target)
    elif target.is_file():
        target.unlink()
    return True
