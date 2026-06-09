## Context

目前開發環境同時存在兩個 listen port：backend PORT 預設為 3000，Vite web VITE_PORT 可改成 4173 或其他值。這本身合理，但目前 browser runtime 會在多個地方各自判斷 API、Socket.IO、uploaded media 應該打 web origin 還是 backend origin。當 VITE_PORT 改動時，錯誤會分散成 API 404、uploads 404、CORS policy、WebSocket failed，且每個症狀都容易被當成單點 bug 修補。

中期版的目標是收斂 dev topology，而不是再增加 per-surface port guessing。dev browser runtime 應該永遠打 same-origin path，讓 Vite dev proxy 承擔 web port 到 backend port 的轉發。production 或明確 preview deployment 才需要外部 API base URL。

## Goals / Non-Goals

**Goals:**

- dev mode 下 browser runtime 對 /api、/socket.io、/uploads 使用 same-origin path。
- Vite dev proxy 使用 root .env 解析出的 backend PORT 作為 proxy target。
- PORT 與 VITE_PORT 保持 listen-port 職責，不再被 client runtime 當成 backend routing 訊號。
- VITE_API_BASE_URL 只作為 production/preview 的明確 API origin override。
- 保留既有 management access boundary 與 Socket.IO session classification，不以放寬安全邊界換取 dev convenience。
- 提供 focused tests，覆蓋 custom VITE_PORT、proxy topology、API/socket/uploads URL resolution 與 server boundary。

**Non-Goals:**

- 不移除 root .env 的 PORT 或 VITE_PORT。
- 不重設 production deploy、systemd、Cloudflare 或外部 reverse proxy 假設。
- 不改 MQTT runtime lease、playback rotation、display page rendering 或播放頁 UI。
- 不合併 /settings/playback 與 /slideshow-preview。
- 不新增新的 browser-visible API contract；只調整 dev routing topology。

## Decisions

### Use same-origin runtime paths in dev instead of client-side backend-port guessing

決策：web runtime 在 dev server 環境中解析 API、Socket.IO 與 uploaded media 時，回傳 /api、/socket.io、/uploads 類型的 same-origin path 或 same-origin origin，而不是依 VITE_PORT 推導 backend port。

理由：browser 只面對 Vite origin，routing 由 dev server proxy 統一處理，能避免 API、socket、uploads 三條路徑各自維護 port 判斷。這也讓 4173、5173 或其他 VITE_PORT 都走同一條規則。

替代方案：保留目前 client-side 3000 推導並補更多例外。拒絕原因是每新增一種 runtime surface 就會複製一次判斷，下一次 port drift 仍會變成 404/CORS/socket 分層故障。

### Put dev proxy routing in Vite and dev startup topology

決策：Vite dev server 負責 proxy /api、/socket.io、/uploads 到 resolved backend PORT；dev startup script 負責解析 PORT/VITE_PORT、清理衝突 port、把 web listen port 傳給 Vite。

理由：proxy target 是 dev infrastructure concern，不應散落在 React runtime。dev script 已是 port lifecycle 的入口，Vite config 已是 proxy owner，兩者邊界自然。

替代方案：讓 backend 同時 serve web assets 或改用單一 port。拒絕原因是這會改變現有 React/Vite/Fastify 開發架構，scope 過大且會碰 production 假設。

### Keep explicit API base URL for production and preview only

決策：VITE_API_BASE_URL 代表明確外部 API origin。若設定此值，production/preview runtime 可用它建立 absolute API/socket/uploads URL；dev 模式不應靠它修補 VITE_PORT 與 backend PORT 的關係。

理由：VITE_API_BASE_URL 的語意應是 deployment override，不是 dev topology repair knob。混用會讓同一份 .env 同時控制 listen port 與 browser routing，正是目前反覆出問題的原因。

替代方案：在 .env 中新增更多 port 變數，例如 VITE_BACKEND_PORT。拒絕原因是它只是把猜測來源換成另一個 env key，仍要求每個 client module 正確讀取與同步。

### Preserve management access and socket session boundaries

決策：server 端 CORS 與 Socket.IO request gating 只需支援 dev proxy 產生的合法請求，不應為了 same-host cross-port browser traffic 放寬 management-only read routes 或 management-trusted session 判斷。

理由：中期方案的目的正是讓 dev browser 不再直接跨 port 呼叫 backend；因此安全邊界可以更單純，而不是持續擴張 same-host cross-port 例外。

替代方案：繼續允許所有同 host 不同 port 的 direct browser calls。拒絕原因是這讓 management trusted-origin 行為與 dev convenience 綁在一起，難以判斷一個 origin 是 operator management 還是普通 playback/browser session。

## Implementation Contract

Behavior:

- 在 dev server 下，browser 發出的 API request URL SHALL remain on the web origin path, for example /api/playback/settings from http://localhost:4173.
- 在 dev server 下，Socket.IO SHALL connect through the web origin socket path and be proxied by Vite; the browser SHALL NOT need to know backend port 3000.
- 在 dev server 下，uploaded media references under /uploads SHALL load through the web origin path and be proxied by Vite; seed or managed image URLs SHALL NOT fail because the web port is not the backend port.
- 在 production or explicit preview override 下，VITE_API_BASE_URL SHALL produce absolute API/socket/uploads URLs against that configured API origin.
- Changing VITE_PORT SHALL only change where Vite listens. It SHALL NOT require changes in API URL code, socket URL code, uploaded media URL code, or backend CORS allowlists.

Interface / data shape:

- The web client SHALL use one shared runtime-origin helper for HTTP API URLs, Socket.IO origin/path decisions, and uploaded-media URL normalization.
- The helper SHALL distinguish dev same-origin routing from explicit VITE_API_BASE_URL routing using runtime/build environment signals, not by hard-coding one frontend port.
- Vite proxy configuration SHALL include /api, /socket.io with websocket support, and /uploads, all targeting the resolved backend PORT.
- scripts/dev.mjs and scripts/dev-lib.mjs SHALL continue to parse PORT and VITE_PORT from root .env and SHALL keep startup conflict cleanup scoped to the resolved web and backend ports.
- Server CORS and socket request gating SHALL continue to deny untrusted management-only callers according to existing management access rules.

Failure modes:

- If PORT and VITE_PORT resolve to the same port, startup SHALL fail with a clear configuration error before launching child processes.
- If Vite proxy cannot reach backend PORT, browser requests SHALL fail as backend-unavailable dev infrastructure errors, not as CORS or wrong-origin symptoms.
- If VITE_API_BASE_URL is malformed, client startup or the affected request helper SHALL surface a deterministic configuration error instead of silently falling back to guessed ports.

Acceptance criteria:

- Focused dev-port tests cover custom VITE_PORT values and verify portsToFree includes both web and backend ports.
- Web service tests prove dev API URLs, socket origin/path, and uploaded media URLs remain same-origin in dev mode and use VITE_API_BASE_URL only for explicit override mode.
- Vite config tests or source-level tests prove /api, /socket.io, and /uploads are all proxied to the resolved backend PORT.
- Server tests prove management-only read access and socket classification remain protected under the new topology.
- Manual or automated smoke with VITE_PORT=4173 verifies /settings/playback, /settings/images, and /images make API/socket/uploads requests without 404, CORS policy errors, or WebSocket origin failures.
- Package builds for @solar-display/server and @solar-display/web succeed after the topology change.

Scope boundaries:

- In scope: dev startup topology, Vite proxy config, web runtime origin helpers, server request-boundary compatibility, focused tests, .env.example wording.
- Out of scope: production service files, MQTT lease ownership, playback visual changes, page-specific asset management features, and route consolidation between settings and preview pages.

## Risks / Trade-offs

- [Risk] Existing tests may assert direct browser traffic from 4173 to 3000. → Mitigation: update those tests to assert the new contract: dev browser stays same-origin and Vite proxy owns backend routing.
- [Risk] A deployment that currently relies on VITE_API_BASE_URL during local dev may see different behavior. → Mitigation: document that VITE_API_BASE_URL is an explicit production/preview override and keep override behavior tested.
- [Risk] Socket.IO proxy handling can regress if only HTTP proxy is verified. → Mitigation: include socket-specific tests and a smoke check that observes no WebSocket origin failure.
- [Risk] Tightening direct cross-port assumptions can accidentally affect management access tests. → Mitigation: keep management-read and socket-session tests in the verification set and avoid broad allowlist expansion.
- [Risk] Vite config and dev script can drift if they parse .env differently. → Mitigation: route both through the same documented port-resolution behavior and lock it with scripts/dev.test.mjs.
