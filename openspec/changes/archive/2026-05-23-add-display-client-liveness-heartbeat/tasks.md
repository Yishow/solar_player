## 1. Shared 型別、常數與 liveness 純函式

- [x] 1.1 在 packages/shared/src/displayClientLiveness.ts 定義 `DisplayClientHeartbeat`、`DisplayClientLivenessState`、`DisplayClientLivenessEntry`、`DisplayClientLivenessSnapshot` 型別與常數 `DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS = 10000`、`DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS = 30`。驗證：`pnpm --filter @solar-display/shared build` 通過且型別可從套件入口匯入。
- [x] 1.2 [P] 實作 spec requirement「Liveness state is derived from a configurable staleness window」：先寫測試 packages/shared/src/displayClientLiveness.test.ts 覆蓋 `classifyDisplayClientLiveness` 的四個 case（last-seen 5s→online、=30s→online、45s→stale、未連線→offline），再實作 `classifyDisplayClientLiveness({ lastSeenAt, connected, now, stalenessWindowSeconds })` 使測試通過。驗證：`pnpm --filter @solar-display/shared test`（若無 test script 則以受影響 app 測試覆蓋）下該檔測試 RED→GREEN。
- [x] 1.3 實作 `buildDisplayClientLivenessSnapshot(entries, now)` 回傳 `{ clients, summary: { online, stale, offline, total } }`，並在 displayClientLiveness.test.ts 加一案例驗證 summary 計數正確（混合三種狀態）。驗證：該測試通過。
- [x] 1.4 在 packages/shared/src/index.ts 匯出上述型別、常數與函式。驗證：server 與 web 可透過 `@solar-display/shared` 匯入，`pnpm run build` 通過。

## 2. Server：socket 監聽、登錄表與 snapshot

- [x] 2.1 先寫測試 apps/server/src/realtime/SocketService.test.ts（新增）：模擬 connection→`client:heartbeat` 後 `getDisplayClientLivenessSnapshot()` 含 1 筆且 route/pageKey/isPlaying/isIdle/lastSeenAt 正確；disconnect 後不含該筆；未知 socket 的 heartbeat 不丟例外且不新增 entry。驗證：`pnpm --filter @solar-display/server test` 下此檔 RED。
- [x] 2.2 實作 spec requirement「Server maintains a per-client liveness registry」：在 apps/server/src/realtime/SocketService.ts 新增以 socket id 為鍵的記憶體登錄表：connection 時建立 entry（含 sessionClass、remoteAddress、connectedAt、lastSeenAt）、註冊 `socket.on("client:heartbeat", ...)` 更新 entry、`socket.on("disconnect", ...)` 移除 entry，payload 欄位缺漏/型別不符時以 `this.logger.warn` 記錄並略過。驗證：2.1 測試 GREEN。
- [x] 2.3 在 SocketService 新增公開方法 `getDisplayClientLivenessSnapshot(now?: Date)`，以登錄表與 shared 純函式產生 snapshot（connected=true，因 entry 僅存在於連線中）。驗證：2.1 中 snapshot 欄位斷言通過。

## 3. Server：Device Status 回應加入 displayClients

- [x] 3.1 先在 apps/server/src/routes/device.test.ts 新增案例：trusted 管理請求 `GET /api/device/status` 回應 `data.displayClients` 含 `summary` 與 `clients`；untrusted 請求得到 management denied envelope 且回應不含 `displayClients`。驗證：`pnpm --filter @solar-display/server test` 下新增案例 RED。
- [x] 3.2 實作 spec requirement「Device Status exposes display client liveness to management」：在 apps/server/src/routes/device.ts 的 `GET /api/device/status` 成功回應 `data` 加入 `displayClients: app.socketService.getDisplayClientLivenessSnapshot()`（沿用既有 `isTrustedManagementReadRequest` 守門，untrusted 仍先 `deny`）。驗證：3.1 測試 GREEN。

## 4. Web：heartbeat 發送與接線

- [x] 4.1 在 apps/web/src/services/socket.ts 匯出 `emitClientHeartbeat(payload: DisplayClientHeartbeat)`，僅在 client 為 connected 時 `client.emit("client:heartbeat", payload)`。驗證：apps/web/src/services/socket.test.ts 新增案例—connected 時呼叫會 emit、disconnected 時不 emit。
- [x] 4.2 [P] 實作 spec requirement「Display clients emit periodic liveness heartbeats」：先寫測試 apps/web/src/hooks/useDisplayClientHeartbeat.test.ts：socket connected 且經過一個 `DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS` 會呼叫一次 emit；當傳入的 pageKey 改變時立即額外 emit；disconnected 時不 emit。再實作 apps/web/src/hooks/useDisplayClientHeartbeat.ts（參數含 route、pageKey、isPlaying、isIdle）。驗證：`pnpm --filter @solar-display/web test` 下此檔 RED→GREEN。
- [x] 4.3 在 apps/web/src/layouts/LayoutShell.tsx 接線 `useDisplayClientHeartbeat`，以目前路由與 playback controller 的 currentPage.pageKey/isPlaying/isIdle 為來源（管理外殼 ManagementShell 不接線）。驗證：apps/web/src/layouts/LayoutShell.test.ts 增補斷言 hook 以正確 props 被呼叫，`pnpm --filter @solar-display/web test` 通過。

## 5. Web：Device Status 呈現展示端清單

- [x] 5.1 在 apps/web/src/services/api.ts 的 device status 回應型別加入 `displayClients: DisplayClientLivenessSnapshot`。驗證：`pnpm --filter @solar-display/web build` 型別通過。
- [x] 5.2 先在 apps/web/src/pages/DeviceStatus/viewModel.test.ts 增案例：給定含三種狀態的 `displayClients`，view model 產出每列的頁面標籤、播放狀態文字、最後回報相對時間與狀態徽章類型，及狀態計數摘要。再在 apps/web/src/pages/DeviceStatus/viewModel.ts 實作對應映射。驗證：該測試 RED→GREEN。
- [x] 5.3 在 apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx 新增展示端清單區塊，呈現 view model 的清單與摘要（online/stale/offline 徽章）。驗證：apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx 斷言渲染出對應列數與狀態徽章文字。

## 6. 整合驗證

- [x] 6.1 執行 `pnpm run build` 與 `pnpm run test`（server + web）全綠。驗證：兩指令成功結束、無型別或測試錯誤。
