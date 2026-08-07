## Context

`POST /api/management-auth/unlock` is intentionally reachable without an existing management session, but the current route calls `verifyManagementPassword` directly. The shared access classifier already distinguishes trusted origin/token access from the password-session condition; the unlock route needs only the former so an administrator can establish the first session.

## Goals / Non-Goals

**Goals:**

- Make untrusted unlock requests fail before password KDF work and before the failed-attempt counter is updated.
- Keep same-host/configured-origin/loopback browser unlock and `MANAGEMENT_ACCESS_TOKEN` recovery working.
- Keep the existing 401/429 response shapes for trusted callers.

**Non-Goals:**

- Do not alter password verification, lockout threshold/cooldown, session issuance, or frontend behavior.
- Do not apply this change to playback-safe routes or other management mutations.

## Decisions

### Expose origin trust separately from password-session trust

Add `isTrustedManagementOriginRequest` to the shared access-control interface. It returns the classifier's `trusted` decision without requiring `passwordGateSatisfied`; a valid access token remains trusted. The unlock route uses this method because unlock is the operation that creates the session.

### Reject before password verification

The unlock handler checks origin trust before calling `verifyManagementPassword`. It returns the existing management access denied envelope for untrusted requests, ensuring those requests cannot consume failure slots or reveal lockout state.

## Implementation Contract

- Behavior: an untrusted `POST /api/management-auth/unlock` is denied with HTTP 403 and does not change `failed_attempts` or `locked_until`; after five such requests, a trusted caller with the correct password still unlocks successfully.
- Interface: `ManagementAccessControl` exposes `isTrustedManagementOriginRequest(request)`; it ignores the password-session condition but honors trusted origin, loopback, same-host, and `MANAGEMENT_ACCESS_TOKEN` classification.
- Failure modes: trusted callers retain the existing 401 incorrect-password and 429 cooldown responses; untrusted callers receive the existing access-denied envelope before password verification.
- Acceptance: focused management auth/plugin tests pass, `pnpm verify` passes, security review finds no lockout bypass, and the change archives with all tasks complete.
- Scope boundary: only server management access-control and unlock regression tests are in scope; web, Pi, schema, KDF, and session lifecycle files are out of scope.

## Risks / Trade-offs

- [Risk] A caller without an Origin header may be rejected if it is not loopback or same-host referer trusted. → Mitigation: preserve the existing classifier rules and explicitly test token and trusted browser flows.
- [Risk] Exposing a second classifier method could be misused by other routes. → Mitigation: document that it is for pre-session authentication entry points and use it only in the unlock route.
