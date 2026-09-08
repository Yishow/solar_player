## Why

最新 `main` 的管理端歷史 API 雖已回傳正確期間總量，每日資料仍直接讀舊摘要，造成同一批讀值在卡片顯示 300 kWh、曲線與表格卻取得 9,999 kWh。另外 `total` 被當成 `year`，而 `week` 沒有新的期間結果，仍可能退回已失去正確用電語意的舊資料。

## What Changes

- 管理端與播放端的每日用電共用 canonical read-time projection；保留各自權限、所選日期及發電／減碳等欄位，不修改原始摘要或電錶紀錄。
- 修正 `total` 與 `year` 的混用；累積結果必須列出實際可證明的起訖與品質，不得拿今年數字冒充完整累積。
- 明確處理現有 `week` 範圍與已設定 profile 但資料不足的狀態；無法計算必須回傳具品質的空值，而不是讓前端偷偷退回舊 counter 或把缺資料加成零。
- 補齊管理端 API → EnergyHistory／EnergyTrend 的同批資料驗證，讓總量、每日曲線與表格各自正確，且能同時表達「月總量已知、每日分配有缺口」。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `consumption-history-projections`：管理與播放的每日投影一致、查詢範圍不被替換，以及 canonical unavailable 不落回錯誤舊值。

## Impact

預期影響 `apps/server/src/routes/metrics-history.ts`、`services/periodConsumptionService.ts`、範圍／投影 helper、`apps/web/src/pages/EnergyHistory/viewModel.ts`、`EnergyTrend/viewModel.ts` 與測試。必要的共用 window 型別走 `packages/shared`，不得改寫現有 raw snapshot 欄位的意思。

沿用既有 routes 與 response envelope；可在期間結果補充實際範圍與 unavailable 診斷，但不能移除原有欄位。保留 `global` 與尚無 profile 的既有行為，不新增週統計產品、不把目前近七日選取改成週一起算的日曆週。不新增資料庫 migration、不批次回填正式資料。

## Evidence and Review Boundary

基準：`8323c33c12464adf1b5f42670d82d4fe7ae03a7c^...98979b6f46b124a7b568167e42cc9a261024fa18`。本 change 對應 `docs/reviews/2026-09-08-energy-authoring-followup-review.md` 的 N3、N4。

N3 隔離測試中，管理端月總量為 300、每日舊值為 9999，同時播放端同日的 canonical 用電為 300，且發電值 10 保留。N4 的跨年連續讀值從 1000 到 1900，完整已知區間差值為 900；`year` 與 `total` 卻都回 300 及 2026 年起點。`week` 的 null/fallback 路徑另由原始碼追蹤確認，尚未宣稱完成其端到端數值重現。

## Non-Goals

不補造缺失日用量、不用每日已知值總和假裝完整月量、不重新定義電錶 epoch 或 E6 生效規則；不更換圖表、route shell、FHD 版面或編輯器。不修改正式資料、broker 或部署。不將這次 review 擴成全站歷史重算專案。

## Delivery Boundary

本輪只規劃。實作先建立 API 與消費端失敗案例，再修正共用讀取路徑；保留 `null + quality`、版本邊界與兩廠區隔離。交付需 focused tests、`pnpm verify`，以及真正受影響畫面的資料呈現驗證；如碰到 playback 呈現則依現行 FHD 流程補 witness，人工驗收不能以單元測試代簽。
