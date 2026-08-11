## 1. Playback presence telemetry

- [ ] 1.1 擴充 shared heartbeat/liveness types加入 bounded playback presence。
- [ ] 1.2 從 playback controller/images autoplay產生 current route/page/image/remaining/boundary/revision telemetry。
- [ ] 1.3 server liveness registry保存 latest presence並沿用 staleness semantics。
- [ ] 1.4 Device Status顯示 current playback、last boundary、revision與 stale/stall context。

## 2. Optional thumbnail evidence

- [ ] 2.1 定義 device thumbnail capture capability與 management API。
- [ ] 2.2 在支援 Pi/agent環境實作 fixed bounded capture helper；預設 disabled。
- [ ] 2.3 UI加入按需擷取、capturedAt、unsupported/disabled/error狀態。
- [ ] 2.4 加 auth、size、timeout、no-persistence與unsupported tests。

## 3. Verification

- [ ] 3.1 補 fresh/stale presence、paused/idle stall suppression、route/image transition tests。
- [ ] 3.2 跑 Device Status browser journey與 device-agent targeted tests。
- [ ] 3.3 跑 root `pnpm test`、`pnpm build`、`pnpm verify`。
