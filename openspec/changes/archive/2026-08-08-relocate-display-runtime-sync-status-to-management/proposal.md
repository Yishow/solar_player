## Why

五個 playback 展示頁（`/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability`）在 runtime 資料同步失敗時，會在畫面左上疊一個絕對定位的浮動提示框，長期遮蔽展示內容。這個框在實務上幾乎不會自行消失：runtime 重新載入只在收到 `display:sync` socket 事件或 refreshKey 改變時觸發，因此開機期間 app time 尚未同步、或 server 端訊號延遲造成的一次暫時性失敗，會讓 fallback 狀態永久停住。

展示頁是無人值守的播放介面，不是維運介面。同步狀態與最後同步時間應該由管理端讀取，而不是印在展示畫面上。現有的 display client heartbeat 已經在回報 route、pageKey、`timeSyncState` 與 profile 更新狀態，`Device Status` 也已逐台呈現這些欄位，是承接 runtime 同步狀態的既有通道。

heartbeat 這條通道有一個明確的涵蓋邊界：未配對的 client 通不過 socket 身分驗證，因此送不出 heartbeat，也不會進入 display client liveness registry — 這是 `identity-aware-display-client-liveness` 的既有要求，並非缺陷。本 change 的 runtime 同步回報只涵蓋**已配對且能建立 socket 連線**的 client。未配對 client 的可見性由 server 端已知的 401 事實承接，屬於另一個 change 的範圍，本 change 以顯式的邊界宣告與「未回報」標示處理，不讓管理端把「沒有這台」誤讀為「這台正常」。

## What Changes

- 移除五個展示頁的 runtime fallback 浮動提示框，展示畫面不再出現任何同步狀態疊層。
- **BREAKING**（spec 層）：`display-page-runtime-refresh-contracts` 中「refresh 失敗時頁面暴露錯誤或 fallback 指示」的要求，改為「頁面保持 fallback-safe 渲染且不得在 playback surface 上顯示同步狀態疊層，狀態改由 heartbeat 回報」。
- runtime refresh 失敗後加入有界自動重試（指數退避，上限固定），讓開機期間的暫時性失敗能自行復原，而不是停在 fallback 直到下一次 `display:sync`。
- 新增前端模組級 runtime 同步回報器，讓展示頁把最近一次 runtime 同步結果寫入共用狀態，由 `LayoutShell` 的 heartbeat payload 讀取，不經由 React context 或 prop drilling。
- `DisplayClientHeartbeat` 與 display client liveness 快照增加 runtime 同步欄位：同步狀態、最後成功同步時間、最後錯誤訊息。
- `GET /api/device/status` 的 `data.displayClients` 每筆 client 帶出上述 runtime 同步欄位。
- `Device Status` 管理頁在既有的 display client 列上呈現 runtime 同步狀態與最後同步時間，與現有的 `App Time <state>` 與 last seen 並列。
- `Device Status` 的 display client 區塊加上一則涵蓋範圍說明，明確指出此清單只涵蓋已配對且連線中的 client，未配對的裝置不會出現在此，避免把「清單中沒有這台」誤讀為「這台正常」。

## Non-Goals

- 不改變 runtime 資料本身的來源、schema 或 fallback 內容；只改變「狀態顯示在哪裡」與「失敗後是否重試」。
- 不調整五個展示頁的 FHD 視覺構圖、卡片、版位或 canvas 尺寸；本 change 只移除疊層，不做視覺 polish。
- 不新增管理端頁面或路由；沿用既有的 `Device Status` 頁與 `GET /api/device/status`。
- 不改動 app time 同步機制本身，也不處理 server 端訊號延遲的根因。
- 不保留任何「在展示頁上有條件顯示提示框」的降級選項；經評估後否決，因為門檻式顯示仍會在真實故障時遮蔽無人值守的展示畫面。
- 不為 runtime 同步狀態新增持久化儲存；狀態隨 heartbeat 存活於既有的 in-memory liveness registry。
- 不處理未配對 client 的管理端可見性。未配對 client 送不出 heartbeat，其可見性必須改以 server 端的 401 事實承接，屬於 `surface-unpaired-display-access-in-management` 的範圍。本 change 只負責不讓管理端誤讀該情形。
- 不放寬 socket 的身分驗證以換取未配對 client 的 heartbeat；那會讓未經身分驗證的來源寫入 liveness registry，違反 `identity-aware-display-client-liveness` 的既有要求。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `display-page-runtime-refresh-contracts`: refresh 失敗後的指示方式從 playback surface 疊層改為 heartbeat 回報；並要求失敗後執行有界自動重試。
- `display-client-liveness`: heartbeat 與 `Device Status` liveness 資料增加 runtime 同步狀態、最後成功同步時間與最後錯誤訊息欄位。

## Impact

- Affected specs: `display-page-runtime-refresh-contracts`、`display-client-liveness`
- Affected code:
  - New:
    - apps/web/src/services/displayRuntimeSyncReporter.ts
    - apps/web/src/services/displayRuntimeSyncReporter.test.ts
  - Modified:
    - packages/shared/src/displayClientLiveness.ts
    - apps/server/src/realtime/SocketService.ts
    - apps/server/src/services/deviceLivenessRegistry.ts
    - apps/server/src/routes/device.ts
    - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
    - apps/web/src/hooks/useDisplayStoryRuntime.ts
    - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
    - apps/web/src/hooks/useImagePlaylistRuntime.ts
    - apps/web/src/hooks/useDisplayClientHeartbeat.ts
    - apps/web/src/layouts/LayoutShell.tsx
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/FactoryCircuit/index.tsx
    - apps/web/src/pages/Images/index.tsx
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/DeviceStatus/viewModel.ts
    - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
    - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - Removed:
    - apps/web/src/pages/runtimeConfigHydration.tsx
    - apps/web/src/pages/runtimeConfigHydration.test.ts
- Affected APIs: `GET /api/device/status` 的 `data.displayClients[]` 新增欄位（純新增，既有欄位不變）；Socket.IO `client:heartbeat` payload 新增欄位。
- Affected surfaces: 五個 playback 展示頁移除疊層，需依 `docs/ops/fhd-closeout.md` 產生 fresh witness 並取得使用者 acceptance。
