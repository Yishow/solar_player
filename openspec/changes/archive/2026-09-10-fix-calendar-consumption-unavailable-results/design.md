## Context

目前 tryResolvePersistedPeriodConsumption 的 day／month／year 分支吞掉計算或 projection 讀取錯誤並回 null；week／total 已建立 unavailableSpanResult。UI 將缺席的 periodSummary 當成相容路徑訊號。既有規格要求已設定但不可用，必須與未設定分開。

## Goals / Non-Goals

**Goals / In scope:** 恢復日曆期間 failure 身分；從 service 到 history API 及 EnergyHistory／EnergyTrend 保留 unavailable、有效零值與 no-profile 的區別；建立可注入失敗的測試。

**Non-Goals / Out of scope:** 不更改消耗公式、時間窗口、profile 選版、shared 型別、資料表、畫面設計或部署；不把任意全資料庫故障轉成成功 HTTP 回應；不重寫 week／total 算法；不進行效能重構。

## Decisions

### 日曆失敗結果

保留 tryResolvePersistedPeriodConsumption 的 public signature 與明確的非站點／no-profile null return。已成功取得 profile 並識別日曆 range 後，解析或 projection 讀取拋錯時建立 PeriodConsumptionResult：quality 為 unavailable，valueKwh 為 null，calculatedThrough 使用輸入 asOf，siteTimeZone 和 profileRevision 使用已取得的 profile context。issues 第一項固定為 UNRESOLVED_ACCOUNTING_PERIOD:<range>。可安全取得的已解析 context 才可附加，不偽造 boundary IDs、coverage、period 數值或完整有效 profile 選版證據。

以同模組的小型 unavailable-result helper 承接共同行為，或保留獨立日曆 helper；不為了共用而改動 span-specific issue code。相較於拋出所有錯誤，canonical unavailable 可讓 operator 看見狀態；相較於 null，不會誤啟相容消耗計算。

### 安全診斷與零次補查

catch 只使用進入計算前已取得的記憶體 context，不呼叫 getActiveProfile、readActiveProjection 或其他資料庫函式來組裝錯誤。保留一個有界的機器錯誤碼：只允許 1–64 字元且符合大寫英數底線的 code，其他情形使用 PERIOD_CONSUMPTION_RESOLUTION_FAILED；不序列化 error.message、stack 或 SQL。未能讀到 profile 的例外仍沿既有非成功 API 通道回報，不把未知誤判成 no-profile。

### Canonical 消費端防退回

service 測試分別注入 resolvePersistedPeriodConsumption 所需讀取與 readActiveProjection 的失敗，不只測 helper。API 測試在 profile 可讀、daily overlays 可正常產生的條件下驗證 periodSummary unavailable 仍保留；額外驗證全讀取故障不被當成 no-profile。EnergyHistory／EnergyTrend 使用同一 unavailable payload，legacy 欄位置入 987654.321 sentinel，確保消耗卡與趨勢資料不顯示 sentinel 或合成零。正常量測 0 必須保持有效。

## Implementation Contract

- 入口：tryResolvePersistedPeriodConsumption(database, scope, range, asOf)。只有原已明確支援的相容情境回 null；已知 configured calendar failure 必須回非 null unavailable result。
- 失敗：day／month／year 分別帶自己的 range issue；支援無 code、有效 code、任意 Error message 及超長 code 的測試，不洩露內部細節。
- 保持：week／total 既有 issues、正常 exact／partial／invalid 結果、測得零值與所有既有 scope 邊界。
- 檔案定位：核心與 service tests 位於 apps/server/src/services/periodConsumptionService.ts 及其同名測試；API 位於 apps/server/src/routes/metrics-history.ts 及其測試；兩頁 viewModel 及測試依 proposal Impact 的完整路徑。
- 驗收：三種 calendar range × calculation／projection failure 的 service regression，API payload regression，兩頁 unavailable／zero／legacy compatibility regression，最後完整 pnpm verify。所有新測試先證明舊版會失敗，再驗證修正。
- 先完成本案再 apply bound-accounting-evidence-window-reads。效能案不得覆寫本案的 unavailable 契約或測試；本案不持有其 selector 檔案。

## Risks / Trade-offs

- [失敗時能取得的 profile 可能只有 active metadata] → 不聲稱完成歷史選版，不填未證實的 boundary 或 coverage；只回可驗證的 unavailable context。
- [同一次 API 的其他 DB 操作也失敗] → 保留非成功回應，測試區分 targeted failure 與完整 outage；不把 HTTP 可用性擴張成本案承諾。
- [catch 共用導致 span issues 改名] → 固定既有 week／total assertions，不以去重為理由修改行為。

## Migration Plan

沒有資料遷移。日後以正常版本交付；回退僅涉及本案程式與測試，須清楚指出回退會重新引入已知 null 語意缺陷。本次只起草 artifacts，不執行交付。

## Open Questions

無阻擋提案的產品決策。實作需以 focused tests 證明 API failure seam；只有消費端回歸指出缺口時才修改對應 viewModel，不擴張畫面責任。
