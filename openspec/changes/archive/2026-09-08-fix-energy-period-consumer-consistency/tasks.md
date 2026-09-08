## 1. 固定期間與範圍契約

- [x] 1.1 Apply 前同步檢查最新 main 與 review baseline，確認 R5–R8 仍可成立；以差異紀錄列出已有修復，避免重做或覆蓋未提交工作。
- [x] 1.2 新增 R5 同月設定邊界／閉月歷史、R6 獨立自訂分母的 service 測試；以 baseline 失敗與明確的 100/400=25% 預期驗證案例有效。
- [x] 1.3 新增 R7 五種 range 的 route 測試，包含跨月及其他能源欄位；先確認 baseline 會把日期集合改成本月，並固定原有 MetricResolver 的選取語意。
- [x] 1.4 新增 R8 shared 測試，涵蓋換錶、未來樣本、亂序、reset 與完整月端點但缺日；先記錄 baseline 覆蓋率與日品質不一致的失敗。

## 2. 統一計算與消費端

- [x] 2.1 抽出共用 effective-period context 並接入 site total 和 department shares；以 R5 測試驗證相同 profile/window/asOf、歷史歸屬及跨界 partial/null。
- [x] 2.2 納入 explicit denominator-only channels 並共用載入結果，傳遞品質及 freshness；以 R6 正常、缺基準與去重測試驗證不改分母、不丟來源。
- [x] 2.3 修正 daily-summary overlay，只在正確請求日期集合內更新 consumption；使 R7 五種範圍、無 profile、CL/KN context 與 generation/co2/peak 保留測試通過。
- [x] 2.4 共用日可計算條件重建 dailyCoverage，套用 asOf、排序與 identity/epoch 檢查；使 R8 測試通過且月總量與每日覆蓋可獨立表達。
- [x] 2.5 檢查投影 calculation version/context 與 web 品質呈現，拒用不相容快取；以舊快取、late sample 與 null/estimated 顯示測試驗證無 raw history 改寫。

## 3. 整合驗證

- [x] 3.1 跑受影響 shared/server/web 測試及 `pnpm verify`，保存真實結果與略過項目；以全年 fixture 驗證沒有逐日重複全庫掃描。
- [x] 3.2 以同一廠區／同一期間比對 Overview、部門占比及歷史 API 的數值、設定版本與品質；若影響 playback 依既有 FHD 流程取得證據與使用者驗收。
- [x] 3.3 完成 review、測試及驗收後才 archive；正式歷史重建與 commit 分別取得獨立授權，展示精準檔案清單，不自動 push。
