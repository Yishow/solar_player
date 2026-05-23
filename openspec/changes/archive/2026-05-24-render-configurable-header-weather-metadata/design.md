## Context

`AppHeader` 目前只有 `weather?: string` 這種自由字串入口，無法表達 loading、stale、unavailable，也無法穩定支撐「主資訊 + 次資訊」兩行格式。既有 spec 也仍保留「header 不顯示 weather」的舊前提，所以這個 change 需要把 header weather 升級成正式 shell metadata，而不是再把 CWA 文案直接拼進 component。

這個 change 只處理 header 端如何消費已正規化的 weather state，包括資料組裝、fallback 與版面保護。它依賴 weather source change 提供內部 contract，但不負責 provider 與設定 UI。

## Goals / Non-Goals

**Goals:**

- 將 header weather 從自由字串升級為可表達狀態的結構化 metadata。
- 支援「主資訊 + 次資訊」兩行呈現，並定義欄位優先順序與過長時的退化方式。
- 保留 weather slot，不可在 loading、disabled 或 unavailable 狀態下整塊消失。
- 明確限制 header 只能顯示真實內部 weather contract，不可回退到假資料。

**Non-Goals:**

- 不設計 CWA provider、cache 或資料表。
- 不在此 change 內建立 weather 設定表單。
- 不承諾用 socket 即時推送 weather 到 header，只要求 header 能正確消費目前可得資料。

## Decisions

### Replace free-form weather copy with structured header metadata

`AppHeader` 不再只收 `weather: string`，而是收可描述 `primaryText`、`secondaryText` 與 `state` 的 header weather metadata。這樣 loading、stale、disabled、unavailable 能透過明確 state 呈現，而不是靠 consumer 自己拼字串。

替代方案是保留單一字串，讓每個 layout 自己組字。這會讓 playback shell、management shell 與未來 preview surface 各自發明 fallback，難以測試，因此不採用。

### Keep the primary line focused on location, condition, and temperature

主資訊固定優先承載「地點 + 天氣現象 + 氣溫」，例如 `台北 多雲 31°C`。次資訊承載其他被選中的欄位，例如濕度、風速、觀測時間。這個優先序可以避免自訂欄位過多時把最重要的辨識資訊擠掉。

替代方案是完全照使用者選欄位順序平鋪。這會讓自訂欄位一多時，主資訊可能被觀測時間或氣壓占滿，因此不採用。

### Collapse overflow into secondary text and then truncate gracefully

header weather 區仍位於時鐘與 status badge 之間，可用寬度有限。設計上允許 primary/secondary 兩行，但仍要假設次資訊可能過長，因此組裝邏輯需要先把多餘欄位收斂進 secondary，再讓 component 用單行省略或固定寬度保護整體 shell，不讓 weather 擠壓時鐘與 badge。

替代方案是讓 header 隨內容自動換多行。這會破壞既有 FHD shell 高度與對齊，因此不採用。

### Preserve a neutral slot across loading, disabled, and unavailable states

weather slot 一律存在，但 copy 依 state 改變：`loading` 顯示同步中、`disabled` 顯示未啟用、`unavailable` 顯示暫時 unavailable、`ready` 顯示兩行 metadata。這讓 header 保持穩定，不會在資料缺口時左右跳動。

替代方案是 disabled 或 unavailable 時完全不 render weather。這會讓 header layout 與測試狀態變得不穩定，也會重演先前 weather slot 消失的回歸，因此不採用。

## Implementation Contract

此 change 完成後，header consumer 與 component 需要滿足以下契約：

- shell 端需要可產生 `HeaderWeatherMeta` 類型的物件，至少包含：
  - `state`: `loading` | `ready` | `disabled` | `unavailable` | `stale`
  - `primaryText`: 主資訊文字
  - `secondaryText`: 次資訊文字，可為空
- `AppHeader` 需要接受上述 metadata，而不是只接受自由 weather copy。
- 當 `state=ready` 時：
  - `primaryText` 必須優先包含 location/condition/temperature 中可用的資訊。
  - 其他已選欄位進入 `secondaryText`。
- 當 `state=stale` 時：
  - header 可以顯示最後一筆資料，但次資訊需要能看出資料不是最新的，例如帶出更新時間或 stale 標記。
- 當 `state=loading`、`disabled`、`unavailable` 時：
  - weather slot 仍渲染。
  - component 不得回退到任何偽造天氣內容，例如 `晴 26°C`。

失敗模式與 fallback：

- 若 current weather contract 缺少主資訊欄位，header 仍需產生可讀的中性文案，不可丟出空字串導致 slot 消失。
- 若 consumer 傳入過長次資訊，component 需要以固定寬度與文字省略保護時鐘與連線 badge 區塊。
- 若 management 與 playback shell 都使用同一個 mapper，測試需證明兩者 fallback 規則一致。

驗收條件：

- component tests 覆蓋 ready/loading/disabled/unavailable/stale 狀態。
- shell-level tests 證明連線狀態 badge 與 weather metadata 可同時存在，且 weather overflow 不會移除 badge。
- `spectra analyze render-configurable-header-weather-metadata --json` 無 Critical/Warning。
- `spectra validate render-configurable-header-weather-metadata` 通過。

明確 scope：

- In scope：header weather metadata 組裝、兩行文案、fallback、component contract、shell-level tests。
- Out of scope：provider fetch、weather 設定持久化、MQTT settings 頁面版型。

## Risks / Trade-offs

- [Risk] 結構化 metadata 會使 `AppHeader` props 從簡單字串升級，需同步更新現有測試。 → Mitigation：新增單獨 mapper 與 mapper tests，把字串組裝邏輯從 component 抽離。
- [Risk] 自訂欄位過多仍可能產生擁擠文案。 → Mitigation：固定主資訊優先序，次資訊允許截斷，避免侵蝕時鐘與 badge 區域。
- [Risk] stale/disabled/unavailable 文案若不一致，management 與 playback 會呈現不同語氣。 → Mitigation：以 shared mapper 或共同 helper 產生 copy，並由 shell 測試鎖住行為。
