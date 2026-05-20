## 1. Near-real-time runtime preview

- [x] 1.1 Deliver `Stream MQTT runtime preview feedback to the management surface` by updating `apps/web/src/pages/MqttSettings/index.tsx`, `apps/web/src/pages/MqttSettings/viewModel.ts`, and any supporting socket/runtime adapters so topic activity appears through near-real-time updates instead of coarse polling alone, and verify with MQTT settings page tests.
- [x] 1.2 Deliver `Drive MQTT runtime preview from live updates instead of coarse polling` by defining the merge/fallback behavior between bootstrap reload and live preview updates, and verify with `apps/web/src/pages/MqttSettings/viewModel.test.ts` cases for live, idle, and disconnected topics.

## 2. Readiness-aligned feedback

- [x] 2.1 Deliver `Evaluate MQTT settings coverage against display metric requirements` with runtime-aligned feedback by updating `apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx`, `apps/server/src/routes/settings-mqtt.ts`, and any supporting realtime plumbing so operators can distinguish mapping gaps from idle runtime topics, and verify with web tests plus route-level coverage where needed.
- [x] 2.2 Deliver `Keep readiness feedback aligned with streamed topic state` and `Preserve a readable fallback when live MQTT preview streaming is unavailable`, and verify using `pnpm --filter @solar-display/web test -- src/pages/MqttSettings/*.test.ts` and `pnpm --filter @solar-display/server test -- src/routes/settings-mqtt*.test.ts`.
