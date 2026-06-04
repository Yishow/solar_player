## 1. Dashboard Hierarchy

- [x] 1.1 Implement `Keep device status as a dedicated dashboard family` so `Present device status as a summary-first observability dashboard` is visible on first scan instead of generic stacked status blocks; verify with apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx and a manual `/device-status` first-fold review.
- [x] 1.2 Implement `Present device status as a summary-first observability dashboard` so host health, display-operations health, and next-action guidance appear before deep telemetry or log detail; verify with apps/web/src/pages/DeviceStatus/viewModel.test.ts.

## 2. Diagnostics and Escalation Guidance

- [x] 2.1 Implement `Promote next-action guidance before deep diagnostics detail` so operators can see safe actions and escalation paths without scrolling through raw status stacks first; verify with apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx and a manual triage review.
- [x] 2.2 Implement `Show safe diagnostics results and host-level escalation guidance together` with truthful safe scope, result context, and unsupported-control guidance; verify with apps/web/src/pages/DeviceStatus/viewModel.test.ts and a content review of docs/runbooks/device-diagnostics-safe-ops.md.

## 3. Triage Surfaces

- [x] 3.1 Implement `Surface safe-ops results and escalation context as first-class panels` so diagnostics outcomes are no longer buried in generic feedback blocks; verify with apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx.
- [x] 3.2 Implement `Present alerts, liveness, and logs as triage surfaces instead of generic status stacks` so operators can identify the current incident shape and decide whether host-level investigation is required; verify with apps/web/src/pages/DeviceStatus/viewModel.test.ts and a manual alert/liveness/logs review.
