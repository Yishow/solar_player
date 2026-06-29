## 1. MQTT save 與 trusted read 收尾

- [x] 1.1 Deliver `Persist MQTT and weather settings before broker reconnect outcome` by following `Persist MQTT settings before reconnect attempts`, so `PUT /api/settings/mqtt` keeps saved values even when reconnect fails, and verify with `apps/server/src/routes/settings-mqtt.test.ts` plus `pnpm --filter @solar-display/server exec tsx --test src/routes/settings-mqtt.test.ts`.
- [x] 1.2 Deliver `Trust same-host browser referer for read-only management requests` by following `Treat same-host referer as trusted only for read-only management requests`, so same-host GET diagnostics no longer fail without `Origin`, and verify with `apps/server/src/plugins/managementAuth.test.ts` plus `pnpm --filter @solar-display/server exec tsx --test src/plugins/managementAuth.test.ts`.

## 2. Overview 趨勢日界線與維運 API

- [x] 2.1 Deliver `Overview trend data is limited to the current local day` by following `Treat Overview trend as a current-day-only profile`, making the selector return an empty profile when today has no snapshots, and verify with `apps/server/src/services/generationTrendSeries.test.ts` plus `pnpm --filter @solar-display/server exec tsx --test src/services/generationTrendSeries.test.ts`.
- [x] 2.2 Deliver `Expose monitoring snapshot day diagnostics from Data Source Settings` and `Reset today trend clears only current-day monitoring snapshots` by following `Surface reset and anomaly diagnostics from the data-source operations page`, and verify with `apps/server/src/routes/data-source.test.ts` plus `pnpm --filter @solar-display/server exec tsx --test src/routes/data-source.test.ts`.

## 3. Data Source management surface 接線

- [x] 3.1 Deliver the Data Source monitoring diagnostics banner so anomaly messages and current-day snapshot status are visible in `/settings/data-source`, and verify with `apps/web/src/pages/DataSourceSettings/viewModel.test.ts` plus `pnpm --filter @solar-display/web exec tsx --test src/pages/DataSourceSettings/viewModel.test.ts`.
- [x] 3.2 Deliver the reset-today-trend management action wiring so the page can invoke the new API without disturbing existing coefficient save behavior, and verify with `pnpm run build`, `pnpm --filter @solar-display/server exec tsx --test src/routes/settings-mqtt.test.ts src/routes/data-source.test.ts src/routes/display-story.test.ts src/services/generationTrendSeries.test.ts`, and `pnpm --filter @solar-display/web exec tsx --test src/pages/DataSourceSettings/viewModel.test.ts`.
