## 1. 建立正式入口的失敗案例

- [x] 1.1 核對 apply 當下 main 與工作樹，回讀 proposal／spec／design 及 follow-up review N3、N4；以 git status 和 SHA 固定起點，確認沒有把本次規劃當成已修復。
- [x] 1.2 在管理與播放 history route 測試加入相同證據：canonical 日用電 300、legacy sentinel 9999、generation 10；檢查兩 API 數值／品質一致、其他欄位與資料庫原列不變，並保留修復前失敗輸出。
- [x] 1.3 加入五種 range 的 null summary、缺 baseline、跨月、跨年與 profile/source 邊界案例；至少重現 year/total 同為 300 的缺陷，固定已知完整 span 應為 900、未知起點應為 null、缺週資料不可變成 0 的驗收。
- [x] 1.4 在 EnergyHistory／EnergyTrend 消費端用上述 API 契約資料驗證卡片、月曲線、表格及既有匯出（若有）；修復前確認 legacy fallback 或 sentinel 問題，並單獨驗證正常測得的 0。

## 2. 修復投影與範圍解析

- [x] 2.1 將 canonical daily overlay 接到 management history 並共用必要的日用電組合責任；通過 1.2 及五種 range 的日期／非用電欄位保持測試，不回填原始摘要。
- [x] 2.2 修正 week／total 的 server-authorized 範圍解析，重用既有差值與品質判定；以 1.3 證明近七日不縮成本月、year=300 與 supported total=900 分開、起點不明與 continuity 缺口不冒稱 exact。
- [x] 2.3 讓有 profile 的不可用結果保留 null、quality、實際範圍與原因，前端不回退到 legacy consumption；通過 1.4，保留卡片已知月總量與日曲線缺口並存，且 global/no-profile 仍走原有相容路徑。

## 3. 整合驗證與交接

- [x] 3.1 執行 `pnpm --filter @solar-display/server test src/routes/metrics-history.test.ts src/routes/energy-authoring-consumers.test.ts src/services/periodConsumptionService.test.ts src/services/consumptionProjectionService.test.ts`，並加跑本次新增 tests；記錄當次測試數、錯誤與修正。
- [x] 3.2 執行 `pnpm --filter @solar-display/web test` 及 `pnpm verify`；shared 若有修改，確認其受影響測試亦執行，不以 build 成功取代差值／範圍回歸測試。
- [x] 3.3 在隔離資料環境檢查真正管理頁卡片、月曲線、表格與範圍提示；有碰到 playback 呈現時依 `docs/ops/fhd-closeout.md` 完成 fresh witness、gap notes 與 evidence bundle，人工 acceptance 保留給使用者。
- [x] 3.4 以最終 diff 做分開的 Standards／Spec review，逐一對應 N3、N4 與新增 scenarios，確認無 raw history／schema／部署越界；交付驗證紀錄、尚未完成事項及可回復範圍，不自動 archive、commit 或 push。
