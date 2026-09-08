# R1–R4 交付證據（隔離 synthetic broker）

## 產生方式

- 真實 Fastify app + 真實 SQLite（暫時目錄）+ 真實 routes／services；只有 MQTT transport 與 discovery transport 換成 in-process synthetic broker。
- 未連線任何正式 broker，未回填任何正式資料；`MQTT_OBSERVATION_CATALOG=1` 只在此次執行的行程內開啟。
- 產生指令（腳本置於 session scratchpad，執行後移除，不留在 repo）：
  - server flows：`pnpm exec tsx <evidence-server.ts> <evidence dir>`（於 `apps/server`）
  - 管理畫面：`pnpm exec tsx <evidence-screens.tsx> <evidence dir>`（於 `apps/web`）

## 檔案

- `synthetic-broker-flows.json`：22 個步驟的實際 HTTP 請求／回應與 runtime 狀態。
- `routed-entry-screens.md`：正式入口（Data Hub「接入新資料」任務）在各情境實際顯示的畫面文字。

## 情境對照

| 情境 | 證據 |
| --- | --- |
| R3 正常 | active discovery `state: granted`、候選 `factory/kn/main`、樣本回傳有界 redacted payload 與 transport evidence |
| R3 收尾 | 停止 capture 後 `discoveryOpened[0].closed = true`，production active topics 不變 |
| R1 失敗 | broker 拒絕訂閱 → `saved: true`、`activation.state: failed`、`reason: BROKER_SUBSCRIBE_REFUSED`、`retryable: true` |
| R1 重試 | 同一 idempotency key 重送 → `activation.state: active`，來源與 receipt 不重複新增 |
| R1 正常 | 啟用後正式封包寫入 accepted history（`1234.5`，source timestamp 來自 payload） |
| R2 正常 | 功率 `tag=P1` 取得 12.5 kW 寫入 live，`meter_readings_accepted` 該 channel 為 0 筆 |
| R4 顯示 | 確認顯示 `factory/kn/main`（非 `kn/kn-main`）、payload、`retain=false`，且顯示確認本身零 publish |
| R4 失敗 | 目標移到 `factory/kn/replacement` 後提交舊確認 → 409 `PUBLISH_TARGET_CHANGED`，publish 仍為 0，輸入值保留 |
| R4 正常 | 重新確認後送出 → 只有 1 次 publish，topic/payload/retain 與確認一致 |

## 尚待人工判定

管理畫面是否達到可交付品質、以及是否進入正式 broker 的實機測試發送，由使用者決定；本次未在現場 broker 執行任何發送。
