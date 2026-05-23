## Context

目前 repo 的 header weather 只有前端 slot，沒有正式 weather provider、設定持久化或內部 API。使用者已明確指定採用中央氣象署 OpenData，並要求地點可在 `MQTT Settings` 內切換縣市或測站，表示 weather 已經不是一次性文案，而是跨 server、shared contract、management 設定與 playback header 的正式能力。

這個 change 只處理 weather source 與設定契約本身，不碰 header 排版，也不碰 `MQTT Settings` 頁面重組。它需要先提供乾淨的 server-side source of truth，後續兩個 change 才能各自消費同一份 state。

## Goals / Non-Goals

**Goals:**

- 建立中央氣象署 weather provider 與授權設定。
- 定義可持久化的 weather settings，包含啟用狀態、地點模式、縣市、測站、preset 與 custom fields。
- 提供 web 可讀寫的內部 weather API，以及 header 可讀的 normalized current weather contract。
- 定義 CWA 特殊值、缺值、timeout 與 stale cache 的統一 fallback 規則。
- 為 weather 設定建立獨立的 display sync scope，避免與既有 mqtt/topic 變更混在一起。

**Non-Goals:**

- 不設計 header 的主資訊/次資訊視覺組裝。
- 不重排 `MQTT Settings` 的 topic 卡片或 action 按鈕。
- 不讓 web 直接持有 CWA Authorization，也不引入第二個 weather provider。

## Decisions

### Use server-side CWA integration and normalized contracts

天氣資料由 server 直接呼叫 CWA，前端只讀內部 API。這樣可以把 Authorization、測站查詢、特殊值轉換與 cache 留在 server 處理，避免 `AppHeader` 或 `MqttSettings` 必須懂 CWA 原始 payload 結構。

替代方案是讓 web 直打 CWA，再在前端做欄位轉換。這會把授權碼暴露到 client，也會讓每個畫面都重覆處理 `X`、`-99`、`990` 等特殊值，因此不採用。

### Persist weather settings as a first-class management contract

weather settings 需要資料表與 shared type，而不是只存在 local state。因為使用者要求可切換縣市/測站、可選 preset 與 custom fields，這些都必須跨 reload 保留，且播放頁與管理頁要共用同一份設定。

替代方案是把 weather 設定塞進既有 MQTT 設定 payload。這會把 broker 契約與 weather 契約耦合成一塊，之後若 weather 移到其他管理頁會很難拆，因此不採用。

### Separate settings endpoints from current weather endpoints

weather API 拆成三類：設定、位置選項、目前資料。設定端點負責讀寫 operator choices；位置選項端點負責縣市與測站清單；current weather 端點提供 header 與預覽讀取 normalized observation。這樣 apply 階段可以分別測試 persistence、lookup 與 runtime fetch，不會把所有責任塞在同一個 response。

替代方案是單一 `/api/weather` 大 response 同時回傳設定、站點與目前資料。這會增加每次讀取的 payload，且無法清楚區分失敗來源，因此不採用。

### Add an explicit weather sync scope

weather 設定雖然會先出現在 `MQTT Settings`，但語意上不是 MQTT broker/topic 變更。新增 `weather` sync scope，可讓 `MQTT Settings` 同時監看 `mqtt` 與 `weather`，也讓其他管理頁在未來若不依賴 weather 時不會被誤刷。

替代方案是沿用既有 `mqtt` scope。這會把不同領域的 remote change 混在一起，讓 dirty draft 與 refresh 訊號失去判讀價值，因此不採用。

### Cache the last successful observation and mark stale data explicitly

CWA 不是本機即時資料源，header 與管理頁需要可讀的 fallback。server 會保留最後一次成功正規化的 observation，當上游 timeout 或暫時失敗時仍可回傳 cache，但要附帶 `fetchState` 與 `staleAt` / `updatedAt` 讓 consumer 明確知道資料新鮮度。

替代方案是只要抓不到最新資料就回 500。這會導致 header slot 頻繁掉到錯誤狀態，也讓短暫網路波動直接破壞 operator 體驗，因此不採用。

## Implementation Contract

此 change 完成後，系統需要提供以下穩定契約：

- `GET /api/weather/settings`
  - 回傳 weather 設定物件，至少包含 `enabled`、`locationMode`、`countyName`、`stationId`、`preset`、`fieldKeys`。
- `PUT /api/weather/settings`
  - 接受與上列對應的設定 payload。
  - 成功儲存後需要觸發 `display:sync`，scope 為 `weather`。
- `GET /api/weather/options`
  - 回傳可供設定頁使用的縣市與測站清單；當 `countyName` 有值時，測站清單需可過濾到該縣市。
- `GET /api/weather/current`
  - 回傳 normalized weather snapshot，而不是 CWA 原始 JSON。
  - normalized 欄位至少包含 `stationName`、`countyName`、`townName`、`weather`、`airTemperature`、`relativeHumidity`、`windSpeed`、`windDirection`、`airPressure`、`precipitation`、`observationTime`、`dailyHigh`、`dailyLow`、`fetchState`、`updatedAt`。

失敗模式與 fallback：

- 若 CWA Authorization 未設定，設定與 current API 不能回傳偽造氣象資料；應回傳可辨識的未配置狀態。
- 若上游回傳特殊值 `X`、`-99`、`-98`、`990` 或無法解析數值，server 要先轉成 `null` 或可辨識的 unavailable 值，不可把原始 magic value 直接外露給 web。
- 若最新抓取失敗但 cache 存在，`GET /api/weather/current` 應回傳最後一筆成功資料並標示 stale/fallback 狀態。
- 若設定的縣市或測站在 options 中已不存在，設定 API 應回傳可處理的 validation error，而不是靜默改寫成其他站點。

驗收條件：

- server tests 能覆蓋設定持久化、options lookup、special-value normalization 與 stale cache fallback。
- `spectra analyze add-cwa-weather-source-and-configuration --json` 無 Critical/Warning。
- `spectra validate add-cwa-weather-source-and-configuration` 通過。

明確 scope：

- In scope：weather provider、settings persistence、internal APIs、shared types、weather sync scope。
- Out of scope：header 視覺文案、管理頁卡片排版、播放頁即時 push 動畫。

## Risks / Trade-offs

- [Risk] CWA 觀測站欄位並非每站完整一致，部分欄位可能經常缺值。 → Mitigation：normalized contract 允許欄位為 `null`，並先定義白名單欄位，不要求每筆資料完整。
- [Risk] 新增 `weather` sync scope 會擴大 display sync vocabulary。 → Mitigation：把 scope 限定在 weather 設定儲存事件，並在 shared/display sync 測試中補明確案例。
- [Risk] 若 cache TTL 過長，header 可能長時間顯示舊資料。 → Mitigation：current contract 顯式回傳 stale 狀態與時間戳，讓 consumer 可決定如何呈現退化狀態。
