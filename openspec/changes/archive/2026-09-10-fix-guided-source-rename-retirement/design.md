## Context

動機與證據見 proposal.md、review report R2。`applyGuidedMapping` 已在 immediate transaction 中檢查 token、snapshot、ownership 與 persisted-source dependencies，再呼叫 `saveMeterSource` 及 `persistAppliedSelector`。新 revision 會停用舊 source，但後者只接收 saved source，沒有帶入 previous destination，因此只同步新 mapping。

`activateGuidedMapping` 正確地從 committed enabled mappings 取完整 topic 集合；問題是集合內仍有舊 enabled row。重現使用真 `MqttClientService` 搭配 FakeMqttClient，不連正式 broker，確認 activation 後新舊 topic 皆 active。舊 key 的 ingress 已回 `SOURCE_NOT_ACTIVE`，本案不宣稱 accepted 資料遭污染。

## Goals / Non-Goals

**Goals:** 在來源改名的單一 transaction 中釐清舊 destination ownership，僅退役已放棄且沒有新 owner 的 mapping，讓既有 runtime owner 自然收斂。

**Non-Goals:** 不加手動 unsubscribe 快捷路徑、不重播 readings、不搬動或刪除舊 live/history 資料、不批次掃除歷史 mapping、不改 direct route 的 transport 編輯產品範圍，不改既有來源身分或公式相依政策。

## Decisions

### 1. Persisted previous source 是唯一 previous-key authority

在 apply transaction 中保存 `getMeterSource(scope, channelId)` 的結果，讓 dependency guard 與 mapping synchronization 使用同一份 previous source。Request 不新增 previousMetricKey 欄位。新 key、revision、selector 仍受既有 canonical preview 與 snapshot 保護。

不能在 token 建立時先退役，也不能先提交新來源後再另開 transaction 清舊 mapping，否則可留下半完成狀態。

### 2. 以 ownership-aware synchronization 退役舊 mapping

沿用 `syncSourceTopicMapping` 的 source/mapping 一致性責任，讓 guided path 提供 persisted previous destination。舊 key 與新 key 不同時，在保存新 revision 後檢查舊 scoped key 是否仍有 active source owner；沒有才 disable 舊 mapping。不要只把舊字串塞進現有無條件 UPDATE：inactive source 的舊 key 可能已被另一個 channel 接手。

若共用 helper 的 direct caller 一併經過此判定，維持既有直接管理行為並增加「另一 active owner 已接手」保護測試。查詢必須含具體 scope，不能以 topic 相同或 metricKey 相同跨廠更新。保留舊 row 與所有來源歷程，供診斷與稽核。

### 3. Receipt、audit 與 mapping 一起原子化

退役、new mapping persistence、source audit 和 apply receipt 留在既有 transaction。任一 write/trigger 失敗全部 rollback。Dependency rejection 與 stale token 仍發生於任何配置 mutation 前。

Receipt replay branch 不執行新同步或退役；否則重送早期 request 可能停用之後接手舊 key 的 owner。現有 destination ownership replay recheck 保留。

### 4. 保留單一 subscription owner

不從 rename service 直接呼叫 unsubscribe。Post-commit activation 沿用 `listEnabledGenericTopics` 以及 runtime 既有 managed owner 合併責任；無 owner 的舊 topic 會從 desired set 消失，共用的舊 topic 仍保留。新舊 destination 使用同一 topic 時，不要求不必要的斷線或重新訂閱。

Broker failure 不回滾 SQL；既有 pending/failed 與 retry 狀態如實回報。Retry 與舊 receipt replay 都只依當前 committed mappings 做協調，不把 request 的歷史 old topic 強制加回去。

### 5. 以三層測試封住生命週期

Service 層測原子 source/mapping 狀態、same/different topic、CL/KN 隔離、inactive previous owner 被接手及 failure injection。Route 層測 first apply、拒絕零寫入及 runtime calls、idempotent replay。Runtime 層採真 MqttClientService + 假 broker ACK，驗證 sole-owner 舊 topic 移除、shared/managed owner 保留、broker failure 後 retry 與 same-topic 不受影響；不只 stub 一個永遠成功的 subscribe callback。

## Risks / Trade-offs

- [不分 owner 就停用舊 key，傷到別人的來源] → transaction 內查目前 scoped ownership；測 inactive lineage 的目的 key 已被另一 channel 接手。
- [直接 unsubscribe 誤停共用 topic] → 只更改 row enabled state，完整集合交由既有 runtime owner 協調。
- [兩段寫入造成半改名] → failure injection 覆蓋舊/新 mapping、source/audit、receipt；檢查 byte-equivalent 配置快照。
- [重送 request 重新退役後來的 owner] → replay 無 mutation；以提交後重新分配舊 key 的情境驗證。
- [既有孤兒 mapping 不會自動修好] → 本案明確只保護新發生的 rename，不做無法證明 ownership 的批次修寫；歷史整理由另案授權。

## Migration Plan

不需 migration/backfill。完成回歸、strict spec validation、review 與 `pnpm verify` 後另循 apply/verify/archive 流程；本次僅規劃。回退程式不重啟已退役 mapping，因為重啟它可能侵犯後來的 owner；如需恢復特定來源，應經現行 review/preview 流程明確操作。
