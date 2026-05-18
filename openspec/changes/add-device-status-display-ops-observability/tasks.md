## 1. Display operations summary

- [ ] 1.1 Deliver `Extend Device Status with display operations summary` and reference `Extend Device Status with display operations summary instead of a separate dashboard` by aggregating live version, publish, and draft backlog data into the device-status response, verified by `pnpm --filter @solar-display/server test` coverage for summary aggregation.
- [ ] 1.2 Deliver `Show degraded display summary without hiding host health` by preserving existing host-health rendering when display summary data is unavailable, verified by targeted web tests for degraded device-status view states.

## 2. Readiness and asset alerts

- [ ] 2.1 Deliver `Show display readiness and skip alerts in Device Status` and reference `Reuse readiness, publish, and asset findings from other services` by surfacing current readiness and skip findings in the device-status display area, verified by targeted server aggregation tests and manual page checks.
- [ ] 2.2 Deliver `Include asset-health style findings in Device Status alerts` by carrying affected-page asset findings into the device-status alert summary, verified by targeted tests using unhealthy live references.

## 3. Safe diagnostics

- [ ] 3.1 Deliver `Keep Device Status diagnostics bounded to safe read and refresh actions` and reference `Keep diagnostics bounded to safe read and refresh actions` by exposing only safe refresh or export diagnostics from device-status actions, verified by targeted server route tests.
- [ ] 3.2 Deliver `Reuse display diagnostics outputs from shared services` by wiring device-status diagnostics to shared readiness, publish, or asset summaries, verified by integration-style tests that compare device-status diagnostics with shared-service outputs.
