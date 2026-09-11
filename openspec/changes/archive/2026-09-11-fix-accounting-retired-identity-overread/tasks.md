## 1. 固定容量回歸

- [x] 1.1 在 apps/server/src/services/accountingEvidenceSelection.test.ts 建立固定 9 月窗口、1 月 retired identity、8 月底 100 kWh baseline、9 月 150/175 kWh fixture；加入 10,000 筆無關 2 月資料後以 row identities/counts 不增及完整 oracle 結果為斷言，保存 RED，對應 Irrelevant retired identities do not expand calculation materialization。
- [x] 1.2 在 apps/server/src/services/meterReadingService.test.ts 固定 accepted row 的 calculation eligibility、span 內 closing identity 三元組、最新 pre-span instant 的全部 identity ties；執行測試並斷言候選集合、精確 instant 讀取及必要 ties 不被省略，時間可見性維持原契約。

## 2. 收斂計算讀取

- [x] 2.1 在 apps/server/src/services/accountingEvidenceSelection.ts 落實「Closing identities 決定開頭 anchors」，必要時於 apps/server/src/services/meterReadingService.ts 補 indexed read helper；以固定 fixture 與 helper tests 確認無關 retired anchor 不再拉低 lower bound、沒有全歷史 fallback。
- [x] 2.2 落實「保留完整 continuity closure」，anchors 之間保留跨 meter/revision/epoch/reset/ties 證據，且 interval-energy 與 fingerprint 入口不變；在 apps/server/src/services/accountingEvidenceSelection.test.ts 以 full-load 完整結果驗證必要老 baseline 與 unavailable diagnostics。
- [x] 2.3 在 apps/server/src/services/periodConsumptionService.test.ts 比對 day/month/year 的 bounded/full-load 完整結果，涵蓋空 channel、無 in-span closing、replacement、revision 與 epoch，確認未把缺證據變成零值。
- [x] 2.4 在同一 period service 測試比對 week/total、多日期、interval-energy、late arrival、receive-time-estimated 與 transaction-time 邊界，並重跑既有 fingerprint invalidation regressions，確認 narrowing 未改變 projection 語意。

## 3. 容量證據與審查

- [x] 3.1 完成「固定 fixture 與 full-load 差異驗證」：在 selector test 將無關歷史增量擴至 100,000，確認 0/10,000/100,000 三組相同 row identities/counts 與完整 oracle 結果；檢查 EXPLAIN QUERY PLAN 使用既有索引，記錄 materializedRowCount/fullLoad 與查詢計畫證據。
- [x] 3.2 主代理 review 最終 source/diff，分開核對 Standards 與 consumption-history-projections Spec，執行安全 audit 並修正本範圍 findings；確認無 schema/data 寫入、shared math 改動或 oracle 迎合實作。
- [x] 3.3 最終版本執行 pnpm --filter @solar-display/server test、pnpm verify 與 spectra validate fix-accounting-retired-identity-overread；以實際輸出建立檔案範圍、回復依據、PASS/FAIL/NOT RUN 與尚未完成事項 checkpoint，明列本機容量證據不等同 production acceptance。
