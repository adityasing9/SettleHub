# RCPC Security Specification

## Security Principles

RCPC is designed around zero-trust client interactions, defense in depth, and least privilege. Because the Windows Agent runs on the host machine with administrative capabilities, strict safeguards are enforced.

### 1. Cryptographic Device Pairing
- First-time pairing requires a 6-digit numeric PIN generated on the Windows host.
- Pairing codes expire automatically after 300 seconds.
- Successful verification issues a cryptographically signed HMAC-SHA256 JWT access token.
- Tokens are pinned to unique device identifiers and stored in `rcpc_vault.json`.

### 2. Device Vault & Revocation
- Every paired device is registered with `device_id`, `device_name`, `client_type`, `paired_at`, and `last_seen`.
- The Windows administrator or any active authorized device can instantly revoke access for any paired device.
- Revocation is verified synchronously on every request and WebSocket handshake.

### 3. Path Traversal & File Sandbox Security
- Arbitrary filesystem access is strictly disallowed.
- Access is restricted exclusively to authorized directories:
  - `Desktop/RCPC Shared`
  - `Downloads`
  - `Documents`
  - `Downloads/RCPC Uploads`
- Paths are canonicalized with `.resolve()`:
  - Relative escapes (`../`, `..\\`) are rejected.
  - Null-byte injections (`\0`) are blocked.
  - Out-of-sandbox absolute paths and drive-letter hopping are rejected with HTTP 403 Forbidden.
  - Root sandbox directory deletion is blocked.

### 4. Controlled Command Execution
- RCPC provides **NO arbitrary shell execution** endpoint (`shell=True` on raw client strings is strictly avoided).
- Only explicitly mapped, validated Windows APIs or allowlisted application binaries are permitted to launch.
- Dangerous actions (Shutdown, Restart, Sleep, Process termination, Deletion) require explicit confirmation flags.

### 5. Rate Limiting & Anti-Brute-Force
- In-memory sliding window rate limiter protects all endpoints (default 120 requests/minute per client IP).
- Pairing attempts are strictly throttled to prevent brute-forcing pairing PINs.

### 6. Audit Trail & Logging
- Every command, authentication attempt, file modification, and power state change is recorded into `rcpc_audit.log`.
- Sensitive tokens, passwords, and private clipboard data are sanitized and never written to logs.
