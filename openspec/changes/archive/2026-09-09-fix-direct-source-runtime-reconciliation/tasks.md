## 1. 鎖定實際中斷路徑

- [x] 1.1 核對當下 main／HEAD 與未提交工作，確認 direct route 仍缺少 post-commit 協調並記錄 review D3 的適用基準。
- [x] 1.2 在來源路由測試建立 real runtime + fake broker 的 disabled-startup → direct PUT enable 案例；先驗證「必須出現新訂閱並能接收後續封包」的正式 regression 在修復前失敗。

## 2. 接上提交後的訂閱協調

- [x] 2.1 在成功 direct write 提交後，以完整 committed enabled topics 呼叫既有 runtime owner；以 1.2 轉綠及 DB 已提交才收到 subscribe 的斷言驗證。
- [x] 2.2 捕捉 post-commit broker 失敗並留下安全診斷，保留 `{ source }` 與原 HTTP status；以 broker refusal 測試驗證保存不回滾、沒有假 observed、相同 source 可重試且不增加 revision／epoch。
- [x] 2.3 補 last-owner disable、跨 scope shared-topic、managed topics 與無 mapping 新來源測試，確認只協調真正已提交的完整集合，不取消其他 owner 或發明 topic。
- [x] 2.4 補 disconnected → reconnect 與受控 callback 的连续更新測試，確認 desired state 最終收斂至最後已提交集合，且重連無需人工重建來源。
- [x] 2.5 對 authorization、validation、stale revision、ownership 與 dependency 拒絕加 runtime spy，驗證零 subscribe/unsubscribe 及既有 source/audit/receipt 拒絕語意。

## 3. 整體驗證

- [x] 3.1 執行 `pnpm --filter @solar-display/server test src/routes/meter-sources.test.ts src/routes/mqtt-guided-activation.test.ts src/mqtt/MqttClientService.test.ts src/services/guidedMqttMappingService.test.ts`，加上本案若新增的明確測試檔；記錄真實 red／green 與 shared build 結果。
- [x] 3.2 分別檢查 Standards／Spec、執行 `pnpm verify`，確認 guided activation／receipt 與既有 API 形狀未改；以實際輸出而非推估記錄結果。
- [x] 3.3 更新 D3 修復證據、執行本案 strict OpenSpec validation 與 read-back，依 repo workflow 回報驗證、archive 與 commit 狀態；commit 仍需使用者確認，本次交付不自行 archive 或 commit。
