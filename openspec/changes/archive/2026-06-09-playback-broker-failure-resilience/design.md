## Context

播放牆的整頁輪播由 `usePlaybackController` 驅動，但「哪些頁可播」來自 server 的 `displayRotationService`。該服務對每個 live-data 頁（overview、solar、factory-circuit、sustainability）呼叫 `resolveRuntimeDataCondition`：當該頁所需 metric 的最後時間超過 freshness window（`mqtt_settings.message_timeout`，預設 30 秒）且該頁 fallback policy 的 staleData 為 hide 時，回傳 `skipReason: "stale-runtime"`，並把該頁排除在 `playablePages` 之外。

由於五頁中有四頁依賴 live metric，broker 一旦故障或停止發佈，超過 window 後這四頁同時被排除，輪播只剩 images，等同整面牆卡住。需求是：broker 故障時仍要維持原本的整頁輪播。

現況事實（已查證）：
- live metric 值持久保存在 `live_metric_values` 表；`readLiveMetricsSnapshot` 只回有 value 且有 timestamp 的列。因此「某 required metric key 不在 snapshot」即代表「從未收過該 metric」，而「在 snapshot 但 timestamp 過舊」代表「曾有資料、現在過期」。
- freshness 判定在 shared 的 `evaluatePageRuntimeFreshness`，輸入 requiredMetricKeys 與 metrics，輸出 `{ fresh, stalestMetricKey, stalestTimestamp }`，目前不區分「從未有資料」與「過期」。
- 播放 shell header 已透過 `resolveHeaderConnectionMeta` 反映真實 MQTT 連線狀態（capability：playback-header-live-status）；broker 離線時 header 會顯示離線狀態。
- rotation gate 的 staleData policy 只來自 shared 靜態 map `displayPageFallbackPolicyByTemplateKey`（經 `resolveDisplayPageFallbackPolicyByPageId`），不讀每頁 editor/DB 設定。
- `resolveRuntimeDataCondition` 另有 mock-mode 分支；broker 故障時連線 reason 為離線/重連而非 mock，故走的是非 mock 的 stale 分支。

## Goals / Non-Goals

**Goals:**

- broker 故障（曾連線、現在資料過期）時，四個 live-data 頁仍留在輪播中，渲染最後已知值，整頁輪播照常進行。
- 區分「曾有資料、現在過期（degraded，續播）」與「從未收過所需 metric（cold，可排除）」兩種狀態，並讓 stale-runtime 只在後者作為排除原因。
- not-live 提示沿用既有 header live-status badge，毋須新增 per-page 元件。
- 更新既有契約測試以反映韌性優先行為，並新增涵蓋兩種狀態的測試。

**Non-Goals:**

- 不更動 freshness window 機制（message_timeout）與 per-metric freshness key 解析邏輯本身。
- 不更動 schedule/idle gating、mock-mode 行為、readiness（mapping/binding 缺失）gating——後者是設定缺失的正當阻擋，與資料過期無關。
- 不更動換頁過場、圖片播放模式（屬其他 change）。
- 本 change 不新增 per-page 細緻 staleness 指示元件，也不新增 rotation-preview/display-ops 的 degraded 欄位（列為 Open Question 之後評估）。
- 不放寬或改寫 FallbackPolicyMode 列舉值。

## Decisions

**決策 1：把韌性做成 rotation gate 的不變量，而非翻 policy 列舉值。**
- 在 `resolveRuntimeDataCondition`（或其呼叫端）區分 never-had-data 與 stale-with-data：
  - stale-with-data（所需 metric 都曾有讀數，但至少一個過期）→ 不回傳 skip，頁面留在輪播，渲染最後已知值。
  - never-had-data（至少一個所需 metric 從未有讀數）→ 維持依 staleData policy（hide）排除，並回報對應 skip reason。
- 替代方案：把四頁的 staleData 由 hide 改成 show-placeholder（先前實測會讓五頁皆可播）。否決原因：那是全域翻 policy、會反轉「曾有資料 vs 從未有資料」都一視同仁，且 show-placeholder 語意是顯示佔位而非最後已知值；本決策語意更精準且 blast radius 更小（不需改 staleData 值，`/live` 回傳 staleData=hide 的契約測試維持不變）。

**決策 2：never-had-data 的判定放在 shared freshness 評估。**
- 擴充 `evaluatePageRuntimeFreshness` 的輸出，加入「所需 metric 是否皆有讀數」的旗標（例如 `hasRequiredData`：每個 requiredMetricKey 在 metrics 中都有一筆 reading 時為 true，與是否新鮮無關）。
- rotation gate 依 `(fresh, hasRequiredData)` 決策：`!fresh && hasRequiredData` → degraded 續播；`!hasRequiredData` → 依 policy 排除。
- 替代方案：在 rotation service 直接檢查 `liveMetrics.metrics` 是否含 required key。否決原因：freshness 評估已逐一走訪 required keys 與 metrics，集中在 shared 可被單元測試覆蓋且兩處邏輯一致。

**決策 3：not-live 提示沿用既有 header live-status。**
- broker 離線時 header 既有的連線 badge 已提供「資料延遲/離線」的牆面提示；本 change 不新增 per-page 指示元件。
- 替代方案：新增 per-page staleness 角標。否決原因：超出 broker 故障韌性的最小範圍，且 header 已足以表達；細緻 per-metric 提示列為後續。

**決策 4：staleData policy 語意以註解澄清，但不改值。**
- 在 `displayPageConfig.ts` 的 policy map 旁加註：staleData 的 hide 僅適用於 never-had-data；transient staleness 一律續播。值不變，避免反轉 `/live` 契約。

## Implementation Contract

**行為（Behavior）：**
- 當所需 metric 皆曾有讀數、但至少一個 timestamp 超過 freshness window（broker 故障情境），該 live-data 頁 SHALL 仍出現在 `/api/display-pages/rotation-preview` 的 `playablePages`，不再被列入 `skippedPages`，且不帶 `stale-runtime` skip reason。
- 當至少一個所需 metric 從未有任何讀數時，該頁 SHALL 仍依其 staleData policy 被排除，並回報對應 skip reason。
- 播放牆於 broker 故障期間 SHALL 持續輪播所有 enabled 頁；degraded 頁渲染最後已知值；牆面 not-live 提示由既有 header live-status 提供。

**介面 / 資料形狀（Interface / data shape）：**
- shared `evaluatePageRuntimeFreshness` 的回傳型別新增一個布林欄位（命名於實作時定為 `hasRequiredData` 或等義），語意：所有 requiredMetricKeys 在 metrics 中皆有一筆讀數。既有欄位 `fresh`、`stalestMetricKey`、`stalestTimestamp` 行為不變。
- `displayRotationService` 的 runtime-data 判定改以 `(fresh, hasRequiredData)` 決策；rotation-preview 與 display-ops 的既有欄位形狀不新增欄位（degraded 不另立欄位）。

**失敗模式（Failure modes）：**
- never-had-data：依 policy 排除（hide），rotation-preview 將該頁置於 skippedPages 並帶 skip reason（沿用既有 reason 或實作時定義之 no-data 語意，不得與 transient staleness 混用）。
- 若所有頁皆 never-had-data（全新部署從未連線）：維持既有 fallbackRoute/offline 行為，不在本 change 改動。

**驗收（Acceptance criteria）：**
- 新增 server 測試：建構「所需 metric 皆有舊值（timestamp 超窗）」情境 → 該頁出現在 playablePages、不在 skippedPages、無 stale-runtime。
- 新增 server 測試：建構「所需 metric 缺一筆讀數」情境 → 該頁仍被排除。
- 新增 shared 單元測試：`evaluatePageRuntimeFreshness` 對「有舊值」回 `fresh=false` 且 hasRequiredData=true；對「缺讀數」回 hasRequiredData=false。
- 更新既有測試：`display-ops` 摘要、`playback`、`rotation-preview` 中目前模擬過期即期待 stale-runtime skip 的案例，改為改用 never-had-data 來觸發 skip，或改為斷言過期頁仍 playable。
- 全套 `pnpm --filter @solar-display/server test` 與 `pnpm --filter @solar-display/web test` 綠燈；`pnpm run build` 通過。

**範圍邊界（Scope boundaries）：**
- In scope：`displayRotationService` runtime-data 判定、shared `displayPageFreshness` 評估旗標、`displayPageConfig.ts` 註解、server 契約/新測試。
- Out of scope：web 渲染與指示元件、rotation-preview/display-ops 新欄位、mock-mode、readiness/binding gating、freshness window 設定、圖片播放、換頁過場。

## Risks / Trade-offs

- [degraded 頁顯示舊值可能被誤認為即時] → 牆面 header live-status 於離線時顯示離線；顯示的是真實最後讀數而非假資料；per-page 細緻提示列為後續 Open Question。
- [display-ops 不再把 transient staleness 標為 skip，操作端對「正在以舊資料播放」的可見性下降] → 本 change 保留 never-had-data 的回報；degraded 的顯性回報列為後續；MQTT 連線狀態於其他既有 surface 仍可見。
- [partial 資料（部分 required metric 從未有、部分有）判為 cold 而排除] → 採保守定義：任一 required metric 從未有讀數即視為 never-had-data 排除，避免顯示半套資料的頁；於測試明確涵蓋。

## Migration Plan

- 純行為與測試變更，無資料庫 migration、無 API 形狀變更。
- 部署後即生效；回滾僅需還原 `displayRotationService`、shared freshness 旗標與測試變更。
- 不需 feature flag。

## Open Questions

- 是否要在 rotation-preview/display-ops 新增顯性 degraded 狀態欄位，讓操作端看到「此頁正以最後已知值播放」？（本 change 暫不做，待 #1 上線後依需求評估。）
- 是否需要 per-metric 而非 per-page 的 not-live 細緻提示？（目前以 header 連線狀態為足。）
