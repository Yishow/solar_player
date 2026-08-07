## Why

The public management unlock endpoint currently performs password verification before checking whether the caller is a trusted management origin. An untrusted caller can therefore consume all failed-attempt slots and lock out the legitimate administrator. The lockout counter must only be affected by callers allowed to reach management authentication.

## What Changes

- Require a trusted management origin, loopback caller, or valid `MANAGEMENT_ACCESS_TOKEN` before `/api/management-auth/unlock` verifies a password or changes lockout state.
- Preserve the public gate-state endpoint, trusted browser unlock flow, token recovery flow, password KDF, and session behavior.
- Add regression coverage proving five untrusted failures cannot lock out a trusted administrator.

## Non-Goals

- No changes to web lifecycle, playback routes, Pi deployment, password hashing, cooldown duration, or session lifetime.
- No new rate-limit mechanism beyond the existing trusted-caller failure counter.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `management-api-access-boundaries`: management unlock attempts must pass the trusted-origin boundary before password verification.

## Impact

- Affected code:
  - Modified: `apps/server/src/plugins/managementAuth.ts`
  - Modified: `apps/server/src/routes/management-auth.ts`
  - New: `apps/server/src/routes/management-auth.test.ts` (regression coverage in existing test file)
- No database or dependency changes.
