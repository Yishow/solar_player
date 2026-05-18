嚴格按照以下三個 Spectra changes 完成 Management 與 Observability 串接：
1. `connect-playback-and-image-management-to-display-ops`
2. `connect-mqtt-and-circuit-settings-to-display-readiness`
3. `add-device-status-display-ops-observability`

**工作目錄：** /Users/yishow/prj/solar_player/

⚠️ 重要規則：
1. 絕對不可執行任何 git 操作（包含 git checkout, git add, git commit, git update-index, git diff 等）。你的 sandbox 無法寫入 .git/index，執行會失敗。
2. 絕對不可修改 AGENTS.md 或 CLAUDE.md 檔案。不可在任何檔案中加入 <claude-mem-context> 或 <codex-mem-context> 區塊。
3. 只做程式碼實作與測試驗證，不做 git 操作。tasks.md 的 checkbox 也不需要更新（我來手動處理）。

**Proposal 摘要：**
- **Change 1:** 讓 PlaybackSettings 顯示 rotation plan 發布狀態、skip reasons；ImageManagement 顯示素材引用關係、draft/live 差異；跨 surface sync 事件流；顯示 blocker banners。
- **Change 2:** MqttSettings 顯示展示頁 metric mapping 覆蓋率；CircuitSettings 顯示 display slot binding；display readiness checks 彙整設定缺口。
- **Change 3:** DeviceStatus 顯示 display operations summary（live version、draft backlog、最近發布、skip 摘要、asset health 摘要）；readiness & asset alerts；diagnostics 只限安全讀取/重新同步。

**實作範圍：**
- apps/server/src/routes/display-ops.ts（新）
- apps/server/src/routes/display-readiness.ts（新）
- apps/server/src/routes/device-display-ops.ts（新）
- apps/server/src/services/displayOpsService.ts（新）
- apps/server/src/services/displayReadinessService.ts（新）
- apps/server/src/services/deviceDisplayOpsService.ts（新）
- apps/server/src/routes/playback.ts
- apps/server/src/routes/images.ts
- apps/server/src/routes/device.ts
- apps/server/src/routes/settings-mqtt.ts
- apps/server/src/routes/circuits.ts
- apps/web/src/pages/PlaybackSettings/
- apps/web/src/pages/ImageManagement/
- apps/web/src/pages/MqttSettings/
- apps/web/src/pages/CircuitSettings/
- apps/web/src/pages/DeviceStatus/
- apps/web/src/services/api.ts
- apps/web/src/services/socket.ts
- packages/shared/src/displayOps.ts（新）
- packages/shared/src/displayReadiness.ts（新）
- packages/shared/src/deviceDisplayOps.ts（新）
- 測試檔案

**Constraints（嚴格遵守）：**
- 只串接 management/status 與 display operations / readiness / observability
- 不修改 AGENTS.md、CLAUDE.md、deploy/、root scripts、MQTT 密碼遮罩行為、危險 device control 邊界
- 不引入新依賴；package.json、lockfile 不得變更
- 既有 route response shape 需保持相容
- Existing tests start failing — this is a regression, do not fix by editing tests, adding `.skip`, or weakening assertions
- 所有 .ts/.tsx 檔案不得超過 400 行

**Tasks（18 個 task）：**

**Change 1: connect-playback-and-image-management-to-display-ops**
Task 1.1: Shared display operations summary — publish state, rotation status, skip reasons in PlaybackSettings
Task 1.2: Show pending display changes — unpublished draft impact in PlaybackSettings
Task 2.1: Image reference integration — display-page and slideshow references in ImageManagement
Task 2.2: Image deletion/replacement blockers — warn/block when live references exist
Task 3.1: Cross-surface sync — summary refresh or socket events after relevant actions
Task 3.2: Blocker banners — inline warnings on current management page

**Change 2: connect-mqtt-and-circuit-settings-to-display-readiness**
Task 1.1: MQTT coverage evaluation — readiness findings from required display metrics and topic mappings
Task 1.2: Surface MQTT coverage findings in MQTT Settings page
Task 2.1: Circuit-to-display slot binding — persist explicit slot assignments
Task 2.2: Unbound/conflicting slot findings in Circuit Settings
Task 3.1: Display readiness checks — reusable readiness service
Task 3.2: Reuse readiness checks across management surfaces

**Change 3: add-device-status-display-ops-observability**
Task 1.1: Extend Device Status with display operations summary — live version, publish, draft backlog
Task 1.2: Degraded display summary without hiding host health
Task 2.1: Readiness and skip alerts in Device Status
Task 2.2: Asset-health findings in Device Status alerts
Task 3.1: Bounded safe diagnostics — only safe refresh or export
Task 3.2: Reuse shared services for diagnostics

**Done when：**
1. 所有 18 個 task 的程式碼完成
2. pnpm --filter @solar-display/server test exit 0
3. pnpm --filter @solar-display/web test exit 0
4. pnpm run build exit 0
