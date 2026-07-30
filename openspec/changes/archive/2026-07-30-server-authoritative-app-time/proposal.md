## Why

現場 Client 無外網與 NTP Server，但播放排程、Freshness、離線年齡與畫面時間需要一致權威。沿用 Socket.IO 廣播應用程式時間，並由 Client 使用 monotonic elapsed 推進，可避免修改 Raspberry Pi OS Clock 或增加高權限服務。

## What Changes

- Server process 啟動時產生新 instanceId，連線後立即 emit 時間訊號，之後每 30 秒廣播遞增 sequence。
- Signal 傳送 UTC epoch、Asia/Taipei 業務時區、broadcast interval、instanceId 與 sequence。
- Client 對同 instance 只接受較大 sequence；instance 改變時接受新基準，以 performance monotonic clock 推算 App Time。
- 定義 waiting、synced、stale、time-untrusted；三個廣播週期後 stale，30 分鐘後 time-untrusted。
- waiting／time-untrusted 凍結 schedule transition、freshness escalation 與 age calculation，但相對頁面倒數、Autoplay 與 Loop 繼續。
- 重新同步先更新內部時間，再於 Safe Playback Boundary 套用影響畫面的結果。
- Heartbeat 回報 time sync state；文件明確說明 Server Clock 仍由現場維護，且本功能不修改 OS Clock。

## Capabilities

### New Capabilities

- server-authoritative-app-time: 定義 Server Time Signal、monotonic App Time 與失信狀態機。

### Modified Capabilities

- display-client-liveness: Heartbeat 增加 Time Sync State。
- playback-display-runtime-controls: 播放排程改用可信 App Time，失信時保留相對輪播。

## Impact

- Affected specs: server-authoritative-app-time, display-client-liveness, playback-display-runtime-controls
- Affected code:
  - New: packages/shared/src/appTime.ts, apps/server/src/realtime/serverTimeSignal.ts, apps/server/src/realtime/serverTimeSignal.test.ts, apps/web/src/services/appTime.ts, apps/web/src/services/appTime.test.ts, apps/web/src/hooks/useAppTime.ts
  - Modified: packages/shared/src/index.ts, apps/server/src/realtime/SocketService.ts, apps/web/src/services/socket.ts, apps/web/src/hooks/useDisplayClientHeartbeat.ts, apps/web/src/hooks/usePlaybackController.ts, apps/web/src/components/AppHeader.tsx, docs/architecture/server-app-time.md, deploy.md
  - Removed: none
