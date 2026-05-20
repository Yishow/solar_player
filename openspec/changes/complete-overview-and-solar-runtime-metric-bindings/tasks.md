## 1. Metric coverage audit

- [x] 1.1 實作 `Provide declarative story metric binding for Overview` 的 coverage table，落實 `treat rendered metrics as a declared contract`，列出每個 Overview card 的 metric key、來源類型與 fallback 規則。
- [x] 1.2 實作 `Provide flow state storytelling for Solar` 的 coverage table，列出 Solar flow node 與 KPI 的來源類型、derived dependency 與 comparison dependency。

## 2. Story and readiness contract

- [x] 2.1 擴充 `displayStoryService` 與 shared types，讓 `Overview`、`Solar` story payload 帶出可檢查的 provenance/binding/fallback 狀態，落實 `make provenance explicit in story payloads`。
- [x] 2.2 調整 `displayReadinessService` 與 `packages/shared/src/displayReadiness.ts`，落實 `align readiness with real rendered dependencies`。

## 3. Playback verification

- [x] 3.1 更新 `Overview`、`Solar` view model 與 render tests，覆蓋 missing metric、stale metric、derived fallback 與 comparison target 缺失。
- [x] 3.2 執行受影響 server/web tests 與 build，確認新 coverage 不會破壞既有 story-driven rendering。
