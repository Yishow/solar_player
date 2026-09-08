## 1. 建立脫鉤與等價的失敗案例

- [x] 1.1 核對 apply 當下 main 與工作樹，回讀 proposal／spec／design；以 git status 與 SHA 固定起點，確認 memo 化之後的現況而非更早的基準。
- [x] 1.2 建立可重跑的基準腳本，記錄改動前 365 個日期在 365／2,000／8,760 筆樣本下的實測毫秒數，作為交付時的對照，不以推論代替量測。
- [x] 1.3 加入樣本存取計數測試：對固定樣本集合、日期數加倍時，樣本層級存取次數不得隨之乘上樣本總數；確認此測試在現行實作下失敗。
- [x] 1.4 加入邊界差一案例：樣本恰落在窗口 start、恰落在 end、以及各自前後一毫秒，固定「含 start 不含 end」與 opening／closing 證據的期望值。

## 2. 改寫計算路徑

- [x] 2.1 以排序索引的二分搜尋取得 close 與 start 邊界，`closing`、`globalOpening` 改由索引取得，不改任何 degrade 條件與 issue 內容。
- [x] 2.2 `opening` 改為自 start 邊界向前找第一個 identity 相符者；`contributing` 改為索引區間，通過 1.3 與 1.4。
- [x] 2.3 評估是否進一步免除中間陣列具體化；若可讀性明顯受損則保留具體化並只縮小到窗口區間，於交付說明記錄取捨。

## 3. 等價驗證與交接

- [x] 3.1 加入行為等價對照測試：同一批隨機但可重現的樣本（含 rollover、interval-energy、來源替換、epoch 變更、receive-time-estimated）在五種 range 下逐欄比對結果。
- [x] 3.2 執行 `pnpm --filter @solar-display/shared test` 與 `pnpm --filter @solar-display/server test src/services/periodConsumptionService.test.ts src/routes/metrics-history.test.ts src/services/departmentSharesService.test.ts src/services/energyAuthoringJourney.test.ts`，任何既有期望值需要修改即視為改壞。
- [x] 3.3 執行 `pnpm verify`，並重跑 1.2 的基準腳本，記錄改動前後實測數字。
- [x] 3.4 在隔離資料環境比對修改前後的管理端與播放端 response 完全一致；以最終 diff 做分開的 Standards／Spec review，交付驗證紀錄與尚未完成事項，不自動 archive、commit 或 push。
