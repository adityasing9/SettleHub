#!/usr/bin/env python3
"""Launcher for RCPC Windows Agent."""
import os
import sys
from pathlib import Path
import uvicorn

# Ensure agent directory is in Python path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from app.config import settings

def main():
    print("=" * 65)
    print("  Starting RCPC — Remote Control & PC Management Windows Agent")
    print(f"  Listening on {settings.host}:{settings.port}")
    print("=" * 65)
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )

if __name__ == "__main__":
    main()
