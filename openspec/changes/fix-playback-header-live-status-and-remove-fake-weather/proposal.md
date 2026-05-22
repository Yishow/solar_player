## Problem

播放外殼 header 的連線狀態與天氣與真實情況脫節：

- `LayoutShell` 已從 `useMqttStatus()` 取得真實 `status`，但渲染 header 時沒有把它傳給 `AppHeader`，於是 `AppHeader` 一路落到預設值，連線徽章恆顯示 `Online / connected`，即使 MQTT/socket 實際已斷線。
- `AppHeader` 的天氣顯示一個寫死的常數 `晴 26°C`，系統並無任何天氣資料來源，且沒有任何呼叫端傳入真實天氣，等於永遠顯示捏造數值。

對展示看板而言，最顯眼的常駐狀態元素無法反映真實狀態，違反本專案「只顯示可信遙測、不得捏造數值」的既定原則。

## Root Cause

- `LayoutShell` 以無 props 的方式渲染 `AppHeader`（未傳 `meta`），導致 header 使用內建預設狀態與天氣。
- `AppHeader` 對 `meta.status` / `meta.weather` 提供寫死的 fallback（`connected` / `Online` / `晴 26°C`），在缺資料時呈現假資料而非真實或不顯示。

## Proposed Solution

- 新增純函式 `resolveHeaderConnectionMeta({ connected, reason, isHydrated })`，將 MQTT 連線狀態映射為 header 徽章用的 `{ status: "connected" | "connecting" | "disconnected"; label }`。
- `LayoutShell` 將 `useMqttStatus()` 的結果經由該純函式映射後，以 `meta` 傳入 `AppHeader`，使連線徽章反映真實狀態。
- 移除 `AppHeader` 內寫死的天氣顯示與其預設值（系統無天氣資料源），並移除未被使用的 `weather` 相關 prop 與預設 status/weather fallback。

## Non-Goals (optional)

(none — design.md 會記錄 Goals/Non-Goals)

## Success Criteria

- MQTT/socket 斷線時，播放 header 徽章顯示為 `disconnected`（離線）狀態，而非 `Online`。
- 尚未取得狀態（未 hydrated）時顯示 `connecting`。
- header 不再出現任何寫死的天氣字串。
- `resolveHeaderConnectionMeta` 有單元測試覆蓋 connected / reconnecting / offline / mock / 未 hydrated 各情況。

## Impact

- Affected specs: playback-header-live-status（新增）
- Affected code:
  - Modified:
    - apps/web/src/layouts/LayoutShell.tsx
    - apps/web/src/components/AppHeader.tsx
  - New:
    - apps/web/src/components/headerConnectionMeta.ts
  - Removed:
    - (none)
