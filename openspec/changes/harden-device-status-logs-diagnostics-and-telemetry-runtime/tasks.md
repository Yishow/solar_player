## 1. Trusted diagnostics and telemetry

- [x] 1.1 Deliver `Keep Device Status diagnostics bounded to safe read and refresh actions` by aligning `apps/server/src/routes/device-display-ops.ts`, `apps/server/src/services/deviceDisplayOpsService.ts`, and `apps/web/src/pages/DeviceStatus/index.tsx` so each diagnostics action returns a truthful safe result for the named action, and verify with `apps/server/src/routes/device-display-ops.test.ts` plus `apps/web/src/pages/DeviceStatus/viewModel.test.ts`.
- [x] 1.2 Deliver `Keep device diagnostics bounded but truthful`, `Show only trusted runtime telemetry in Device Status`, and `replace placeholder telemetry with measured or unavailable values` by removing placeholder telemetry values from `apps/web/src/pages/DeviceStatus/viewModel.ts` and replacing them with measured or unavailable states, and verify with `apps/web/src/pages/DeviceStatus/viewModel.test.ts` that unavailable telemetry no longer falls back to invented values.

## 2. ESM-safe log access

- [x] 2.1 Deliver `Provide ESM-safe Device Status log access` by updating `apps/server/src/routes/device.ts` so recent log listing and export metadata remain callable in the current Node ESM runtime, and verify with `apps/server/src/routes/device.test.ts` that both success and missing-directory paths return safe envelopes.
- [x] 2.2 Deliver `Make device log access ESM-safe` end to end by wiring any required API/view-model changes in `apps/web/src/services/api.ts` and `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx`, and verify with `pnpm --filter @solar-display/server test -- src/routes/device*.test.ts` and `pnpm --filter @solar-display/web test -- src/pages/DeviceStatus/*.test.tsx src/pages/DeviceStatus/viewModel.test.ts`.
