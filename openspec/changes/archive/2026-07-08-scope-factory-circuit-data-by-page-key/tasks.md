## 1. 規格與測試紅燈

- [x] 1.1 Site-Specific Load Visibility and Geometry Configuration 與 Factory Circuit story resolves by page key：新增 route/service 測試證明 `factory-circuit` 只加總 6 個中壢 scoped slots、`factory-circuit-guanyin` 加總 8 個觀音 scoped slots；驗證 `rtk pnpm --filter @solar-display/server exec tsx --test src/routes/display-story.test.ts` 先因未實作分廠 scope 失敗。
- [x] 1.2 Store circuit-to-display slot binding explicitly 與 Circuit bindings keep display slot names but add page key：新增 circuits route 測試證明 `GET /api/circuits?pageKey=...` 會分別回傳中壢與觀音 rows 且 POST/PUT 保存 `pageKey`；驗證 `rtk pnpm --filter @solar-display/server exec tsx --test src/routes/circuits.test.ts` 先失敗。
- [x] 1.3 Factory Circuit card diagnostics are page-scoped 與 Card Data Management lists Factory Circuit page instances separately：新增 display-card-data 測試證明中壢與觀音 slot diagnostics 有不同 `cardId` 與 metric key；驗證 `rtk pnpm --filter @solar-display/server exec tsx --test src/routes/display-card-data.test.ts` 先失敗。

## 2. 資料模型與服務實作

- [x] 2.1 Page key scopes Factory Circuit circuit data：新增 `circuit_configs.page_key` migration、shared `CircuitConfig.pageKey`、seed 中壢/觀音 circuit rows，並補 `020_fix_factory_circuit_site_counts.sql` 修復已跑過 019 的既有 DB 會把大車/ED 留在中壢的情境；驗證 affected server tests 可以讀到 page-scoped rows。
- [x] 2.2 Factory Circuit metric keys are page-scoped 與 Factory Circuit metric keys are page-scoped where site separation matters：集中 Factory Circuit slot metric key resolution，讓 Guanyin 使用 distinct metric keys 且 legacy Jungli keys 相容；驗證 display-story 與 display-card-data tests 通過。
- [x] 2.3 Factory Circuit monitoring story supports page instances 與 Factory Circuit story resolves by page key：更新 display story route/service 與 aggregate dependency keys，讓 page-scoped story、totalPower、readiness 使用相同 slot scope；驗證 display-story 與 display-readiness tests 通過。

## 3. 管理面與收斂驗證

- [x] 3.1 Factory Circuit card diagnostics are page-scoped：更新 Card Data Management 與相關 shared types，讓 Factory Circuit rows 顯示 page instance identity 並發布到 page-scoped metric；驗證 MQTT settings 與 display-card-data tests 通過。
- [x] 3.2 Final verification：執行 `rtk spectra analyze scope-factory-circuit-data-by-page-key --json`、`rtk spectra validate`、affected server/web tests、`rtk pnpm run build`，全部通過後才完成 change。
