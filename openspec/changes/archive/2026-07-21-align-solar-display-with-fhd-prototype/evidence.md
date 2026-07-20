# Final FHD Prototype Rollout Evidence

## Final Verification

Date:
2026-05-13

### Commands

1. `pnpm --filter @solar-display/web build`
   - Result: pass
2. `pnpm --filter @solar-display/web test`
   - Result: pass (`12/12`)
3. `pnpm --filter @solar-display/server test`
   - Result: pass (`41/41`)
4. `spectra analyze align-solar-display-with-fhd-prototype --json`
   - Result: clean (`Coverage / Consistency / Ambiguity / Gaps` 全部 `Clean`)
5. `spectra validate align-solar-display-with-fhd-prototype`
   - Result: valid

## Phase Bundle Inventory

- Phase 1 shell foundation:
  - `openspec/changes/align-solar-display-shell-and-mapping-foundation/evidence.md`
- Playback batch A:
  - `openspec/changes/align-solar-display-playback-overview-solar/evidence.md`
- Playback batch B:
  - `openspec/changes/align-solar-display-playback-factory-circuit/evidence.md`
- Playback batch C:
  - `openspec/changes/align-solar-display-playback-images-sustainability/evidence.md`
- Settings batch A:
  - `openspec/changes/align-solar-display-settings-playback-images/evidence.md`
- Settings batch B:
  - `openspec/changes/align-solar-display-settings-mqtt/evidence.md`
- Settings batch C:
  - `openspec/changes/align-solar-display-settings-circuits/evidence.md`
- Monitoring / maintenance batch:
  - `openspec/changes/align-solar-display-monitoring-pages/evidence.md`

## 14-Route Coverage Review

Local current-route screenshots are intentionally kept untracked under:
- `artifacts/umbrella-final-fhd/`

| Prototype | Route | Page file | Shared primitives | Major runtime data source | Reference-only content | Fallback-only content | Verification command | Screenshot evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `01-overview.html` | `/overview` | `apps/web/src/pages/Overview/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `MetricCard`, `StatusBadge`, `Sparkline` | `useLiveMetrics()` + `apps/web/src/mocks/metrics.ts` fallback | hero slogan / image composition | fallback KPI and summary copy when live metrics absent | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test -- src/pages/Overview/viewModel.test.ts src/pages/Solar/viewModel.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts src/layouts/offlineRouting.test.ts` | `artifacts/umbrella-final-fhd/01-overview.png` |
| `02-solar.html` | `/solar` | `apps/web/src/pages/Solar/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `FlowNode`, `FlowConnector`, `MetricCard` | current page-local metrics adapter + fallback snapshot presentation | flow ornament / static composition | mock KPI values until live source is connected | same as `01` batch-A command set | `artifacts/umbrella-final-fhd/02-solar.png` |
| `03-factory-circuit.html` | `/factory-circuit` | `apps/web/src/pages/FactoryCircuit/index.tsx` | `PageScaffold`, `PanelCard`, `FlowNode`, `StatusBadge`, `MetricCard` | `requestJson('/api/circuits')` via page-local adapter | diagram rhythm / decorative layout | empty circuit state copy and placeholder rows | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test -- src/pages/FactoryCircuit/viewModel.test.ts src/layouts/offlineRouting.test.ts` | `artifacts/umbrella-final-fhd/03-factory-circuit.png` |
| `04-images.html` | `/images` | `apps/web/src/pages/Images/index.tsx` | `PageScaffold`, `TitleBlock`, `MediaSlot`, `PanelCard` | `apps/web/src/mocks/images.ts` | media frame / thumbnail hierarchy | placeholder asset metadata when runtime asset missing | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test -- src/pages/Images/viewModel.test.ts src/pages/Sustainability/viewModel.test.ts` | `artifacts/umbrella-final-fhd/04-images.png` |
| `05-sustainability.html` | `/sustainability` | `apps/web/src/pages/Sustainability/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `MetricCard` | `apps/web/src/mocks/sustainability.ts` | storytelling layout / ESG composition | readable fallback summary numbers and cards | same as `04` batch-C command set | `artifacts/umbrella-final-fhd/05-sustainability.png` |
| `06-energy-trend-summary.html` | `/trends` | `apps/web/src/pages/EnergyTrend/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `ActionCluster` | `/api/metrics/history` + live KPI overlay | chart grouping / tab layout | sparse history fallback copy | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test` | `artifacts/umbrella-final-fhd/06-trends.png` |
| `07-playback-settings.html` | `/settings/playback` | `apps/web/src/pages/PlaybackSettings/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `ActionCluster`, `KioskInput`, `KioskSelect`, `KioskToggle` | `getPlaybackSettings()`, `getPlaybackPages()`, `updatePlaybackSettings()`, `updatePlaybackPages()` | form grouping / action hierarchy | helper and save-status copy when no new runtime value exists | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/server exec tsx --test src/routes/playback.test.ts src/routes/images.test.ts` | `artifacts/umbrella-final-fhd/07-settings-playback.png` |
| `08-image-management.html` | `/settings/images` | `apps/web/src/pages/ImageManagement/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `StatusBadge`, `ActionCluster` | image library API surface + empty library fallback | asset row composition / quick-action placement | empty library placeholder and edit-panel empty state | same as `07` settings batch-A command set | `artifacts/umbrella-final-fhd/08-settings-images.png` |
| `09-mqtt-settings.html` | `/settings/mqtt` | `apps/web/src/pages/MqttSettings/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `StatusBadge`, `ActionCluster`, `KioskInput`, `KioskToggle` | `/api/settings/mqtt`, `/api/settings/mqtt/topics`, `/api/settings/mqtt/test`, `/api/settings/mqtt/reload` | dense action area / broker form layout | mock-mode failure banner and idle topic preview | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/server test` | `artifacts/umbrella-final-fhd/09-settings-mqtt.png`; `artifacts/umbrella-final-fhd/09-settings-mqtt-test-success.png` |
| `10-circuit-settings.html` | `/settings/circuits` | `apps/web/src/pages/CircuitSettings/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `ActionCluster`, `KioskInput`, `KioskToggle` | circuits CRUD routes via `requestJson('/api/circuits')` | dense table / legend / side feedback composition | dirty-state / error-state default labels | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/server test` | `artifacts/umbrella-final-fhd/10-settings-circuits.png` |
| `11-energy-data-history.html` | `/history` | `apps/web/src/pages/EnergyHistory/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `MetricCard`, `DataCardGrid` | `/api/metrics/history`, `/api/metrics/daily-summary`, `/api/metrics/cumulative` | dense table and summary layout | sparse history rows and totals fallback rendering | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test` | `artifacts/umbrella-final-fhd/11-history.png` |
| `12-offline-error-display.html` | `/offline` | `apps/web/src/pages/OfflineError/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `StatusBadge`, `ActionCluster` | `useLiveMetrics()`, `useMqttStatus()`, `location.state.returnTo`, reconnect timer | alert illustration / bilingual tone | reconnect reason and retry copy when disconnected | `pnpm --filter @solar-display/web test`; `pnpm --filter @solar-display/server test` | `artifacts/umbrella-final-fhd/12-offline.png` |
| `13-slideshow-preview.html` | `/slideshow-preview` | `apps/web/src/pages/SlideshowPreview/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `ActionCluster`, `MediaSlot` | `usePageRotation()` | preview framing / queue composition | empty queue fallback copy | `pnpm --filter @solar-display/web test`; `pnpm --filter @solar-display/server test` | `artifacts/umbrella-final-fhd/13-slideshow-preview.png` |
| `14-device-status-details.html` | `/device-status` | `apps/web/src/pages/DeviceStatus/index.tsx` | `PageScaffold`, `TitleBlock`, `PanelCard`, `MetricCard`, `ActionCluster` | `/api/device/status`, `/api/device/reboot`, `/api/device/clear-cache` | hardware storytelling / resource-card composition | maintenance failure and stub feedback copy | `pnpm --filter @solar-display/web build`; `pnpm --filter @solar-display/web test`; `pnpm --filter @solar-display/server test` | `artifacts/umbrella-final-fhd/14-device-status.png`; `artifacts/umbrella-final-fhd/14-device-status-clear-cache.png`; `artifacts/umbrella-final-fhd/14-device-status-system-update.png` |

## 14-Route Walkthrough Summary

### Shell consistency

- `/overview` 與 `/settings/playback` witness screenshots 顯示同一套 header、environment badge、MQTT chip、page number pill、footer navigation 與 branding tail。
- `01-14` current-route screenshots 也都維持一致的 FHD shell family，沒有任何 route 回退到舊 dashboard chrome。

### Page number and footer navigation

- page number 自 `1/14` 到 `14/14` 都正確映射 route order。
- footer rail 在所有 screenshots 中都保留同一組導航結構，且目前 route 的 nav pill 正確高亮。

### Offline behavior

- `/offline` screenshot `artifacts/umbrella-final-fhd/12-offline.png` 顯示 dedicated reconnect layout、最後更新時間、return path 與 mock-mode disconnect reason。
- redirect / reconnect contract 另外由 fresh web test 覆蓋，confirm offline-capable 與 non-offline routes 的 redirect behavior 未回歸。

### Settings smoke

- `/settings/playback`
  - screenshot 顯示 summary cards、輪播控制表單、save panel 同屏可讀。
- `/settings/images`
  - screenshot 顯示空 library fallback、upload zone、sync panel、edit panel 都保留完整結構。
- `/settings/mqtt`
  - `artifacts/umbrella-final-fhd/09-settings-mqtt.png` 顯示 mock-mode failure banner，確認未連實體 broker 時不會沉默失敗。
  - `artifacts/umbrella-final-fhd/09-settings-mqtt-test-success.png` 顯示切到 MQTT mode 後 `Test connection 成功 / Connected successfully` 的 visible feedback。
- `/settings/circuits`
  - screenshot 顯示 dense CRUD table、summary cards、feedback panel 與 isolated batch scope note。
- `/device-status`
  - `artifacts/umbrella-final-fhd/14-device-status-clear-cache.png` 顯示 `清除快取完成` feedback。
  - `artifacts/umbrella-final-fhd/14-device-status-system-update.png` 顯示 `更新系統失敗 / 目前尚未實作 system update endpoint。` feedback，沒有被新 layout 吞掉。

## Remaining Notes

- local browser walkthrough artifacts 保持未追蹤，不納入版控。
- `9.1`、`9.2`、`9.3` 所需的 coverage review、walkthrough summary 與 Spectra artifact checks 都已在本檔完成收尾。
