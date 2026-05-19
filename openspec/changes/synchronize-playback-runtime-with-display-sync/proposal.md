## Why

目前前端輪播控制器主要依賴 `playback:settingsUpdated` 觸發重載，但 server 端許多會改變有效輪播鏈的事件實際上透過 `display:sync` 廣播，例如 display page publish、MQTT readiness 變化、circuit slot 更新與圖片資產健康狀態變化。這會讓 preview、正式播放與 server 的 rotation 判斷短暫脫節。

## What Changes

- 讓前端播放控制器把 `display:sync` 視為正式的 rotation runtime refresh trigger，而不是只依賴 `playback:settingsUpdated`。
- 針對 `display-pages`、`mqtt`、`images`、`circuits` 等 scope 重新載入 rotation preview 與相關 runtime 狀態。
- 補上 reload coalescing / debounce 規則，避免多個 sync 事件在短時間內重複重建 playback runtime。
- 定義 route rotation 與 fallback route 在 reload 前後的 reconciliation contract，避免 route 閃跳或維持過期的 skip/playable 狀態。

## Capabilities

### New Capabilities

- `playback-runtime-display-sync`: 播放控制器在 display operations 變動後同步刷新有效輪播 runtime、fallback route 與 route rotation 狀態。

### Modified Capabilities

(none)

## Impact

- Affected specs: `playback-runtime-display-sync`
- Affected code:
  - Modified:
    - apps/web/src/hooks/usePageRotation.ts
    - apps/web/src/hooks/usePlaybackController.ts
    - apps/web/src/hooks/playbackRouteNavigation.ts
    - apps/web/src/hooks/playbackRouteSync.ts
    - apps/web/src/hooks/usePlaybackController.test.ts
    - apps/web/src/hooks/usePageRotation.test.ts
    - apps/web/src/services/socket.ts
  - New:
    - apps/web/src/hooks/displaySyncPlaybackReload.ts
  - Removed: (none)
