## Context

展示機（kiosk 瀏覽器）以 `playback-safe` session class 連上既有 Socket.IO。`apps/web/src/services/socket.ts` 維護單例 client，型別已宣告 `client:heartbeat` 但僅在本地更新 `lastHeartbeatAt`，未送往 server。`apps/server/src/realtime/SocketService.ts` 僅在 `connection` 時 join 房間並推送初始 `mqtt:status` 與 `liveMetrics:update`，沒有任何上行事件監聽。`apps/server/src/routes/device.ts` 的 `GET /api/device/status` 只回 server 主機 telemetry（CPU/記憶體/磁碟）與 displayOps 摘要，且已用 `app.managementAccess.isTrustedManagementReadRequest` 做存取控管。播放外殼為 `apps/web/src/layouts/LayoutShell.tsx`，管理頁外殼為 `ManagementShell.tsx`。

## Goals / Non-Goals

**Goals:**

- 讓 server 能得知每台展示端的最後回報時間、目前路由與播放頁、是否播放/閒置。
- 在 `Device Status` 管理頁呈現展示端清單與 online/stale/offline 彙總。
- 提供純函式做 liveness 分類，便於單元測試，且不依賴系統時鐘隱性狀態。

**Non-Goals:**

- 不在本變更做白屏自動 reload 或看門狗（屬 add-playback-shell-crash-recovery-watchdog）。
- 不做跨重啟的歷史持久化；登錄表為記憶體內，server 重啟即重建。
- 不做多裝置集中 fleet 管理或遠端推播切頁（未來變更）。

## Decisions

- **以既有 Socket.IO 連線承載 heartbeat，不新增 HTTP endpoint**：展示端已長連 socket，沿用可避免額外輪詢與 CORS/權限面。替代方案是新增 `POST /api/device/heartbeat`，但會增加 server 入口面與管理權限判斷負擔，且展示端為 `playback-safe`，POST 會被 management mutation 防護擋下。
- **登錄表為記憶體內 Map，key 為 socket id**：展示端數量少（單機或少數幾台），記憶體足夠；socket id 在連線生命週期內穩定，`disconnect` 可精準清除。替代方案是寫 SQLite，但 heartbeat 高頻寫入會與 retention 問題衝突，且重啟後的歷史價值低。
- **liveness 分類抽成 `packages/shared` 的純函式**：server 與（未來）web 都能重用且可測。分類僅依 `lastSeenAt`、`connected`、`now`、`stalenessWindowSeconds`，不讀全域時鐘。
- **staleness 視窗預設值取 heartbeat 間隔的數倍**：heartbeat 間隔定為 10 秒，staleness 視窗預設 30 秒（容許漏掉約 2 次）。兩者皆以 shared 常數匯出，供 server 與測試引用。
- **`displayClients` 掛在既有 device status 回應 `data` 下**：沿用既有 management-only 存取邊界，無需新權限。

## Implementation Contract

- **Behavior**：管理者開啟 `Device Status` 時，看到一個展示端清單，每列顯示目前頁面（pageKey 或路由）、是否播放中、最後回報時間與狀態徽章（online/stale/offline），並有一個依狀態分組的計數摘要。展示端在播放時每 10 秒回報一次，切頁時立即回報。
- **Interface / data shape**：
  - 上行 socket 事件 `client:heartbeat`，payload 形狀：`{ sessionClass: "playback-safe" | "management-trusted"; route: string; pageKey: string | null; isPlaying: boolean; isIdle: boolean; viewport: { width: number; height: number }; clientTime: string }`（`clientTime` 為 ISO 字串）。
  - `packages/shared` 匯出：型別 `DisplayClientHeartbeat`、`DisplayClientLivenessState = "online" | "stale" | "offline"`、`DisplayClientLivenessEntry`、`DisplayClientLivenessSnapshot`；常數 `DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS = 10000`、`DISPLAY_CLIENT_STALENESS_WINDOW_SECONDS = 30`；純函式 `classifyDisplayClientLiveness({ lastSeenAt, connected, now, stalenessWindowSeconds }): DisplayClientLivenessState` 與 `buildDisplayClientLivenessSnapshot(entries, now): DisplayClientLivenessSnapshot`（snapshot 含 `clients: DisplayClientLivenessEntry[]` 與 `summary: { online: number; stale: number; offline: number; total: number }`）。
  - `SocketService` 新增公開方法 `getDisplayClientLivenessSnapshot(now?: Date): DisplayClientLivenessSnapshot`。
  - `GET /api/device/status` 回應 `data.displayClients` 等於該 snapshot。
- **Failure modes**：未知 socket id 的 heartbeat 直接忽略不丟例外；payload 欄位缺漏或型別不符時，該筆 heartbeat 被忽略並以 `app.log.warn` 記錄，不更新登錄表；untrusted 請求在回傳 `displayClients` 前即被 `deny` 擋下。
- **Acceptance criteria**：
  - `classifyDisplayClientLiveness` 的單元測試涵蓋 design 中 Example 表的四個 case（含邊界 = window）。
  - `SocketService` 測試：connection→heartbeat 後 snapshot 含 1 筆且欄位正確；disconnect 後 snapshot 不含該筆；未知 socket heartbeat 不丟例外。
  - `device.ts` 測試：trusted 請求回應 `data.displayClients.summary` 與 `clients`；untrusted 請求得到 denied envelope 且無 `displayClients`。
  - web `useDisplayClientHeartbeat` 測試：socket connected 且過一個間隔會呼叫 emit；pageKey 變更立即 emit；disconnected 不 emit。
- **Scope boundaries**：
  - In scope：shared 型別/常數/純函式；server socket 監聽、登錄表、snapshot、device status 欄位；web heartbeat hook 與在 `LayoutShell` 接線；`Device Status` 清單呈現；對應測試。
  - Out of scope：白屏/看門狗自動 reload、Wake Lock、跨重啟持久化、遠端控制展示端、管理權限模型調整。

## Risks / Trade-offs

- **記憶體內狀態於 server 重啟後歸零**：可接受，展示端會在下一次 heartbeat 重新登錄；不需要歷史。
- **時鐘偏差**：分類以 server 的 `lastSeenAt`（server 收到時間）為準，不用 client 時鐘，避免展示端時鐘不準造成誤判；`clientTime` 僅作為輔助診斷顯示。
- **heartbeat 流量**：每台每 10 秒一次、payload 極小，對單機/少量展示端可忽略。
