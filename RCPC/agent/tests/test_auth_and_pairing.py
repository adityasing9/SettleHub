"""Tests for pairing, authentication, and token verification."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth.pairing import pairing_manager
from app.auth.vault import device_vault

client = TestClient(app)

def test_pairing_info_endpoint():
    response = client.get("/api/v1/auth/pairing-info")
    assert response.status_code == 200
    data = response.json()
    assert "code" in data
    assert "expires_in_seconds" in data
    assert "transports" in data

def test_pair_device_success_and_verify():
    # Get current valid code
    code = pairing_manager.generate_new_code()
    
    pair_payload = {
        "code": code,
        "device_id": "test-phone-12345",
        "device_name": "Test Pixel 8",
        "client_type": "PWA",
        "transport": "wifi"
    }
    
    # 1. Pair
    response = client.post("/api/v1/auth/pair", json=pair_payload)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert "token" in res_data["data"]
    token = res_data["data"]["token"]

    # 2. Verify token
    headers = {"Authorization": f"Bearer {token}"}
    verify_res = client.get("/api/v1/auth/verify", headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True

    # 3. List devices
    devices_res = client.get("/api/v1/auth/devices", headers=headers)
    assert devices_res.status_code == 200
    devices = devices_res.json()["devices"]
    assert any(d["device_id"] == "test-phone-12345" for d in devices)

    # 4. Revoke device
    revoke_res = client.delete("/api/v1/auth/devices/test-phone-12345", headers=headers)
    assert revoke_res.status_code == 200

    # 5. Access with revoked token should fail (403 Forbidden)
    revoked_verify = client.get("/api/v1/auth/verify", headers=headers)
    assert revoked_verify.status_code == 403

def test_pair_device_invalid_code():
    pair_payload = {
        "code": "00000000_INVALID",
        "device_id": "attacker-phone",
        "device_name": "Rogue Device"
    }
    response = client.post("/api/v1/auth/pair", json=pair_payload)
    assert response.status_code == 400
