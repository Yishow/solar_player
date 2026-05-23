## Context

`displayRotationService.buildPageConditions` 目前以 `readLiveMetricsSnapshot()` 的全域 `timestamp`（所有 metric 中最新者）計算單一布林 `metricsFresh`，再餵給 `resolveRuntimeDataCondition` 與 `isReady`。`live_metric_values` 每列已有各自 `timestamp`，`readLiveMetricsSnapshot` 回傳的 `metrics[key].timestamp` 即為逐 metric 時間戳。頁面所需 metric 已由 `@solar-display/shared` 的 `displayMetricRequirements`（`DisplayRequirementDescriptor[]`，含 `pageId`、`requirementKey`、`sourceType`、可選 `dependencyKeys`）定義。`liveDataPageKeys` 為 `overview`、`solar`、`factory-circuit`、`sustainability`。freshness window 來自 `mqtt_settings.message_timeout`（`readMessageTimeoutSeconds`）。既有伺服器測試 `apps/server/src/routes/playback.test.ts` 已有 DB harness：migrate、`INSERT INTO live_metric_values`、呼叫 `/api/display-pages/rotation-preview`。

## Goals / Non-Goals

**Goals:**

- 讓每頁的 stale-runtime 判定只依該頁實際需要的 metric。
- 一頁的關鍵 metric 過期時即被標記 stale，即使其他無關 metric 仍新鮮。
- 邏輯抽為 shared 純函式並完整單元測試。
- 保留 mock mode、fallback policy、`stale-runtime` skip reason 與 freshness window 來源。

**Non-Goals:**

- 不改 readiness（缺 MQTT mapping）判定，仍由 `displayReadinessService` 負責。
- 不改 freshness window 的設定來源（仍為 `message_timeout`）。
- 不改 `evaluateDisplayRotation`（shared）的整體流程與 `DisplayRotationPageCondition` 形狀。
- 不改前端輪播或 UI。

## Decisions

- **新增 shared 純函式而非散落於 server**：`packages/shared/src/displayPageFreshness.ts` 匯出 `resolveLiveMetricKeysForPage` 與 `evaluatePageRuntimeFreshness`。理由：`displayMetricRequirements` 已在 shared；純函式可直接以 vitest 覆蓋 Example 表，server 僅做薄接線。
- **derived-metric 以 dependencyKeys 衡量新鮮度**：derived 的 `requirementKey` 本身非 MQTT 直送值，真正會更新時間戳的是底層 dependency 值，故以 `dependencyKeys ?? [requirementKey]` 作為要檢查的 keys。
- **freshness 僅就「存在於 snapshot 的所需 metric」計算，但所需 metric 全缺視為 stale**：缺 mapping 屬 readiness 範疇；但若一頁所需 metric 在 snapshot 中完全沒有資料，代表無任何可播即時值，視為 stale 才正確。存在但過期的所需 metric 同樣使該頁 stale。
- **以每頁 `pageFresh` 取代全域 `metricsFresh`**：`buildPageConditions` 內對每個 live-data page 計算 `requiredMetricKeys` 與 `evaluatePageRuntimeFreshness`，將結果（fresh 與 stalest 資訊）傳入調整後的 `resolveRuntimeDataCondition` 與 `isReady`。非 live-data 頁不受影響。
- **detail 訊息以 stalest metric 呈現**：stale 時 detail 指出最舊的所需 metric key 與其時間戳，比原本「最後資料時間」更精確。

## Implementation Contract

- **Behavior**：當某 live-data 頁所需的關鍵 metric 斷流超過 freshness window，即使其他 metric 仍更新，該頁在 `staleData: "hide"` 下會被以 `stale-runtime` skip；同一 snapshot 下，所需 metric 均新鮮的頁面照常播放。
- **Interface / data shape**（`displayPageFreshness.ts` 匯出）：
  - `resolveLiveMetricKeysForPage(templateKey: DisplayPageTemplateKey): string[]`（去重；對非 live-data 或無對應 requirement 的頁回傳空陣列）。
  - `evaluatePageRuntimeFreshness(input: { requiredMetricKeys: string[]; metrics: Record<string, { timestamp: string }>; nowMs: number; freshnessWindowMs: number }): { fresh: boolean; stalestMetricKey: string | null; stalestTimestamp: string | null }`。
  - 規則：present = requiredMetricKeys 中存在於 metrics 者；present 為空 → `{ fresh: false, stalestMetricKey: null, stalestTimestamp: null }`；否則 fresh = present 全部 `nowMs - Date.parse(timestamp) <= freshnessWindowMs`；stalest = present 中時間戳最舊者（fresh 為 true 時 stalest 欄位回傳 null）。
  - `displayRotationService` 內 `resolveRuntimeDataCondition` 改以 `pageFresh: boolean` 與 `stalestTimestamp: string | null` 取代 `metricsFresh` 與 `liveMetricsTimestamp`；`buildPageConditions` 改為每頁計算 `pageFresh`。
- **Failure modes**：`timestamp` 無法 parse 的 metric 視為過期（保守，使該頁 stale）；`requiredMetricKeys` 為空（非 live-data 頁）→ 不施加 stale-runtime 條件（等同 fresh）；mock mode 分支維持原行為。
- **Acceptance criteria**：
  - `apps/server/__?` 不適用；shared 測試 `packages/shared/src/displayPageFreshness.test.ts` 覆蓋 `resolveLiveMetricKeysForPage`（solar 的 Example）與 `evaluatePageRuntimeFreshness` 的 Example 表三列（全新鮮→fresh、含過期→stale 且 stalest=todayGeneration、全缺→stale）。
  - 伺服器整合：擴充 `apps/server/src/routes/playback.test.ts`，seed 兩個 live-data 頁與 `live_metric_values`（A 所需 metric 新鮮、B 所需 metric 過期），呼叫 `/api/display-pages/rotation-preview` 後僅 B 以 `stale-runtime` 被 skip、A 在 playablePages。
  - `pnpm run build`、`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/shared` 受影響測試全綠。
- **Scope boundaries**：
  - In scope：shared 純函式與匯出、`displayRotationService.buildPageConditions`/`resolveRuntimeDataCondition` 改接線、shared 與 server 測試。
  - Out of scope：readiness 判定、freshness window 來源、`evaluateDisplayRotation` 流程、前端、`DisplayRotationPageCondition` 形狀。

## Risks / Trade-offs

- **行為變更可能讓更多頁被判 stale**：這是刻意修正（原本過於寬鬆）；以 fallback policy（`staleData !== "hide"` 仍照播）與精確 detail 控制衝擊。
- **derived dependency key 選取**：若某 requirement 的 dependencyKeys 與實際 MQTT key 不一致，可能誤判；以 `displayMetricRequirements` 既有定義為準，與 readiness 用同一來源，保持一致。
- **時間 parse 失敗保守視為過期**：避免把壞時間戳當新鮮，屬安全方向。
