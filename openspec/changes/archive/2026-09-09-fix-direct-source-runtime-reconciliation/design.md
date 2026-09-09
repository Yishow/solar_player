## Context

見 `proposal.md` 與 review D3。基準 `abd99ba846c25de35100229452e17e2442552a10` 的 `meter-sources.ts` 在 transaction 內保存來源及 mapping，隨即回應；guided apply 則在提交後呼叫 runtime subscription owner。`MqttClientService.subscribe` 已區分 desiredTopics 與 broker 確認的 activeTopics，`listEnabledGenericTopics` 已提供完整 persisted generic topics。

## Goals / Non-Goals

**Goals:** 補齊 direct source write → committed desired subscriptions 的接線，在不改 API envelope 的前提恢復正式接收。保留 source/audit transaction 與 broker IO 的邊界。

**Non-Goals:** 不新增連線、不改 topic 命名、retry daemon、設定保存 UI、資料表或 deployment。不擴大目前 source endpoint 能修改的 mapping transport；本案只協調它實際提交後留下的 mapping 集合。

## Decisions

### 1. 提交後才交給既有 runtime owner

保留既有 immediate transaction 中的 validation、shared impact guard、save 與 mapping 同步。成功取得 saved source 後，再從已提交的資料庫讀取 `listEnabledGenericTopics`，交给 `app.mqttClientService.subscribe`。使用單一小型 post-commit reconciliation 接點管理錯誤，能共用既有接線責任時共用，不複製 source-level activation 判讀或新增 client。

每次成功 direct write 都可重算完整 desired set，不能只在 enabled 值有變時才執行，否則一次 broker 拒絕後以相同 saved source 重試會永遠略過協調。無 mapping 的新建來源只反映現有 enabled topics，不自行發明 topic。

### 2. 不在 SQL transaction 內等待 broker

broker IO 不屬於 SQLite atomic commit，失敗不能回滾一個已保存且可能被其他請求讀到的 source。捕捉 post-commit subscribe 失敗，以 `app.log` 記錄有界的來源 scope／channel、operation 與安全 error code；不輸出 credentials 或任意 raw payload。成功 HTTP status 與 `{ source }` 保持原樣，表示保存成功而非 active／observed。需要新 API 狀態欄位的產品需求不屬於本案。

替代方案是直接向 route 外拋 broker error，會讓客戶誤以為設定未保存；在 transaction 內等待則把網路失敗綁到資料庫生命週期，因此不採用。

### 3. 完整集合維護其他 owner

不對被修改來源的舊 topic 直接 unsubscribe。完整 enabled generic topics 由既有 runtime 再合併 managed subscription ownership，讓仍有其他 enabled owner 的共用 topic 保留。停用最後 owner 才會移除 generic subscription。runtime disconnected 時仍更新 desired set，重連沿用既有流程；broker refused 時保留待協調狀態，下一次有效更新或正常重連可重試。

不新增重試背景程序或並行訂閱 owner。多次快速 direct writes 的最終集合須透過同一 runtime authority 收斂，以受控 callback 的測試核對最後 committed enabled set，不靠固定延遲斷言。

### 4. 路由測試要包含真正的 runtime

現有 `meter-sources.test.ts` 只核對 DB。加入 real route + real `MqttClientService` + 可記錄 subscribe/unsubscribe 的 fake client，重現 disabled startup → direct PUT enable；SUBACK 後再送 production message，核對 live 或 accepted path。額外覆蓋 last-owner disable、cross-scope shared topic、disconnected/reconnect、broker拒絕後相同 source 重試、與 guard rejection 零 runtime calls。

## Risks / Trade-offs

- [API 不新增 activation 欄位，direct client 仍只有 saved source] → 保持兼容性，失敗透過現有 runtime 狀態與安全日志診斷；絕不新增虛假的 active/observed 成功訊息。
- [broker callback 失敗造成已保存與未啟用並存] → 明確保留這個真實狀態並允許無 revision bump 的有效重試，不回滾資料。
- [共用 topic 被誤取消] → 以完整 enabled 集合與 managed owner 回歸，不按單筆 source 直接取消訂閱。

## Migration Plan

不需要 database migration、設定或部署檔修改。先建立 D3 red regression，再接線並跑 source/guided/runtime focused tests，最後 `pnpm verify`。既有 GUIDED response 與 direct response 均須維持形狀。回滾本案只回退接線與相關測試，不動已保存的 source/mapping/history；現場部署仍依 repo workflow 另行驗收，本階段不部署。
