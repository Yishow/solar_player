## 1. 固定基準與失敗回歸

- [x] 1.1 開始 apply 時重新核對 GitHub main、local HEAD 與工作目錄，在本案驗證紀錄寫下實際 head；確認 F2 尚存在且不覆蓋其他未提交工作。
- [x] 1.2 將 F2 寫成 production MQTT callback 回歸：先送 20 kW/10:02 再送 5 kW/10:01，assert 仍為 20 kW 與原 timestamp/quality/raw payload；先執行並確認現行版本會失敗，測試只用 fake broker 與 temporary database。
- [x] 1.3 加入同時刻重送、同時刻不同值與等價 offset 表示的案例，驗證無寫入、無 freshness 刷新，衝突有可檢查診斷而非任意覆蓋。

## 2. 最小修復與邊界回歸

- [x] 2.1 在 reviewed power 的 live persistence 交易內加入 persisted destination 時間比較，正確控制實際 live update 與 derived-change 通知；驗證 1.2、1.3 由紅轉綠且不得寫入 accepted energy、energy quarantine 或 meter baseline。
- [x] 2.2 補首次合法觀測、較新觀測、另一 metric key 與 CL/KN 同 key 的正向測試；驗證正常值更新，排序判斷不跨目的身分。
- [x] 2.3 使用同一 temporary database 建立新的 runtime 實例／重新開啟連線，經 callback 送入較舊的 known-time retained packet；驗證重啟後保護仍在、source revision 改變不自動放行倒退。
- [x] 2.4 回歸 approved receive-time estimates、source-required、retained 無可靠時間、dup 與缺 transport evidence；驗證只使用原始 receivedAt、保留 estimated quality，原本不准進入的封包仍被拒絕。
- [x] 2.5 回歸 reviewed energy 與 legacy scalar/tag extraction；確認 energy late-event 保存與去重不變、legacy 相容路徑不套用新增 power guard，且 socket payload 不因忽略封包刷新原值時間。

## 3. 整合驗證與交接

- [x] 3.1 執行 `pnpm --filter @solar-display/server test src/mqtt/mqttPowerSelectorIngest.test.ts src/services/mqttMeterIngest.test.ts` 及實際受影響的 runtime/ingest targets；記錄精確指令、結果與新增 regression 名稱，不把只測 helper 當成 callback 整合驗收。
- [x] 3.2 完成 Standards／Spec review，執行當下 `pnpm verify` 與 `openspec validate fix-reviewed-power-event-ordering --strict`；把實際輸出寫入本案驗證紀錄，未執行的 browser/現場驗收明確標示而不假報通過。
- [x] 3.3 核對最後 `git diff`、`git status` 與任務狀態，确认只有本案最小程式／測試／文件，無 schema、正式資料或部署修改；依 repo workflow 交接 archive 與另行確認 commit，不自動提交。
