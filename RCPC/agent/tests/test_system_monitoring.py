"""Tests for real-time telemetry collector and system info."""
from app.monitoring.collector import collect_telemetry
from app.system.info import get_system_info

def test_telemetry_collection():
    data = collect_telemetry()
    assert "cpu" in data
    assert "percent" in data["cpu"]
    assert "memory" in data
    assert "total" in data["memory"]
    assert "percent" in data["memory"]
    assert "disks" in data
    assert isinstance(data["disks"], list)
    assert "network_io" in data

def test_system_info():
    info = get_system_info()
    assert "hostname" in info
    assert "os_name" in info
    assert "architecture" in info
    assert "uptime_seconds" in info
    assert info["uptime_seconds"] >= 0
