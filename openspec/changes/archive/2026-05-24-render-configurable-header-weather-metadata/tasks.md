## 1. Header metadata 組裝

- [x] 1.1 實作 `Replace free-form weather copy with structured header metadata`，讓 `Compose header weather metadata into primary and secondary lines` 成立：header consumer 產生 `state`、`primaryText`、`secondaryText` 的結構化 metadata，而不是散落在各 layout 手拼字串；以 `pnpm --filter @solar-display/web exec tsx --test src/components/headerWeatherMeta.test.ts` 驗證。
- [x] 1.2 實作 `Keep the primary line focused on location, condition, and temperature` 與 `Collapse overflow into secondary text and then truncate gracefully`，讓主資訊優先顯示 location/condition/temperature，次資訊承接其餘欄位且不擠壓時鐘與 badge；以 `pnpm --filter @solar-display/web exec tsx --test src/components/headerWeatherMeta.test.ts src/components/AppHeader.test.ts` 驗證。

## 2. Header fallback 與 shell 整合

- [x] 2.1 實作 `Preserve a neutral slot across loading, disabled, and unavailable states`，讓 `Preserve the weather slot with explicit fallback states` 與 `Header does not display fabricated weather` 成立：weather slot 在 loading、disabled、unavailable、stale 都仍存在，且不得再出現 `晴 26°C` 之類假資料；以 `pnpm --filter @solar-display/web exec tsx --test src/components/AppHeader.test.ts` 驗證。
- [x] 2.2 [P] 實作 playback 與 management shell 共用的 weather mapper，讓 `Playback header reflects real connection status` 與 weather metadata 可同時存在，不因新 weather contract 打壞 badge 或 shell foundation；以 `pnpm --filter @solar-display/web exec tsx --test src/components/shellFoundation.test.ts src/layouts/LayoutShell.test.ts` 驗證。

## 3. 收尾驗證

- [x] 3.1 收斂 `AppHeader`、`LayoutShell`、`ManagementShell` 與 shared weather 型別，確保 `playback-header-weather-metadata` / `playback-header-live-status` 的規格與實作一致；以 `pnpm --filter @solar-display/web test`、`spectra analyze render-configurable-header-weather-metadata --json` 與 `spectra validate render-configurable-header-weather-metadata` 驗證。
