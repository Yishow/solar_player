## Context

此前置 change 為 identity-aware liveness 與 device-scoped playback。現有 schedule 與 Header clock 依 Browser Date，現場無外部 NTP 時會造成 Client 分歧；Server Time Signal 只提供應用程式權威，不宣稱外部標準授時。

## Goals / Non-Goals

**Goals:**

- 建立 Socket.IO Server Time Signal 與 monotonic Client App Time。
- 定義 waiting、synced、stale、time-untrusted 狀態。
- 讓 schedule/freshness age 只在可信 App Time 下推進，並回報 heartbeat。

**Non-Goals:**

- 不修改 Raspberry Pi OS Clock，不安裝 NTP、chrony 或 Root Agent。
- 不新增 MQTT time topic、Browser MQTT credential 或精密時鐘校正。
- 不在此 change 建立 Freshness Policy 或 offline cache。

## Decisions

### Broadcast a process-scoped ordered time signal

Server 啟動產生 random UUID instanceId，sequence 從 1 遞增。連線後立即 emit，固定每 30 秒廣播 epochMs、timeZone=Asia/Taipei、broadcastIntervalMs=30000。Process restart 產生新 instanceId。

### Derive App Time from performance monotonic elapsed

Client 接受 signal 時記錄 epochMs 與 performance.now()；App Time 為 epochMs 加 monotonic elapsed。同 instance 僅接受較大 sequence；新 instance 無條件建立新基準。Date.now 只可用於尚未同步的非權威診斷，不驅動 schedule。

### Freeze absolute logic while time is untrusted

0–89.999 秒無新 signal 仍 synced，90 秒起 stale 並繼續 monotonic 推算，最後有效 signal 後 30 分鐘進入 time-untrusted。waiting 與 time-untrusted 凍結 schedule transition、freshness escalation 與 age，relative page duration 繼續。

### Apply recovered absolute results at a safe boundary

重新同步立即更新內部 time base，但若新時間改變 schedule/rotation，只在目前頁結束或頁面已無效的下一 transition tick套用，避免腰斬頁面。

## Implementation Contract

**Behavior**

- 每個 Client 連線即收到 signal，之後 30 秒一次。
- duplicated/out-of-order sequence 不使 App Time 倒退。
- Server restart、人工前調或後調 Clock 由新 instance 接受。
- heartbeat 回報四態；Header 使用 App Time 與 Asia/Taipei。
- waiting/time-untrusted 的 Autoplay/Loop 仍運作。

**Interface / data shape**

- server:time payload：instanceId、sequence、epochMs、timeZone、broadcastIntervalMs。
- app time snapshot：state、nowEpochMs|null、lastSignalMonotonicMs|null。
- Time State reducer 接受注入 monotonic clock，便於 deterministic tests。

**Failure modes**

- invalid payload 被忽略並保留上一有效基準。
- Socket 中斷不立即 time-untrusted；依 90 秒與 30 分鐘門檻演進。
- 未取得任何 signal 時不使用 OS Clock 執行 schedule。

**Acceptance criteria**

- Fake Socket、reducer、heartbeat、schedule與 safe-boundary tests 覆蓋 sequence、instance、threshold 與 recovery。
- server/web/shared focused tests、pnpm test/build/verify 通過。
- 五頁 fresh FHD witness 證明 clock與狀態呈現未破壞基準；intentional difference 由使用者判定。
- runbook 明示 Server Clock 維運責任與不修改 OS Clock。

**Scope boundaries**

- In scope：Socket signal、Client state、schedule integration、heartbeat、Header、文件。
- Out of scope：外部授時、Freshness threshold UI、Service Worker。

## Risks / Trade-offs

- [Server Clock 錯誤會一致地傳播] → runbook 明列 operator responsibility，產品不宣稱外部標準時間。
- [sleep/wake 造成長 monotonic jump] → 狀態依 last signal age 進入 stale/time-untrusted，恢復後等安全邊界。
