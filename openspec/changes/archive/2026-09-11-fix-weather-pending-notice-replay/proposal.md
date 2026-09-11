## Problem

P2 修正：Weather 初次成功 reload 已發布 committed token 1 後，使用者編輯草稿並收到 display sync event，guard 正確設 pending 且未發 reload；使用者把欄位改回 baseline 時，pending 卻消失。已重現 pendingAfterRevert=false、reloads=0，遠端設定實際未讀取。

## Root Cause

useDisplaySyncDraftGuard 的 externalReloadResult effect 接受相同 operationToken，且依賴 isDirty。isDirty 由 true 變 false 時，舊 committed result 再次作用，清掉後來建立的 pending notice；stickyPending 只擋住另一個 clean-state effect。

## Proposed Solution

- 明確記錄已處理的 Weather reload outcome，讓相同或更舊 token 不因 dirty transition 再次確認後來的遠端通知。
- 只有新的、仍 current 且成功 committed 的 reload outcome 可清除對應 pending；deferred、failed、stale 與本地 edit/revert 保留通知。
- 保留 Weather opt-in 與非 Weather consumers 既有行為，不改來源 persistence、broker/topic merge 或任何 API。
- 以 mounted guard 及完整 Weather hook integration 驗證 bootstrap→edit→remote event→revert，並接續 explicit discard/reload 正確解除 pending。

## Success Criteria

- 同一 committed token 在 local dirty/revert 後不重播；remote event 未實際 reload 時 pending 始終可見，reload call count 為 0。
- keep-editing 不 fetch、不清 pending；新的 current committed reload 才清 pending；failed/stale/deferred outcomes 不清除較新的 notice。
- 初次 current committed 結果仍被處理一次；unmount 與 post-discard local mutation protection 保持有效，非 Weather consumers 既有測試維持通過。
- 受影響 web tests、兩軸 review 與 pnpm verify 通過。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- management-display-sync-draft-protection：明確限制 external reload outcome 只能處理一次，不能藉 clean-state effect 回放舊的成功。

## Impact

- Affected specs：management-display-sync-draft-protection。
- Affected code：
  - Modified：apps/web/src/hooks/displaySyncDraftGuard.ts
  - Modified：apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - Modified：apps/web/src/pages/MqttSettings/useMqttSettingsData.test.ts
  - New：（無）
  - Removed：（無）
- 不改 useMqttSettingsData 的持久化責任或新增 polling；既有 typed Weather seam 足以承接修正。
