"""Sandboxed file management endpoints with path traversal protection."""
import shutil
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.commands.models import StructuredResponse
from app.files.manager import (
    list_directory,
    get_file_details,
    create_directory,
    rename_item,
    delete_item,
    get_allowed_roots
)
from app.security.path_validator import validate_and_resolve_path, PathSecurityError
from app.logging_config import audit_logger

router = APIRouter(prefix="/api/v1/files", tags=["Sandboxed Files"])

class MkdirRequest(BaseModel):
    parent_path: str
    folder_name: str

class RenameRequest(BaseModel):
    source_path: str
    new_name: str

class DeleteRequest(BaseModel):
    target_path: str
    confirm: bool = False

@router.get("/roots", response_model=StructuredResponse)
async def api_roots(current_device: PairedDevice = Depends(get_current_device)):
    roots = get_allowed_roots()
    return StructuredResponse(success=True, action="files.roots", data=roots)

@router.get("/browse", response_model=StructuredResponse)
async def api_browse(
    path: Optional[str] = Query(None),
    current_device: PairedDevice = Depends(get_current_device)
):
    try:
        data = list_directory(path)
        return StructuredResponse(success=True, action="files.browse", data=data)
    except PathSecurityError as e:
        raise HTTPException(status_code=403, detail=e.detail)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/download")
async def api_download(
    path: str = Query(...),
    current_device: PairedDevice = Depends(get_current_device)
):
    try:
        resolved = validate_and_resolve_path(path)
        if not resolved.is_file():
            raise HTTPException(status_code=400, detail="Target is not a file")
        audit_logger.log_action(
            action="files.download",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            metadata={"file": resolved.name}
        )
        return FileResponse(
            path=str(resolved),
            filename=resolved.name,
            media_type="application/octet-stream"
        )
    except PathSecurityError as e:
        raise HTTPException(status_code=403, detail=e.detail)

@router.post("/upload", response_model=StructuredResponse)
async def api_upload(
    file: UploadFile = File(...),
    target_dir: str = Form(...),
    current_device: PairedDevice = Depends(get_current_device)
):
    try:
        dest_dir = validate_and_resolve_path(target_dir)
        if not dest_dir.is_dir():
            raise HTTPException(status_code=400, detail="Target upload path is not a directory")

        # Sanitize filename
        safe_filename = Path(file.filename).name
        dest_file = dest_dir / safe_filename

        with open(dest_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        audit_logger.log_action(
            action="files.upload",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            metadata={"file": safe_filename, "target_dir": str(dest_dir)}
        )

        return StructuredResponse(
            success=True,
            action="files.upload",
            data={"filename": safe_filename, "path": str(dest_file)},
            message="File uploaded successfully"
        )
    except PathSecurityError as e:
        raise HTTPException(status_code=403, detail=e.detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mkdir", response_model=StructuredResponse)
async def api_mkdir(req: MkdirRequest, current_device: PairedDevice = Depends(get_current_device)):
    try:
        new_path = create_directory(req.parent_path, req.folder_name)
        audit_logger.log_action(
            action="files.mkdir",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            metadata={"new_folder": req.folder_name}
        )
        return StructuredResponse(
            success=True,
            action="files.mkdir",
            data={"path": new_path},
            message=f"Directory '{req.folder_name}' created"
        )
    except PathSecurityError as e:
        raise HTTPException(status_code=403, detail=e.detail)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/rename", response_model=StructuredResponse)
async def api_rename(req: RenameRequest, current_device: PairedDevice = Depends(get_current_device)):
    try:
        new_path = rename_item(req.source_path, req.new_name)
        return StructuredResponse(
            success=True,
            action="files.rename",
            data={"path": new_path},
            message=f"Renamed to '{req.new_name}'"
        )
    except PathSecurityError as e:
        raise HTTPException(status_code=403, detail=e.detail)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/delete", response_model=StructuredResponse)
async def api_delete(req: DeleteRequest, current_device: PairedDevice = Depends(get_current_device)):
    if not req.confirm:
        raise HTTPException(status_code=400, detail="Deletion requires explicit confirmation")
    try:
        delete_item(req.target_path)
        audit_logger.log_action(
            action="files.delete",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            metadata={"target": req.target_path}
        )
        return StructuredResponse(
            success=True,
            action="files.delete",
            message="Item deleted successfully"
        )
    except PathSecurityError as e:
        raise HTTPException(status_code=403, detail=e.detail)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
