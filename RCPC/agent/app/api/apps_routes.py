"""Process management and allowlisted application launcher endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.dependencies import get_current_device
from app.auth.vault import PairedDevice
from app.commands.models import StructuredResponse
from app.applications.manager import (
    get_running_processes,
    get_allowlisted_apps,
    launch_application,
    terminate_process
)
from app.logging_config import audit_logger

router = APIRouter(prefix="/api/v1/apps", tags=["Applications & Processes"])

class LaunchRequest(BaseModel):
    app_name: str

class TerminateRequest(BaseModel):
    pid: int
    confirm: bool = False

@router.get("/allowlist", response_model=StructuredResponse)
async def list_apps(current_device: PairedDevice = Depends(get_current_device)):
    apps = get_allowlisted_apps()
    return StructuredResponse(success=True, action="apps.allowlist", data=apps)

@router.get("/processes", response_model=StructuredResponse)
async def list_processes(current_device: PairedDevice = Depends(get_current_device)):
    procs = get_running_processes()
    return StructuredResponse(success=True, action="apps.processes", data=procs)

@router.post("/launch", response_model=StructuredResponse)
async def launch_app(req: LaunchRequest, current_device: PairedDevice = Depends(get_current_device)):
    try:
        res = launch_application(req.app_name)
        audit_logger.log_action(
            action="apps.launch",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            metadata={"app": req.app_name, "pid": res.get("pid")}
        )
        return StructuredResponse(success=True, action="apps.launch", data=res, message=f"Launched {req.app_name}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/terminate", response_model=StructuredResponse)
async def terminate_proc(req: TerminateRequest, current_device: PairedDevice = Depends(get_current_device)):
    if not req.confirm:
        raise HTTPException(status_code=400, detail="Process termination requires confirmation")
    try:
        res = terminate_process(req.pid)
        audit_logger.log_action(
            action="apps.terminate",
            result="SUCCESS",
            device_id=current_device.device_id,
            device_name=current_device.device_name,
            metadata={"pid": req.pid, "name": res.get("name")}
        )
        return StructuredResponse(success=True, action="apps.terminate", data=res, message=f"Terminated PID {req.pid}")
    except (ValueError, PermissionError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
