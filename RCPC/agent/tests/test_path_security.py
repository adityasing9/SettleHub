"""Security tests for path traversal attacks and sandbox validation."""
import pytest
from pathlib import Path
from app.security.path_validator import validate_and_resolve_path, PathSecurityError

def test_path_traversal_attempts(tmp_path):
    # Setup mock allowed directory
    sandbox_dir = tmp_path / "sandbox"
    sandbox_dir.mkdir()
    (sandbox_dir / "safe.txt").write_text("safe content")

    # Outside file
    outside_file = tmp_path / "secret.txt"
    outside_file.write_text("secret")

    allowed_roots = [sandbox_dir]

    # Valid access
    resolved = validate_and_resolve_path("safe.txt", allowed_dirs=allowed_roots)
    assert resolved == (sandbox_dir / "safe.txt").resolve()

    # Traversal attack ../
    with pytest.raises(PathSecurityError):
        validate_and_resolve_path("../secret.txt", allowed_dirs=allowed_roots)

    # Windows style ..\\
    with pytest.raises(PathSecurityError):
        validate_and_resolve_path("..\\secret.txt", allowed_dirs=allowed_roots)

    # Multi-level traversal
    with pytest.raises(PathSecurityError):
        validate_and_resolve_path("../../../../../../../Windows/System32", allowed_dirs=allowed_roots)

    # Absolute path outside sandbox
    with pytest.raises(PathSecurityError):
        validate_and_resolve_path(str(outside_file), allowed_dirs=allowed_roots)

    # Null byte attack
    with pytest.raises(PathSecurityError):
        validate_and_resolve_path("safe.txt\x00.exe", allowed_dirs=allowed_roots)
