## Why

Device Status 能看主機資源、服務與 display liveness，但遠端管理者仍無法直接回答「那台螢幕現在到底播哪一頁／哪張圖、還剩幾秒、最後一次正常換頁是何時」。當現場回報黑畫面或卡住時，只知道 browser/heartbeat 還活著不夠。需要把目前播放進度納入 bounded heartbeat，並在裝置支援時提供受信任、按需的低解析度畫面證據。

## What Changes

- display heartbeat 增加 current route/page/template、image entry（若適用）、play/pause/idle、remaining duration、last rotation boundary、runtime revision/app release 等 bounded telemetry。
- server 持久/記憶體 liveness registry 保存最新 playback presence，Device Status 可逐裝置查看「目前正在播什麼」與資料新鮮度。
- 判斷卡頁：heartbeat仍新鮮但 current route/boundary 長時間不前進時，UI可顯示 stalled suspicion；真正異常由 data-health/alert change整合。
- 新增 optional on-demand thumbnail capability：預設關閉、僅 trusted management 可要求、裝置需宣告 capability；不支援時明確顯示 unavailable。
- thumbnail 為低解析、短生命週期證據，不持續錄製、不建立畫面歷史；request/response 有 size/time bounds 且不得包含管理頁 secrets。

## Non-Goals

- 不做遠端桌面控制、VNC 或持續錄影。
- 不把 thumbnail 當主要 liveness；heartbeat telemetry仍是核心。
- 不在不支援 capture bridge/agent 的裝置上偽造 screenshot。

## Capabilities

### New Capabilities

- `remote-playback-observability`: 遠端 current-playback heartbeat、staleness/stall context 與 optional trusted on-demand thumbnail evidence。

### Modified Capabilities

（無）

## Impact

- Affected specs: new `remote-playback-observability`
- Affected code: display heartbeat hook/shared types、Socket/server liveness registry、Device Status API/UI、optional device capture helper/agent 與 tests。
- Affected data: telemetry為 bounded latest-state；thumbnail只短暫傳輸/快取，不建立長期圖片歷史。
