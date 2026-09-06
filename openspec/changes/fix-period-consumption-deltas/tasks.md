# Tasks｜以累積電錶差值計算日／月／年用電

狀態：proposal-only；以下全部為待實作與待驗證項目，不因提案已寫好而打勾。

前置：E1 / add-meter-reading-contracts

## 1. Implementation and Verification

- [ ] 1.1 **Tests** — 先建立日300／月4300／年8300與 register 不可累加的 red fixtures。（E2-R1）
- [ ] 1.2 **Time** — 實作可注入 now 的 IANA period-window helper，涵蓋 Taipei UTC轉換、2/29、跨年及 host TZ 改變。（E2-R2; E2-M1）
- [ ] 1.3 **Resolution** — 實作 exact 優先及 at-or-before 有界取樣，回傳 boundary offsets；不得用期間開始後第一筆冒充期初。（E2-R3）
- [ ] 1.4 **Calculation** — 實作 decimal per-meter delta 與非重疊多錶加總，interval-energy 不做第二次差分。（E2-R1 E2-R7）
- [ ] 1.5 **Quality** — 區分 exact0、missing baseline、single observation 與 partial observedDelta，缺日不補0。（E2-R4; E2-M1）
- [ ] 1.6 **Lifecycle** — 新增明確 reset/replacement segment 規則；缺 closing read 的期間保持 partial，未知負差 invalid。（E2-R5; E2-M1）
- [ ] 1.7 **Lifecycle** — 新增經 modulus 設定驗證的單次 rollover 計算與不合理跳值隔離。（E2-R5; E2-M1）
- [ ] 1.8 **Persistence** — 用 persisted samples/revisions 回復 baseline，測試 midday restart 與 source-time late arrival 可重入。（E2-R6; E2-M1）
- [ ] 1.9 **Projection** — 輸出 PeriodConsumption result、quality/freshness 與 sample provenance；月總與 daily coverage 分別表示。（E2-R7 E2-R8）
- [ ] 1.10 **Integration** — 將 DailySummaryService 用電路徑改接 resolver，不影響既有發電與自發自用來源；將舊 clamp 的用電回退停用。（E2-R1 E2-R5; E2-M1）
- [ ] 1.11 **Verification** — 跑 periodConsumptionService、DailySummaryService、MetricsAccumulatorService regression，逐一對照 test-plan。（E2-R1 E2-R2 E2-R3 E2-R4 E2-R5 E2-R6 E2-R7 E2-R8; E2-M1）
- [ ] 1.12 **Verification** — 執行 pnpm verify 並保存 shadow resolver 的輸入、版本、結果；尚未切換正式 history readers。（E2-R8）

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑；不能只寫「測過了」。當前未執行原生 Spectra analyze/validate/park、應用測試或部署。

Archive 與 commit 依 repo workflow 另行執行；不在本草案提前標記。
