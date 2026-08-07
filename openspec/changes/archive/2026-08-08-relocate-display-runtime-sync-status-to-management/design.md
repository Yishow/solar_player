## Context

五個 playback 展示頁在 runtime 資料同步失敗時，會由共用元件 `RuntimeConfigFallbackBanner` 在 `DisplayCanvas` 上疊一個絕對定位提示框。這個框由每個展示頁自己組裝：頁面把 config 載入錯誤與 story runtime 錯誤傳給共用的狀態解析函式，只要 runtime 錯誤存在且 `usesFallback` 為真就顯示。

共用的 runtime 生命週期 hook `useRuntimeRefreshLifecycle` 在載入失敗時把狀態標成 `usesFallback: true` 並保留錯誤訊息，之後不會自行重試。它只在兩種情況重新載入：收到 `display:sync` socket 事件，或 `refreshKey` 改變。因此展示機開機期間 app time 尚未同步、或 server 端訊號延遲導致的一次暫時性失敗，會讓提示框永久停在畫面上。

三個展示 runtime hook（display story、sustainability story、image playlist）都包在 `useRuntimeRefreshLifecycle` 之上；`EnergyTrend` 與 `EnergyHistory` 這兩個管理頁也使用同一個 hook，因此任何加在 hook 上的新行為必須是選擇性加入，不能無條件套用到管理頁。

管理端已有可承接的通道：`LayoutShell` 透過 `useDisplayClientHeartbeat` 定期送出 `client:heartbeat`，payload 已含 route、pageKey、`timeSyncState` 與 profile 更新狀態；`SocketService` 驗證 payload、`deviceLivenessRegistry` 保存、`GET /api/device/status` 以 `data.displayClients` 回傳、`Device Status` 頁逐台呈現。

## Goals / Non-Goals

**Goals:**

- 五個 playback 展示頁的畫面上不再出現任何 runtime 同步狀態疊層。
- runtime 同步狀態與最後成功同步時間可在 `Device Status` 管理頁逐台讀取，包含展示機在另一台裝置上播放的情形。
- 開機期間的暫時性同步失敗能自行復原，不需等待下一次 `display:sync` 事件。
- 管理頁 `EnergyTrend` 與 `EnergyHistory` 的 runtime 行為維持不變。

**Non-Goals:**

- 不改變 runtime 資料的來源、payload schema 或 fallback 內容。
- 不調整五個展示頁的 FHD 視覺構圖、卡片、版位或 canvas 尺寸。
- 不新增管理端頁面或路由。
- 不改動 app time 同步機制，也不處理 server 端訊號延遲的根因。
- 不為 runtime 同步狀態新增資料庫或檔案持久化。
- 不保留任何在展示頁上有條件顯示提示框的降級選項。

## Decisions

### 在共用 runtime 生命週期 hook 集中處理回報與重試

回報與重試都放進 `useRuntimeRefreshLifecycle`，而不是分別改五個展示頁。三個展示 runtime hook 都經過它，一處實作即涵蓋五頁；分散實作會讓五個頁面各自持有重試計時器，難以保證一致。

以新增的選擇性參數啟用：呼叫端傳入展示頁識別鍵時才啟用回報與自動重試。三個展示 runtime hook 傳入，`EnergyTrend` 與 `EnergyHistory` 不傳，因此管理頁行為不變。

替代方案：在每個展示頁各自加 `useEffect` 回報。否決原因是五份重複邏輯，且無法涵蓋重試。

### 以模組級回報器而非 React context 傳遞狀態到 heartbeat

新增模組級單例 `displayRuntimeSyncReporter`，提供寫入與讀取快照兩個函式。展示 runtime hook 寫入，`LayoutShell` 的 heartbeat payload factory 讀取。

展示頁是 `LayoutShell` 的 `Outlet` 子節點，狀態流向與 React 樹方向相反。用 context 需要在 `LayoutShell` 持有 state，子節點每次同步都會觸發整個 shell 重新 render，對每 10 秒送一次 heartbeat 的熱路徑是不必要的代價。模組級單例讓 heartbeat 在送出當下讀取最新值，不產生額外 render。

替代方案：React context 加 reducer。否決原因是 shell 層級的無謂 re-render。

### 沿用 display client heartbeat 與 Device Status，不新增管理路由

runtime 同步狀態是「每一台展示 client 的狀態」，與既有的 `timeSyncState`、last seen、profile 更新狀態同一類。`Device Status` 已逐台列出這些欄位，直接擴充該列即可，不需要新頁面或新 API。

替代方案：在某個 `/settings/*` 頁新增區塊。否決原因是那些頁面沒有 display client 清單，得重新建一份，且無法呈現「哪一台展示機」的資訊。

### 有界指數退避重試取代永久停留 fallback

載入失敗後排定一次重試，延遲依序為 2 秒、4 秒、8 秒、16 秒、32 秒，之後固定為 60 秒，持續重試直到成功或元件卸載。成功後重置退避序列。任何新的載入（`display:sync` 事件、`refreshKey` 改變、手動 refresh）都必須先取消尚未觸發的重試，避免重複請求。

固定上限 60 秒是為了讓無人值守的展示機在長時間斷線後仍會嘗試復原，同時不對 server 造成密集重試。

替代方案：固定間隔重試。否決原因是開機期間的暫時性失敗應該在數秒內復原，固定長間隔會讓復原過慢；固定短間隔則在真實斷線時對 server 過度施壓。

### 完全移除 playback surface 上的 fallback 疊層元件

刪除 `RuntimeConfigFallbackBanner` 元件與其狀態解析函式所在的模組及其測試，並移除五個展示頁的匯入與呼叫。保留元件但不使用會留下誤導性的死碼。

### heartbeat 通道的涵蓋邊界必須在管理端被顯式標示

heartbeat 只由通過 socket 身分驗證的 client 送出。未配對的 client 在 handshake 就取不到 Display Client Context，因此送不出 heartbeat，也不會出現在 display client liveness 清單中。這是 `identity-aware-display-client-liveness` 要求「無效或撤銷的憑證不得建立 Device registry entry」的直接結果，不是本 change 要修正的缺陷。

由此產生一個真實的誤讀風險：管理者看到 `Device Status` 的 client 清單「沒有異常」，實際可能是那台機器根本沒配對、連清單都進不去。本 change 以兩件事處理這個風險 — 在 client 區塊標示涵蓋範圍為「已配對且連線中」，以及對從未回報 runtime 同步的 client 顯示「未回報」而非空白。

未配對 client 本身的可見性需要 server 端的 401 事實才能承接，不在本 change 範圍內，由 `surface-unpaired-display-access-in-management` 處理。

替代方案：放寬 socket 身分驗證讓未配對 client 也能送 heartbeat。否決原因是那等於允許未經身分驗證的來源寫入 liveness registry，直接違反既有要求，且會讓管理端的裝置清單可被任意來源污染。

## Implementation Contract

**Behavior**

- 五個 playback 展示頁（`/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability`）在 runtime config 載入失敗或 runtime 資料同步失敗時，畫面上不出現任何提示框或疊層；頁面維持既有的 fallback-safe 渲染內容。
- 展示 runtime 載入失敗後，客戶端自行重試直到成功；成功後狀態回到正常，不需人工介入。
- 管理者在 `Device Status` 頁的每一列 display client 上，可讀到該台展示機的 runtime 同步狀態與最後成功同步時間。
- `EnergyTrend` 與 `EnergyHistory` 的 runtime 載入與失敗行為完全不變。

**Interface / data shape**

- `DisplayClientHeartbeat`（`packages/shared`）新增四個平坦欄位：
  - `runtimeSyncState`：`"unknown" | "loading" | "synced" | "degraded"`
  - `runtimeSyncPageKey`：`string | null`，回報來源的展示頁識別鍵
  - `runtimeSyncResolvedAt`：`string | null`，最後一次成功同步的 ISO 時間字串
  - `runtimeSyncError`：`string | null`，最後一次失敗訊息，狀態為 `synced` 時為 `null`
- `DisplayClientLivenessEntry` 與 `DisplayClientLivenessSnapshot` 的 client 物件帶出同名四個欄位。
- `GET /api/device/status` 回應的 `data.displayClients[]` 每筆帶出同名四個欄位；既有欄位不變、不重新命名。
- 新模組 `displayRuntimeSyncReporter` 匯出兩個函式：一個接受上述四個欄位的部分更新並寫入模組狀態，一個回傳目前快照。未曾回報時快照為 `runtimeSyncState: "unknown"` 且其餘三欄為 `null`。
- `useRuntimeRefreshLifecycle` 的 options 新增一個選擇性欄位，帶入展示頁識別鍵時啟用回報與自動重試；不帶時兩者皆不啟用。

**Failure modes**

- 展示頁 runtime 失敗只寫入回報器並排定重試，不在 playback surface 上呈現任何訊息。
- socket 未連線時不送 heartbeat，回報器仍持續累積最新狀態，連線恢復後的第一次 heartbeat 帶出當下狀態。
- `SocketService` 收到不合法的 `runtimeSyncState` 值時，該筆 heartbeat 的 runtime 同步欄位視為未回報（`"unknown"` 且其餘為 `null`），既有欄位照常處理，不因此拒收整筆 heartbeat。
- registry 中尚未收到任何 runtime 同步回報的 client，四個欄位維持預設值，`Device Status` 顯示「未回報」而非空白。

**Acceptance criteria**

- `useRuntimeRefreshLifecycle` 的單元測試涵蓋：帶入展示頁識別鍵時失敗後會依退避序列重試並在成功後重置；未帶入時不重試也不回報；新載入會取消待觸發的重試。
- `displayRuntimeSyncReporter` 的單元測試涵蓋：初始快照為未回報狀態、寫入後讀到最新值、`synced` 狀態下錯誤訊息為 `null`。
- `useDisplayClientHeartbeat` 的既有測試擴充為驗證 payload 帶出四個 runtime 同步欄位。
- `displayClientLiveness` 與 `deviceLivenessRegistry` 的既有測試擴充為驗證欄位預設值、heartbeat 寫入後的值，以及不合法 `runtimeSyncState` 落回未回報。
- `DeviceStatus` viewModel 測試驗證四種 `runtimeSyncState` 各自的顯示標籤與最後同步時間格式。
- 以搜尋確認 repo 內不再有 `RuntimeConfigFallbackBanner` 或其狀態解析函式的任何引用。
- `DeviceStatus` 的 display client 區塊呈現涵蓋範圍說明，內容明確指出清單只涵蓋已配對且連線中的 client；以該頁測試斷言該說明文字存在。
- `pnpm verify` 通過。
- 五個 playback 頁依 `docs/ops/fhd-closeout.md` 產生 fresh witness batch 與 evidence bundle，人工 acceptance 由使用者判定。

**Scope boundaries**

- 在範圍內：共用 runtime 生命週期 hook、新回報器模組、heartbeat payload、socket 驗證、liveness registry、`GET /api/device/status` 回應、`Device Status` 呈現、五個展示頁移除疊層、疊層模組刪除。
- 不在範圍內：runtime 資料來源與 payload schema、展示頁視覺構圖、管理端新頁面或新路由、app time 同步機制、`EnergyTrend` 與 `EnergyHistory` 的行為、任何持久化儲存、socket 身分驗證的放寬，以及未配對 client 本身在管理端的可見性。

## Risks / Trade-offs

- [移除疊層後，展示機在現場失去唯一的同步異常提示] → 狀態改由 heartbeat 回報並在 `Device Status` 逐台呈現；同時加入自動重試，讓暫時性失敗不需人工察覺即可復原。
- [自動重試在 server 長時間不可用時持續產生請求] → 退避上限固定為 60 秒，單一 client 每分鐘最多一次重試；且任何新載入會先取消待觸發的重試，不會累積多個計時器。
- [模組級單例在同一個瀏覽器開多個展示分頁時會互相覆寫] → 展示機為單一全螢幕 kiosk 分頁，此為既有部署前提；回報欄位帶 `runtimeSyncPageKey`，管理端可辨識回報來源頁面。
- [heartbeat payload 擴充可能影響既有 client 與 server 的相容性] → 四個欄位皆為純新增，server 對缺欄位的舊 heartbeat 落回未回報預設值，不拒收。
- [五個展示頁屬於 FHD playback surface，移除疊層仍需視覺驗收] → 依 `docs/ops/fhd-closeout.md` 產生 fresh witness 與 evidence bundle，人工 acceptance 由使用者決定。
- [未配對的展示機不會出現在 client 清單中，管理者可能把「清單無異常」誤讀為「全部正常」] → `Device Status` 的 client 區塊標示涵蓋範圍為已配對且連線中的 client，且從未回報者顯示「未回報」而非空白；未配對 client 本身的可見性由 `surface-unpaired-display-access-in-management` 承接。
