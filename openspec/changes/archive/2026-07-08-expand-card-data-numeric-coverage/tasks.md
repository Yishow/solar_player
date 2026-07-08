## 1. Diagnostics Coverage

- [x] 1.1 Implement `Present card-centric data diagnostics in the MQTT Topic workspace` for Sustainability numeric rows; verify accumulated generation, carbon reduction, annual energy-saving percent, planted tree equivalent, and household rows in `apps/server/src/routes/display-card-data.test.ts`.
- [x] 1.2 Implement `Present card-centric data diagnostics in the MQTT Topic workspace` and `Provide data completion actions from card diagnostics` for Factory Circuit slot rows; verify slot metric key, topic state, publish/configure actions, and override action in `apps/server/src/routes/display-card-data.test.ts`.

## 2. Input Prefix UI Fix

- [x] 2.1 Implement `Keep Card Data Management input labels readable` by fixing Card Data Management publish/override input prefix CSS so labels render horizontally; verify with `apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts` and CSS selectors.

## 3. Verification

- [x] 3.1 Run Spectra validate/analyze for this change.
- [x] 3.2 Run focused server/web tests and `rtk pnpm run build`.
