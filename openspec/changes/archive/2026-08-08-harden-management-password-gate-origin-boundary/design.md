## Context

The management password configuration mutation is intentionally outside the generic mutation hook because it is also the bootstrap path. Its handler currently treats a disabled gate as sufficient and performs no trusted-origin classification, so an arbitrary origin can enable the gate. The existing management access classifier already models the required trusted origin, same-host, loopback, and recovery-token rules.

## Goals / Non-Goals

**Goals:**

- Apply the existing trusted management mutation classification to password configuration mutations in both gate states.
- Preserve recovery-token access and trusted same-host bootstrap behavior.
- Prove that untrusted origin and remote requests cannot change gate state.

**Non-Goals:**

- No changes to the public state endpoint, password KDF, session storage, unlock protocol, or generic route registration.
- No new origin policy or alternate authentication mechanism.

## Decisions

### Reuse the existing management mutation classifier

The route SHALL call `app.managementAccess.isTrustedManagementMutationRequest(request)` before changing password state. This keeps origin and recovery-token semantics in one security boundary. Adding a password-specific origin parser would duplicate policy and risk drift.

### Keep route-specific password checks after the boundary

The route SHALL retain its existing enabled-state, new-password validation, current-password verification, session revocation, and response behavior after trusted management access is established. This keeps the fix surgical and avoids changing authentication UX.

## Implementation Contract

- Behavior: `PUT /api/management-auth/password` rejects an untrusted request with the existing management access denied envelope before any password state mutation, whether the gate is enabled or disabled.
- Trusted bootstrap: a same-host/loopback or configured trusted-origin request, or a valid management access token, can enable the disabled gate using the existing payload.
- Interface: no endpoint, payload, response, or database shape changes.
- Failure mode: denied requests return the existing 403 management access envelope and leave `management_password_settings` unchanged.
- Acceptance: targeted route tests cover untrusted bootstrap and trusted bootstrap; management access tests remain green; `spectra validate` and `pnpm verify` pass.
- Scope: only password mutation authorization and its tests/spec delta are in scope.

## Risks / Trade-offs

- [Risk] Existing non-browser automation may have relied on an unauthenticated bootstrap call. → Mitigation: the configured management access token remains accepted as a recovery/bootstrap path.
- [Risk] A route-local check could diverge from the shared hook. → Mitigation: call the existing classifier directly and add regression tests at the route boundary.
