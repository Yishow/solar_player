## 1. Access boundary contract

- [x] 1.1 Expose origin-only trust classification while preserving token, loopback, same-host, and configured-origin decisions; verify with `apps/server/src/plugins/managementAuth.test.ts`.
- [x] 1.2 Require origin trust before unlock password verification and lockout mutation; verify with the untrusted-five-failures regression and existing trusted unlock tests in `apps/server/src/routes/management-auth.test.ts`.

## 2. Verification and closeout

- [x] 2.1 Confirm `Untrusted unlock attempts do not consume administrator lockout slots` and `Trusted unlock retains existing failure responses` pass with the focused server test command.
- [x] 2.2 Run `pnpm verify` and review the server-only diff for security scope boundaries before archiving.
