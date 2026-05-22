## Context

`apps/web/src/layouts/LayoutShell.tsx` 透過 `useMqttStatus()` 取得 `{ isHydrated, status }`（status 為 `MqttConnectionStatus`，含 `connected`、`reason`），目前已用於 offline 導向判斷，但渲染時為 `header={<AppHeader />}`，未傳 `meta`。`apps/web/src/components/AppHeader.tsx` 的 `meta` 含 `status`、`statusLabel`、`weather`，並對缺值提供寫死 fallback：`StatusBadge` 預設 `connected` / `Online`、天氣預設 `晴 26°C`。系統無任何天氣資料來源，也無呼叫端傳入 weather。`StatusBadge`（`apps/web/src/components/StatusBadge.tsx`）接受 `status: "connected" | "connecting" | "disconnected"` 與 `label`。MQTT `reason` 取值包含 `connected`、`reconnecting`、`offline`、`mock` 與錯誤訊息字串。

## Goals / Non-Goals

**Goals:**

- 播放 header 連線徽章反映真實 MQTT/socket 狀態。
- 移除寫死天氣，header 不再顯示捏造資訊。
- 狀態映射為可測純函式。

**Non-Goals:**

- 不新增天氣資料來源或天氣 UI。
- 不改 `StatusBadge` 元件本身的樣式或 API。
- 不改管理頁 header（管理頁使用 `ManagementShell`，不在此範圍）。
- 不改 socket 與 MQTT 狀態的取得方式（沿用 `useMqttStatus`）。

## Decisions

- **狀態映射抽為純函式 `resolveHeaderConnectionMeta`**：放在 `apps/web/src/components/headerConnectionMeta.ts`，輸入 `{ connected, reason, isHydrated }`，輸出 `{ status, label }`。理由：映射有多分支（含 mock 與未 hydrated），純函式可完整單元測試，`LayoutShell` 與 `AppHeader` 只做接線。
- **未 hydrated 視為 connecting**：開機初期尚未收到狀態時顯示「連線中」比顯示「Online」誠實。
- **mock 視為 connected**：mock 模式有模擬資料流，徽章顯示 connected，label 區分為 `Mock`，避免被誤認為真連線又不誤報離線。
- **移除 weather 而非保留空 prop**：系統無天氣來源且無呼叫端傳入，依專案規範刪除未使用程式碼，移除 `AppHeader` 的 weather 區塊、`SunGlyph` 使用點與 `meta.weather`、`meta.status`/`meta.statusLabel` 的寫死 fallback（改由 `LayoutShell` 一律傳入真實 meta）。

## Implementation Contract

- **Behavior**：MQTT 斷線時播放 header 徽章顯示離線（非 Online）；重新連線中顯示 connecting；尚未取得狀態顯示 connecting；mock 顯示 connected 並標示 Mock；header 不再出現任何天氣字串。
- **Interface / data shape**：
  - `resolveHeaderConnectionMeta(input: { connected: boolean; reason: string | null; isHydrated: boolean }): { status: "connected" | "connecting" | "disconnected"; label: string }`，映射依下表：
    - `isHydrated === false` → `{ "connecting", "連線中" }`
    - `connected === true` 或 `reason === "connected"` → `{ "connected", "Online" }`
    - `reason === "mock"` → `{ "connected", "Mock" }`
    - `reason === "reconnecting"` → `{ "connecting", "重新連線" }`
    - 其餘（含 `offline` 與錯誤字串） → `{ "disconnected", "離線" }`
  - `LayoutShell` 以 `resolveHeaderConnectionMeta({ connected: status.connected, reason: status.reason, isHydrated })` 的結果作為 `<AppHeader meta={{ status, statusLabel }} />`。
  - `AppHeader` 移除 weather 區塊與 `meta.weather`；`status`/`statusLabel` 不再有寫死 fallback（由 `LayoutShell` 必定傳入）。
- **Failure modes**：`reason` 為非預期字串時落到 `disconnected`（保守，避免誤報連線）；`status` 物件缺欄位時以 `connected=false` 對待。
- **Acceptance criteria**：
  - `apps/web/src/components/headerConnectionMeta.test.ts` 覆蓋 spec Example 表五列（connected、reconnecting、offline、未 hydrated、mock）。
  - `apps/web/src/layouts/LayoutShell.test.ts` 增補：斷線狀態下傳入 `AppHeader` 的 `meta.status` 為 `disconnected`。
  - `AppHeader` 測試（或 LayoutShell 整合）斷言不再渲染 `晴 26°C` 或任何 weather 節點。
  - `pnpm --filter @solar-display/web test` 全綠、`pnpm --filter @solar-display/web build` 型別通過。
- **Scope boundaries**：
  - In scope：`headerConnectionMeta` 純函式、`LayoutShell` 接線、`AppHeader` 移除 weather 與寫死 fallback、對應測試。
  - Out of scope：天氣資料源、`StatusBadge` 樣式/API、管理頁 header、MQTT/socket 取得方式。

## Risks / Trade-offs

- **header 視覺變化**：移除天氣後右側 meta 區會少一塊；屬刻意移除捏造資訊，可接受，必要時由版面自然回流。
- **mock 顯示 connected**：可能讓人以為已連真 broker；以 `Mock` label 區分降低誤解。
