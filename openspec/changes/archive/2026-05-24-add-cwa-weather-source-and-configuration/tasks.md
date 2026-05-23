## 1. Provider 與設定持久化

- [x] 1.1 實作 `Use server-side CWA integration and normalized contracts`，讓 `Normalize CWA observations before exposing them to internal consumers` 成立：server 以 CWA O-A0001-001 取回觀測資料並轉成 normalized weather contract，而不是把 `X`、`-99`、`990` 之類 magic values 直接外露；以 `pnpm --filter @solar-display/server exec tsx --test src/services/cwaWeatherClient.test.ts src/services/weatherService.test.ts` 驗證。
- [x] 1.2 實作 `Persist weather settings as a first-class management contract`，讓 `Persist configurable weather source settings for management surfaces` 成立：weather settings 以 migration/schema/service 持久化 `enabled`、`locationMode`、`countyName`、`stationId`、`preset`、`fieldKeys`，reload 後仍可讀回同一組設定；以 `pnpm --filter @solar-display/server exec tsx --test src/services/weatherSettingsService.test.ts src/routes/weather.test.ts` 驗證。

## 2. API 與同步範圍

- [x] 2.1 實作 `Separate settings endpoints from current weather endpoints` 與 `Cache the last successful observation and mark stale data explicitly`，讓 `GET /api/weather/settings`、`PUT /api/weather/settings`、`GET /api/weather/options`、`GET /api/weather/current` 交付穩定 JSON 契約，並讓 `Serve cached current weather with an explicit stale state` 成立；以 `pnpm --filter @solar-display/server exec tsx --test src/routes/weather.test.ts src/services/weatherService.test.ts` 驗證。
- [x] 2.2 實作 `Add an explicit weather sync scope`，讓 `Refresh management surfaces only for relevant display sync scopes` 與 `Defer only relevant remote changes while a management draft is dirty` 能辨識 `weather` scope，並在 weather 設定儲存後發出正確 sync event；以 `pnpm --filter @solar-display/web exec tsx --test src/pages/managementDisplaySync.test.ts` 與 `pnpm --filter @solar-display/server exec tsx --test src/routes/weather.test.ts` 驗證。

## 3. 契約收斂與驗證

- [x] 3.1 將 `packages/shared/src/weather.ts` 與 server config 收斂成可被後續 header / management change 重用的 weather 型別與 env 契約，讓 `cwa-weather-source-configuration` 的共享資料形狀固定下來；以 `pnpm --filter @solar-display/shared build`、`spectra analyze add-cwa-weather-source-and-configuration --json` 與 `spectra validate add-cwa-weather-source-and-configuration` 驗證。
