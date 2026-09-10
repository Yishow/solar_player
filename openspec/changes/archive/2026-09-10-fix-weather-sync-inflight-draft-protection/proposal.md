## Problem

目前 Weather settings 的背景讀取回應會無條件寫入編輯值與同步基線。當頁面由 clean 狀態發出讀取後，操作員在回應抵達前修改 Weather，晚到回應會覆蓋本地草稿與基線，讓實際輸入遺失且錯誤地呈現為 clean；這是既有 display sync draft protection 未涵蓋 in-flight response 的 P2 缺陷。

## Root Cause

- useMqttSettingsData 的 loadWeatherSettings 與 applyMqttEditableModel 都可直接覆寫 Weather draft/baseline；共用 displaySyncDraftGuard 只在 await 前檢查 dirty。
- loadEditableSettingsLane 回傳 Promise<void>，會丟失 Weather deferred outcome；guard 的 reload completion 與 clean effect 又會清 pending。只在 response 時比較 dirty，也無法辨認操作員修改後又改回的行為。

## Proposed Solution

- 讓每條 Weather read/full-model commit 路徑共用 request generation、mounted lifecycle 與同步 local-mutation generation；回應只能在仍有效、沒有後續本地修改，且原本 clean 或有本次 discard 授權時提交。
- 若晚到回應不能安全提交，保留操作員的 Weather 草稿與原基線，並使 remote-change pending 狀態可見，提供明確的 keep editing、discard/reload 路徑。
- discard 只授權捨棄點擊當下的草稿，不授權捨棄之後的新修改；keep editing 不發出請求。僅同一最新、安全成功的 commit 清除 pending，包含 edit-and-revert 時仍須保留 deferred notice。
- MQTT Weather 沒有 settings save owner；Data Hub 的 Weather save 不在本案範圍。Weather refresh 仍是 diagnostics/preview，不是 settings save。
- 保留 broker settings 的既有 loading protection 與 topic polling merge 行為，不全面凍結管理 UI、不做跨頁 refactor，也不改 Weather server/API persistence contract。

## Success Criteria

- 掛載實際 data owner、remote-sync guard 與 Weather mutators，以 deferred promises 重現 clean→read→edit、edit-and-revert、discard→new edit，確認 draft/baseline 不被晚到結果替換且 pending 不消失。
- 覆蓋 latest success/error、舊 request 的 success/error/finally、unmount、initial/cached full-model reload 與 keep-editing/discard success/failure；obsolete completion 不得更動 Weather state、error、loading 或 pending。
- broker/topic 既有行為及一般 guard consumers 保持相容；測試不是只檢查 source regex 或 pure guard。提案階段不執行應用測試。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- management-display-sync-draft-protection：將 dirty draft protection 從 display:sync 到達時擴展到已在進行中的有效 Weather response，包含可見 pending 狀態與明確的處理語意。

## Impact

- Affected specs：management-display-sync-draft-protection。mqtt-settings-weather-management 為參考；Data Hub persistence 與所有 server contracts 不變。
- Affected code：
  - Modified：apps/web/src/pages/MqttSettings/useMqttSettingsData.ts
  - Modified：apps/web/src/pages/MqttSettings/useMqttSettingsRemoteSync.ts
  - Modified：apps/web/src/pages/MqttSettings/useMqttSettingsWeather.ts
  - Modified：apps/web/src/pages/MqttSettings/MqttWeatherPanel.tsx
  - Modified：apps/web/src/hooks/displaySyncDraftGuard.ts
  - Modified：apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - Modified：apps/web/src/pages/MqttSettings/MqttSettingsContent.types.ts
  - Modified：apps/web/src/pages/MqttSettings/index.test.ts
  - Modified：apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - Modified：apps/web/src/hooks/displaySyncDraftGuard.test.ts
  - Modified：apps/web/src/pages/managementDisplaySync.test.ts
  - New：apps/web/src/pages/MqttSettings/useMqttSettingsData.test.ts
  - Removed：（無）
