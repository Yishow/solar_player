## 1. 建立會失敗的生命週期測試

- [x] 1.1 在 guided mapping service tests 加入 enabled source 改到新 metricKey 與 topic 的案例，斷言舊 source/mapping 停用、新 source/mapping 啟用；確認修復前因舊 mapping 仍 enabled 而失敗。
- [x] 1.2 使用真 `MqttClientService` 與 FakeMqttClient 建立先啟用舊 topic、再 rename/activate 的回歸，斷言無其他 owner 時 active topics 不含舊 topic；確認修復前失敗而非只檢查 subscribe stub 被呼叫。

## 2. 原子且符合 ownership 的 mapping 退役

- [x] 2.1 在 guided first-apply transaction 中保留 persisted previous source，讓 guard 與同步使用相同 previous destination；以 request mismatch/stale token 與合法高 revision rename 測試驗證不接受 client 自報 old key 或重用 revision。
- [x] 2.2 將舊 mapping retirement 納入既有 source/mapping synchronization，僅在舊 scoped key 沒有其他 active source owner 時停用；以 1.1 轉綠、CL/KN 同 key 隔離、inactive source 的舊 key 已被另一 channel 接手測試驗證。
- [x] 2.3 保留 new mapping、old retirement、source/audit/receipt 的同一 transaction；以各寫入點 failure injection 驗證整體 rollback，route failure 不呼叫 runtime activation。
- [x] 2.4 加入 rename 後 old key 被重新分配再 replay 舊 request 的測試，驗證不新增 revision/audit/receipt、不重新退役後來的 owner，並保留原有 dependency 與 destination ownership 拒絕測試。

## 3. Runtime 收斂與完成驗證

- [x] 3.1 沿用完整 committed enabled-topic 集合協調，讓 1.2 轉綠；補上 same-topic rename、另一 enabled mapping 共用舊 topic 與 managed owner 仍需舊 topic 的案例，驗證只移除真正無 owner 的訂閱。
- [x] 3.2 加入 broker rejection/disconnection 與 retry 測試，驗證 SQL rename 不回滾、狀態保持 failed/pending retryable、重試不復活舊 mapping 且不宣稱 subscription ACK 等於 reception。
- [x] 3.3 執行相鄰 guided mapping、source mutation、meter source catalog、MQTT activation/runtime tests 與 `pnpm verify`，記錄實際命令、結果及 skip 原因；如共用 helper 影響 direct caller，包含其 ownership 保護測試。
- [x] 3.4 分別完成 Standards 與 Spec review，執行 `openspec validate fix-guided-source-rename-retirement --strict` 與 diff 檢查並更新 review 證據；確認沒有 migration、歷史批次 cleanup 或正式 broker 操作，不在未授權下 commit 或 push。
