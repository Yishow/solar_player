# Tasks｜修復用電歷史、期間 API 與可回退重算

狀態：實作中；期間投影與 Trend 用電卡已改讀 periodSummary。

前置：E1 / add-meter-reading-contracts、E2 / fix-period-consumption-deltas、E6 / add-site-energy-accounting-profiles

## 1. Implementation and Verification

- [x] 1.1 **Tests** — 新增月4300而 live register100000、year calendar 與 raw snapshot 不可累加的 API/前端 red tests。（E3-R1; E3-M1）
- [x] 1.2 **Storage** — 建立 versioned projection 與 active revision 儲存，允許 null 並保留品質、樣本依據與 watermark。（E3-R3 E3-R4; E3-M1）
- [x] 1.3 **API** — 擴充 history management/display responses 加 periodSummary，保留既有欄位語意與 device context 授權。（E3-R1 E3-R2; E3-M1）
- [x] 1.4 **API** — 以 E2 calendar resolver 統一 day/month/year 邊界，對 global 必須顯式聚合；拒絕非法 scope/range。（E3-R1 E3-R2; E3-M1）
- [x] 1.5 **Consumers** — 修 EnergyTrend 用電卡不再加 cumulative snapshots、不被 live lifetime 蓋值，range 切換取得正確結果。（E3-R1; E3-M1）
- [x] 1.6 **Catalog** — 註冊day/month/year server-owned period metrics並接canonical resolver，consumptionEnergy仍是register；驗證generic mapping不可占用。（E3-R7）
- [x] 1.7 **Consumers** — 修 EnergyHistory 與用電匯出讀 canonical totals，缺資料與電錶累積讀值分開顯示。（E3-R1 E3-R4; E3-M1）
- [x] 1.8 **Repair** — 建立 bounded dry-run 重算腳本，輸出可重建／不可重建清冊、差異與版本，預設不寫 active。（E3-R3 E3-R4; E3-M1）
- [x] 1.9 **Repair** — 完成 shadow activation/rollback 交易與 interrupted-run、重跑同輸入 idempotence 測試。（E3-R3; E3-M1）
- [x] 1.10 **Retention** — 建立必要 boundary/reset evidence retention 保護，對舊 snapshots 先驗證語意與時戳才採用。（E3-R4 E3-R5; E3-M1）
- [x] 1.11 **Refresh** — 接 late-event/source revision 到局部失效，watermark CAS 防舊結果覆蓋；發 monitoring-history 更新。（E3-R5）
- [x] 1.12 **Recovery** — 測試 MQTT restart 無新訊息仍回復 persisted projection，freshness不變，不啟動 mock。（E3-R6）
- [x] 1.13 **Verification** — 執行 history API、Trend/History tests 與 pnpm verify；以備份資料做 dry-run/rollback 演練，記錄無法重建項。（E3-R1 E3-R2 E3-R3 E3-R4 E3-R5 E3-R6; E3-M1）

## 2. V2 Site-Setup Integration

- [ ] 2.1 **V2 Integration** — 接入E6/U6的唯一廠區計量設定與免手冊任務契約，完成本新增需求的API/UI整合與驗收情境。（E3-R8）

## Closeout Notes

每個 task 完成時記錄測試名稱、指令、exit code 與證據路徑；不能只寫「測過了」。當前未執行原生 Spectra analyze/validate/park、應用測試或部署。

Archive 與 commit 依 repo workflow 另行執行；不在本草案提前標記。
