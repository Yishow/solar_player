## Context

Weather 已提供 operationToken 與 reload outcome，guard 的 externalReloadResult effect 卻允許相同 token 隨 isDirty 改變再次處理。bootstrap committed token 1 被重播後，本地 revert 會把較新的 remote pending notice 清除，儘管未 fetch 遠端資料。

## Goals / Non-Goals

**Goals:**

- 每個 Weather terminal reload outcome 只處理一次，local dirty/revert 不確認遠端通知。
- 新的 current committed reload 可正常解除 pending，失敗與過期結果不清除通知。

**Non-Goals:**

- 不改 Weather persistence、broker/topic merge、API、polling 或非 Weather consumers 的預設語意。
- 不新增獨立全域通知系統或重寫 useMqttSettingsData。

## Decisions

### Reload outcome 單次消費

在 useDisplaySyncDraftGuard 的 Weather opt-in 路徑，以 operationToken 記錄已處理的 externalReloadResult；同 token 或更舊 token 的 effect rerun 直接略過。新 token 不論 committed、failed、stale、deferred 都只消費一次，只有仍 current 的 committed 才按既有 pending 規則確認。不要單純移除 effect dependency，避免留下閉包狀態問題；不要讓 isDirty=false 等同遠端刷新成功。

### 保留 pending 與 currentness 邊界

沿用資料 hook 的 current-operation 判斷及 post-discard local mutation protection。keep-editing 不 fetch；local revert 只改草稿 dirty，pending 維持，直到新的適用 committed reload。一次已處理的成功不能確認之後建立的 notice；相同失敗或 deferred 結果也不能在草稿變乾淨後被轉成成功。

## Implementation Contract

- In scope：apps/web/src/hooks/displaySyncDraftGuard.ts 與 apps/web/src/hooks/displaySyncDraftGuard.test.ts 的 outcome 消費，以及 apps/web/src/pages/MqttSettings/useMqttSettingsData.test.ts 的 Weather integration。
- Interface：保留現有 typed externalReloadResult、operationToken、stickyPending 與 reload callback；消費紀錄限定在 guard owner lifecycle，沒有持久化欄位。
- Behavior：bootstrap committed token 1→edit→remote event→revert 時 pending=true、event 後 reload count=0。keep-editing 維持該狀態；explicit discard 啟動的新 reload committed 後才清除 pending。
- Failure：failed、stale、deferred、同 token effect rerun、較舊 token 與 unmount 後 outcome 不得清除較新的 pending。正常 bootstrap committed 結果仍處理一次，StrictMode rerun 不再確認後來 notice。
- Acceptance：mounted guard test 重現 dirty transition 與遠端 event 的真實 effect 次序；Weather data hook integration 以 deferred reload 驗證失敗、retry 與 post-discard local edit 保留。非 Weather tests 維持既有 auto-reload/clean-state 行為。
- Out of scope：其他管理頁 pending policy、來源 API、資料寫入、全面表單生命週期改造。

## Risks / Trade-offs

- [消費標記初值跳過第一個合法結果] → 測試第一個 current committed 能執行一次，重複相同 token 不再執行。
- [只驗 guard mock 沒覆蓋實際資料 hook] → 使用現有 Weather integration harness 串接 remote event、資料讀取與 outcome。
- [通用 hook 修正波及非 Weather] → 保留 opt-in，重跑所有 guard consumers 的既有測試。
