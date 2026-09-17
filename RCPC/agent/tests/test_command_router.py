"""Tests for Command Router, risk enforcement, and audit trail."""
import asyncio
from app.commands.router import CommandRouter
from app.commands.models import RiskLevel

def test_command_router_execution():
    async def _run_tests():
        router = CommandRouter()
        
        # Register low risk
        router.register("test.echo", lambda msg: f"Echo: {msg}", risk=RiskLevel.LOW)
        
        # Register high risk
        router.register("test.dangerous", lambda: "Executed dangerous action", risk=RiskLevel.HIGH)

        # 1. Low risk execution
        res1 = await router.execute(
            action="test.echo",
            params={"msg": "Hello"},
            device_id="dev-1",
            device_name="Phone"
        )
        assert res1.success is True
        assert res1.data == "Echo: Hello"

        # 2. High risk execution without confirmation should fail
        res2 = await router.execute(
            action="test.dangerous",
            params={},
            device_id="dev-1",
            device_name="Phone",
            confirmed=False
        )
        assert res2.success is False
        assert res2.error_code == "CONFIRMATION_REQUIRED"

        # 3. High risk execution with confirmation succeeds
        res3 = await router.execute(
            action="test.dangerous",
            params={},
            device_id="dev-1",
            device_name="Phone",
            confirmed=True
        )
        assert res3.success is True
        assert res3.data == "Executed dangerous action"

        # 4. Unknown command
        res4 = await router.execute(
            action="test.non_existent",
            params={},
            device_id="dev-1",
            device_name="Phone"
        )
        assert res4.success is False
        assert res4.error_code == "UNKNOWN_COMMAND"

    asyncio.run(_run_tests())
