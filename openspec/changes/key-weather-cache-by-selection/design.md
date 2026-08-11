## Context

WeatherService singleton 同時服務 playback current weather、management preview、manual refresh 與 MQTT weather publish。現有 cache identity 只有 expiry，沒有 request selection；因此不同 caller/地點共享同一筆記憶體狀態。

## Goals / Non-Goals

**Goals:**

- cache 與 stale fallback 永遠只對同一有效地點 selection 生效。
- preview pending station/county 時內容與 draft selection 一致。
- 保留現有 update interval、5-minute stale retry、manual refresh 與 MQTT publish 行為。
- cache 數量有界，避免管理員瀏覽很多 station 後無限增長。

**Non-Goals:**

- 不做 persistent weather cache 或多日歷史。
- 不改 CWA client response parsing。

## Decisions

### 建立 canonical WeatherSelectionKey

以 normalized `locationMode`, `countyName`, `stationId` 產生 deterministic key。County mode 忽略 stationId；station mode納入 county + stationId。所有 getCurrentWeather request 先算 key，cache lookup、last-success 與 stale fallback 都只在同 key 內發生。

### 使用小型有界 selection cache

以最多 8 個 selection 的 LRU Map 保存 `{cachedSnapshot,lastSuccessfulSnapshot,cacheExpiredAt}`。管理 preview 在數個 station 間切換時仍可避免重抓，但不會無限累積。若實作成本希望更小，可只保留單一 cache entry；不論選哪種都必須滿足 selection identity requirement。

### Location save 與 manual refresh 精準失效

保存 weather settings 後，若 saved selection key 改變，播放端下一次 current request自然 miss；可同時移除舊 active entry以降低混淆。Manual refresh 接收/解析目前 saved key，只清該 key再發一次 upstream request，不清除其他 preview entries。

### Stale fallback 不跨 selection

若新 selection upstream 失敗且該 selection沒有自己的 last-success，回傳 unavailable；不得拿另一地點的 last-success 變成 stale。Diagnostic `source=stale` 只在同 key有 last-success 時成立。

## Implementation Contract

- 桃園 current cache 尚有效時改 preview 台北，台北 preview 不得回桃園 snapshot。
- 新 station upstream failure 且沒有該 station history 時回 unavailable；舊 station cache保留也不能被用來填補。
- 同 selection 在 update interval 內重複 request 仍只呼叫一次 CWA。
- manual refresh 必須 bypass該 selection cache並在成功後更新它。
- weather publish payload只來自本次 requested selection 的成功 snapshot。

## Migration Plan

純記憶體改動，restart 自然清空。沒有 schema migration。部署後第一次每個 selection request會重新抓 upstream。

## Risks / Trade-offs

- [Risk] preview 快速切換多個 station 增加 CWA request → LRU cache 保留最近 selection 並沿用既有 update interval。
- [Risk] key normalization 不一致造成 cache miss → canonical helper由 route/service tests共用並涵蓋 null/trim/county/station cases。
