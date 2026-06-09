## Why

目前 root .env 的 PORT 與 VITE_PORT 同時影響 dev server 啟動、browser runtime API/socket/uploads origin 判斷，以及 backend CORS/socket gate。每次調整前端 port 都可能連鎖產生 uploads 404、API 404、CORS policy、WebSocket failed 等不同症狀，造成同一類 dev topology 問題反覆回歸。

此 change 需要把 dev 模式的 runtime traffic 收斂成單一 topology：browser 只打 web same-origin path，Vite dev proxy 負責轉到 backend；只有 production 或明確 preview 部署才使用外部 API base URL。

## What Changes

- 建立 dev runtime origin topology contract：dev browser runtime SHALL use same-origin paths for /api, /socket.io, and /uploads instead of guessing backend ports in each client module.
- Vite dev server SHALL proxy /api, /socket.io, and /uploads to the resolved backend port from root .env PORT.
- PORT and VITE_PORT SHALL remain startup/listen-port settings, not browser runtime routing signals.
- VITE_API_BASE_URL SHALL be treated as an explicit production/preview API origin override, not a fallback way to repair dev-mode port drift.
- Server CORS and Socket.IO request gating SHALL keep management/read-access boundaries intact while allowing the dev proxy path without requiring same-host cross-port browser traffic.
- Existing custom VITE_PORT usage remains supported for choosing the web listen port, but runtime requests should not need to know that port-to-backend mapping.

## Non-Goals

- This change does not remove PORT or VITE_PORT from root .env.
- This change does not redesign management authentication, access tokens, or trusted-origin policy beyond preserving compatibility with the dev proxy topology.
- This change does not alter playback rotation, MQTT runtime lease behavior, display page rendering, or production deploy scripts.
- This change does not merge /settings/playback with /slideshow-preview.

## Capabilities

### New Capabilities

- dev-runtime-origin-topology: Defines the development runtime origin topology for API, socket, and uploaded-media traffic so custom web ports do not require per-surface origin guessing.

### Modified Capabilities

(none)

## Impact

- Affected specs: dev-runtime-origin-topology
- Affected code:
  - Modified: scripts/dev-lib.mjs, scripts/dev.mjs, apps/web/vite.config.ts, apps/web/src/services/api.ts, apps/web/src/services/socket.ts, apps/web/src/pages/shared/runtimeMediaUrl.ts, apps/server/src/app.ts, apps/server/src/plugins/managementAuth.ts, apps/server/src/services/socketService.ts, .env.example
  - New: apps/web/src/services/runtimeOrigin.ts, apps/web/src/services/runtimeOrigin.test.ts
  - Removed: none
