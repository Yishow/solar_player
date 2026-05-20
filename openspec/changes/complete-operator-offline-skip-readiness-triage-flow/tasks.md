## 1. Shared triage summary

- [ ] 1.1 Deliver `Surface a shared triage path for offline, skip, and readiness faults` by defining a shared triage summary shape in `packages/shared/src/deviceDisplayOps.ts` and related adapters, and verify with view-model tests that affected pages, dominant reasons, and repair destinations are preserved for common fault types.
- [ ] 1.2 Deliver `Use a shared triage summary across Offline, Device Status, and Playback Settings` by wiring `apps/web/src/pages/OfflineError/viewModel.ts`, `apps/web/src/pages/DeviceStatus/viewModel.ts`, and `apps/web/src/pages/PlaybackSettings/viewModel.ts` to the same fault semantics, and verify through targeted page tests or view-model assertions.

## 2. Repair destinations and consistency

- [ ] 2.1 Deliver `Surface next-step destinations alongside blocking reason` by mapping dominant faults to governance destinations such as `MQTT Settings`, `Circuit Settings`, `Display Pages Editor`, or `Playback Settings`, and verify with tests that MQTT, slot-binding, stale-runtime, and unpublished faults each expose the expected destination.
- [ ] 2.2 Deliver `Keep fault triage semantics consistent across management surfaces` with regression coverage, and verify using `pnpm --filter @solar-display/web test -- src/pages/OfflineError/*.test.ts src/pages/DeviceStatus/*.test.tsx src/pages/PlaybackSettings/*.test.ts`.
