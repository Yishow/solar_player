## 1. Authorization boundary

- [x] 1.1 Add a failing route test proving an untrusted origin cannot enable the disabled password gate and state remains disabled.
- [x] 1.2 Add a trusted same-host bootstrap regression test proving the existing supported bootstrap flow remains available.
- [x] 1.3 For `Protect management mutation APIs with a shared access boundary`, reuse the existing management mutation classifier before password state mutation and keep route-specific password checks after the boundary, preserving validation and session behavior.

## 2. Verification and handoff

- [x] 2.1 Run targeted management-auth and management boundary tests, then run `pnpm verify` and record actual output.
- [x] 2.2 Run `spectra validate --strict` and `spectra analyze harden-management-password-gate-origin-boundary --json`; resolve findings affecting the contract.
- [x] 2.3 Run security audit discipline over the changed route and tests, then archive this change with specs synced to main.
