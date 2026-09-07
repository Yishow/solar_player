# Tasks｜以累積電錶差值計算日／月／年用電

狀態：已完成；所有子契約已通過單元、整合與全量 pnpm verify。

前置：E1 / add-meter-reading-contracts、E6 / add-site-energy-accounting-profiles（profile lookup 與 calendar 契約）

## 1. Implementation and Verification

- [x] 1.1 **Tests** — 先建立 profile-owned membership 下日300／月4300／年8300與 register 不可累加的 red fixtures，並驗證重選總錶／部門只產生 profile revision、不改 source baseline。（Period consumption is a counter difference；Local-day baselines are maintained per scope；E2-R1；E2-M1）
- [x] 1.2 **Time** — 實作可注入 clock 的 profile calendar boundary helper（D1 期間定義），由 server-verified E6 `siteTimeZone` 處理 Taipei UTC轉換、2/29、跨年及 host TZ 改變；消費 E1 已 normalized 的 UTC instant，並以 E1 `SOURCE_TIMESTAMP_INVALID` fixture 覆蓋無 offset 時間解析失敗。（Calendar boundaries use explicit site time；E2-R2；E2-M1）
- [x] 1.3 **Resolution** — 實作 profile lookup precedes calculation（D9）與邊界選擇（D3）：保留 `metricScope`、`meterIds`、`definitionRevision`，加入 `profileRevision`、period selection/asOf，exact 優先及 at-or-before 有界取樣，回傳 boundary offsets；caller 傳 timeZone、start/end、未知 revision 或 profile 外 meterId 必須拒絕，且不得用期間開始後第一筆冒充期初。以 E2-R2-S05 驗證 E6 immutable review snapshot 的 draft calendar 預覽不冒充 persisted revision、不寫正式 history/cache。補 E2-R3-S03：E1 `receive-time-estimated` accepted packet 只能作 estimated-boundary，retain replay 不改 history/baseline/freshness。（Boundary estimation is bounded and disclosed；E2-R3）
- [x] 1.4 **Calculation** — 實作 decimal per-meter delta 與 E6 profile 非重疊多錶加總（D2 數學），按 E1 `energyFlowRole` 保持 interval-energy 不做第二次差分；meterIds 只能選 server 已驗證的物理 channels，不代表 accounting role。（Period consumption is a counter difference；Period totals and daily allocation carry independent coverage；E2-R1 E2-R7）
- [x] 1.5 **Quality** — 區分 exact0、missing baseline、single observation 與 partial observedDelta，缺日不補0（D4 缺資料），並以 E6 profile revision 判斷 calendar boundary。（Zero and missing observations are not interchangeable；E2-R4；E2-M1）
- [x] 1.6 **Lifecycle** — 新增明確 reset/replacement segment 規則（D5 歸零／換錶／翻表）；缺 closing read 的期間保持 partial，未知負差 invalid。（Counter discontinuities require explicit evidence；E2-R5；E2-M1）
- [x] 1.7 **Lifecycle** — 新增經 modulus 設定驗證的單次 rollover 計算與不合理跳值隔離。（Counter discontinuities require explicit evidence；E2-R5；E2-M1）
- [x] 1.8 **Persistence** — 用 persisted samples/revisions 回復 baseline（D6 重啟與亂序），測試 Restart and late data preserve the same event-time result、midday restart、source-time late arrival，以及 profile reassignment 不改 source revision/epoch 可重入。（E2-R6；E2-M1）
- [x] 1.9 **Projection** — 輸出 PeriodConsumption result、quality/freshness、profile revision/siteTimeZone provenance 與 sample provenance（D7 品質與舍入）；月總與 daily coverage 分別表示。（Period totals and daily allocation carry independent coverage；Period quality and precision survive calculation；E2-R7 E2-R8）
- [x] 1.10 **Integration** — 將 DailySummaryService 用電路徑改接 profile-revision resolver，不影響既有發電與自發自用來源；將舊 clamp 的用電回退停用，並保留 profileRevision/siteTimeZone provenance。（Period consumption is a counter difference；Counter discontinuities require explicit evidence；E2-R1 E2-R5; E2-M1）
- [x] 1.11 **Verification** — 跑 periodConsumptionService、DailySummaryService、MetricsAccumulatorService regression，逐一對照 test-plan 的 UTC source／Asia/Taipei profile boundary、timezone/start/end override、unknown profile revision、profile 外 meterId、E1 `SOURCE_TIMESTAMP_INVALID`、E2-R3-S03 retain/receive-time estimate、E2-M1-S04 reassignment 與 D8 期間截止一致性 scenarios。（E2-R1 E2-R2 E2-R3 E2-R4 E2-R5 E2-R6 E2-R7 E2-R8; E2-M1）
- [x] 1.12 **Verification** — 執行 pnpm verify 並保存 shadow resolver 的輸入、版本、結果；尚未切換正式 history readers。（E2-R8）

## Closeout Notes

- 2026-09-08 實作完成：
  - 實作 rollover modulus 合理性計算（E2-R5-S02），並在 provenance / issues 保留 rollover 標記。
  - 實作換錶跨期未證明連續性隔離（E2-R5-S03），缺 closing read 保持 partial，observedDelta 標記已知區間。
  - 實作月總與 dailyCoverage 獨立計算輸出（E2-R7-S01），期初與期末端點有效時月用量為 exact，內部缺日呈現於 dailyCoverage（isComplete: false）。
  - 實作 definitionRevision 集合驗證（E2-R2-S04）。
  - 單元測試（`packages/shared/src/periodConsumption.test.ts` 155 測全部通過）。
  - 整合與全量驗證：`pnpm verify` 全部 stages（build、bundle-budget、shared、server、web、deploy、server-runner）pass，exit 0。
  - 規範檢查：單檔行數限制（`periodConsumption.ts` 388 行、`periodConsumption.test.ts` 399 行）均低於 400 行。
