## Why

Server 短暫離線或 Browser 重啟時，Client 目前無正式的結構化 snapshot 與 App Shell 快取契約，可能退化成錯誤頁或失去播放上下文。Phase 2 需要在不偽裝即時性的前提下持續輪播最後成功內容，並把更新套用限制在 Safe Playback Boundary。

## What Changes

- IndexedDB 保存 Device Profile、Applied Version、Effective Rotation、Freshness Policy 與 Last-known Metrics snapshot。
- Cache Storage 保存 App Shell、樣式、圖片與已發布素材；Service Worker 背景下載並驗證新 App Shell。
- 有完整 cache 時，Server 離線與 Browser 重啟仍可播放最後 Applied Version 的內容與素材。
- Last-known data 可保留，但永遠顯示 source timestamp 與 freshness 語意；time-untrusted 時凍結 age，不使用 OS Clock 推進。
- 新 App Shell 與 snapshot 只在 Safe Playback Boundary 啟用；更新失敗保留上一個可用版本。
- 尚未取得 Server Time 時相對頁面倒數繼續，schedule、freshness escalation 與絕對年齡凍結。
- 提供真實 Browser offline/restart tests，驗證 App Shell、素材、rotation 與 last-known metrics。

## Capabilities

### New Capabilities

- offline-playback-cache-and-app-updates: 定義結構化離線快取、Service Worker 更新與 Safe Playback Boundary。

### Modified Capabilities

- playback-shell-crash-recovery: Browser 重啟且 Server 離線時改由最後可用 App Shell 與 snapshot 恢復。
- images-playback-fallback-behavior: 離線素材只使用已驗證 Cache Storage 內容，不回退到不存在的遠端資源。

## Impact

- Affected specs: offline-playback-cache-and-app-updates, playback-shell-crash-recovery, images-playback-fallback-behavior
- Affected code:
  - New: apps/web/src/sw.ts, apps/web/src/services/offlinePlaybackStore.ts, apps/web/src/services/offlinePlaybackStore.test.ts, apps/web/src/hooks/useOfflinePlaybackSnapshot.ts, apps/web/src/hooks/useSafeAppUpdate.ts, apps/web/src/hooks/useSafeAppUpdate.test.ts, tests/offline-playback-browser.test.mjs
  - Modified: apps/web/vite.config.ts, apps/web/src/main.tsx, apps/web/src/services/api.ts, apps/web/src/hooks/usePlaybackController.ts, apps/web/src/pages/Images/index.tsx, package.json
  - Removed: none
