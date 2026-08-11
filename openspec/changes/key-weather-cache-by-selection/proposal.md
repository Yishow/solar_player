## Why

WeatherService 現在只有一份 `cachedSnapshot`、`lastSuccessfulSnapshot` 與 expiry，不記錄這份資料是由哪個 location mode、county 或 station 查回。只要 cache 尚未過期，切換地點後的 current request 或儲存前 preview 都可能拿到上一個地點的天氣；新地點 upstream 失敗時甚至可能把舊地點成功資料當成 stale fallback。這會讓畫面內容看起來正常、但地理來源錯誤。

## What Changes

- 天氣 cache 與 last-success stale fallback 以有效 selection key（location mode + county + station）隔離。
- cache hit 前必須確認 requested selection 與 cached selection 完全一致；不同地點不得共用 snapshot。
- 儲存前 preview 使用 pending selection 的 cache key，切換 county/station 後第一次 preview 必須取得該 selection 自己的資料或明確 unavailable，不得顯示其他地點。
- 保存 location selection 後，使不相容的 current cache 失效；manual refresh 只清除／刷新目前 selection。
- diagnostic 回報 cache/stale source 時保留 selection identity 供 server 內部驗證，但公共 payload 不新增敏感資訊。

## Non-Goals

- 不改 CWA dataset、授權方式或 station discovery。
- 不在本 change 新增天氣歷史資料庫。
- 不改 header 的視覺版型。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `mqtt-settings-weather-management`: preview/current weather cache 必須和 pending/saved location selection 綁定，且 stale fallback 不得跨地點。

## Impact

- Affected specs: `mqtt-settings-weather-management`
- Affected code: `weatherService`, weather route/settings service、MQTT Settings weather preview hooks/view model 與 tests。
- Affected data: 純 in-memory cache behavior；不需要 database migration。
