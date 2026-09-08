## 1. 固定缺陷與寫入邊界

- [x] 1.1 核對當下 main、工作樹及本 change 的 proposal／spec／design；以 git status、基準 SHA 和最終確認的變更範圍留下 apply 起點，不覆蓋其他修改。
- [x] 1.2 在 guided mapping service／route 測試加入 N1：Solar 受管名稱、enabled／disabled derived、server-owned period、preview 後 owner 改變；修復前確認至少既有 Solar fixture 能重現，修復後要求 HTTP 409、無有效 token／寫入／activation 副作用。
- [x] 1.3 加入 N2 的來源停用後再 guided 啟用、disabled insert、shared-topic disable、mapping 寫入失敗與重試案例；逐一檢查 source/mapping enabled、selector、revision、audit、receipt 及 runtime call，保存修復前失敗輸出。

## 2. 修復同一條 guided 寫入路徑

- [x] 2.1 接上權威 ownership 檢查，讓 preview 和交易內 apply 都阻擋受管目的身分；跑 1.2 的測試並證明合法 custom mapping、兩廠區隔離及既有 token 衝突保護仍通過。
- [x] 2.2 收斂 source/mapping enabled 同步責任，以 saved source 決定新增與更新 mapping 狀態；跑 1.3 的交易／revision／selector 回歸測試，確保失敗不留半套設定。
- [x] 2.3 調整必要的 route/runtime 邊界，停用或 ownership 衝突不冒稱 activated，shared topic 其他 owner 不受影響；以 fake transport 封包、broker-refusal retry 和 lost-response retry 測試證明設定、訂閱、收值三種狀態仍分離。

## 3. 驗證與交接

- [x] 3.1 執行 `pnpm --filter @solar-display/server test src/services/guidedMqttMappingService.test.ts src/services/meterSourceCatalogService.test.ts src/routes/mqtt-guided-activation.test.ts src/routes/settings-mqtt.test.ts`，並加跑本次新增或修改的 route 測試；記錄實際通過／失敗數及指令。
- [x] 3.2 對最終版本執行 `pnpm verify`；如有 UI 修改加跑對應 web 測試，所有結果以當次輸出為準，不引用本次 propose 的 baseline 代替。
- [x] 3.3 分開做 Standards／Spec 最終 review，確認 N1、N2 與全部新增 scenarios 的證據，檢查 diff 沒有 schema／正式資料／部署越界；交付驗證紀錄與未完成事項，保留尚未取得的人工驗收。Archive、commit、push 不由本 checklist 自動授權。
