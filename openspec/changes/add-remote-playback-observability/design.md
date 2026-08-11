## Context

既有 display heartbeat已能證明 client liveness與 rollout資訊，但播放 controller知道的 route/current page/countdown/image entry並沒有完整回傳到 Device Status。Screenshot 在一般 browser中沒有可靠跨平台 self-capture API，因此必須做 capability negotiation，Pi 可由已受控的 kiosk/device agent helper提供；無 agent的 browser只提供 telemetry。

## Goals / Non-Goals

**Goals:**

- 遠端看得到每台 display的 current playback state與最後更新/換頁時間。
- telemetry payload bounded，不把整份 runtime config/圖片內容塞進 heartbeat。
- screenshot/thumbnail只按需且可關閉，無支援時清楚降級。
- management auth與device credential邊界保持明確。

**Non-Goals:**

- 不提供鍵鼠操作/遠端桌面。
- 不持續截圖或建立影像監控歷史。

## Decisions

### 擴充 heartbeat presence，而非建立第二條高頻通道

Display heartbeat加入 `playbackPresence`: route, pageId/templateKey, imageEntryId nullable, isPlaying/isIdle, remainingMs bounded, lastBoundaryAt, effectiveRotationRevision, appRelease。Server只保存 latest + receivedAt，並沿用既有 liveness expiry。

### Stall suspicion 以 boundary 進展與預期 duration判斷

Device Status可顯示 `possibly-stalled`：heartbeat持續新鮮，但 lastBoundaryAt超過目前/上次 page合理 duration + tolerance且不是 paused/idle。這只是診斷提示，不自動 reboot。

### Thumbnail 採 capability negotiation + fixed helper

Device heartbeat宣告 `thumbnailCapture: supported|unsupported|disabled`。Trusted management request若 supported，server透過固定 device agent/helper要求一張低解析 JPEG/WebP，例如最大 1280x720/512 KiB、10 秒 timeout；helper不接受任意 shell command/path。結果短期 memory/cache保存並帶 capturedAt/deviceId，不寫 uploads catalog。

若 browser-only裝置不支援 capture，API回 capability-unavailable而非 fake image。

### Privacy/security defaults

Capture預設 disabled；開啟需裝置/部署設定與 management auth。UI清楚標示「按需擷取目前公開展示畫面」。不允許從 management routes取 screenshot，也不 capture browser devtools/password overlays；kiosk只在正式 playback surface可服務 capture。

## Implementation Contract

- fresh heartbeat可顯示 current page/image與remaining time；heartbeat過期時 presence一併標 stale，不能像 live狀態。
- paused/idle不被 stall heuristic誤判。
- optional thumbnail unsupported/disabled均有明確狀態；management不能用一般 URL繞過 auth取圖。
- thumbnail有尺寸/timeout限制且不長期持久化。
- rollout/runtime revision同 presence一起顯示，方便判斷裝置是否仍播舊設定。

## Migration Plan

Heartbeat新增欄位採 optional/backward-compatible；server接受舊 client沒有 presence，Device Status顯示 telemetry unavailable。新 capture helper只在支援 Pi部署安裝，其他設備不受影響。

## Risks / Trade-offs

- [Risk] heartbeat payload變大 → presence只放 scalar/id，不放整份 playlist/config。
- [Risk] screenshot功能被誤用成監控 → default disabled、on-demand、trusted management、無歷史、固定播放面限制。
- [Risk] capture helper平台差異 → capability negotiation，核心 feature不依賴 screenshot。
