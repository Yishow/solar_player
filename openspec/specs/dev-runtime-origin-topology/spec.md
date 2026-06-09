# dev-runtime-origin-topology Specification

## Purpose

TBD - created by archiving change 'stabilize-dev-runtime-origin-proxy'. Update Purpose after archive.

## Requirements

### Requirement: Dev browser runtime uses same-origin routes for runtime traffic

The development browser runtime SHALL address API, Socket.IO, and uploaded-media traffic through the current web origin instead of deriving the backend origin from VITE_PORT or another frontend listen-port value.

#### Scenario: API request stays on the web origin in dev mode

- **WHEN** the web app runs in dev mode on http://localhost:4173 and requests /api/playback/settings
- **THEN** the browser request URL SHALL use http://localhost:4173/api/playback/settings
- **AND** the web client SHALL NOT construct http://localhost:3000/api/playback/settings for that dev request

#### Scenario: Uploaded media stays on the web origin in dev mode

- **WHEN** a display page renders a media source under /uploads/images/display-seed-images-main-stage.jpg in dev mode on http://localhost:4173
- **THEN** the browser image URL SHALL use http://localhost:4173/uploads/images/display-seed-images-main-stage.jpg
- **AND** the image SHALL load through the dev proxy instead of relying on a client-side backend-port rewrite

#### Scenario: Socket.IO connects through the web origin in dev mode

- **WHEN** the web app opens a Socket.IO connection in dev mode on http://localhost:4173
- **THEN** the socket connection SHALL target the current web origin and socket path
- **AND** the browser SHALL NOT require direct cross-port access to http://localhost:3000


<!-- @trace
source: stabilize-dev-runtime-origin-proxy
updated: 2026-06-09
code:
  - .env.example
  - apps/web/src/hooks/useImagesAutoplay.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - scripts/dev.test.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.ts
  - apps/web/src/services/runtimeOrigin.ts
  - scripts/dev-lib.mjs
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/services/api.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayRotationService.ts
tests:
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/services/api.test.ts
  - packages/shared/src/imagePlaylist.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.test.ts
-->

---
### Requirement: Vite dev server proxies runtime paths to the resolved backend port

The Vite development server SHALL proxy /api, /socket.io, and /uploads to the backend port resolved from root environment configuration, with websocket proxying enabled for Socket.IO.

#### Scenario: Custom web port proxies API traffic

- **WHEN** root .env resolves PORT=3000 and VITE_PORT=4173
- **THEN** the Vite dev server SHALL listen on port 4173
- **AND** requests to /api from that web origin SHALL be proxied to the backend on port 3000

#### Scenario: Custom web port proxies uploaded media traffic

- **WHEN** root .env resolves PORT=3000 and VITE_PORT=4173
- **THEN** requests to /uploads/images/display-seed-images-main-stage.jpg from the web origin SHALL be proxied to the backend on port 3000
- **AND** the request SHALL NOT fail because Vite is listening on port 4173

#### Scenario: Custom web port proxies websocket traffic

- **WHEN** root .env resolves PORT=3000 and VITE_PORT=4173
- **THEN** Socket.IO requests under /socket.io SHALL be proxied to the backend on port 3000 with websocket support enabled
- **AND** the browser SHALL NOT report a WebSocket origin failure caused by the custom web port


<!-- @trace
source: stabilize-dev-runtime-origin-proxy
updated: 2026-06-09
code:
  - .env.example
  - apps/web/src/hooks/useImagesAutoplay.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - scripts/dev.test.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.ts
  - apps/web/src/services/runtimeOrigin.ts
  - scripts/dev-lib.mjs
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/services/api.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayRotationService.ts
tests:
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/services/api.test.ts
  - packages/shared/src/imagePlaylist.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.test.ts
-->

---
### Requirement: Listen ports are separate from runtime routing

PORT and VITE_PORT SHALL define backend and web listen ports only. They SHALL NOT be used by client runtime modules as independent routing signals for API, Socket.IO, or uploaded-media destinations.

#### Scenario: Changing VITE_PORT does not require client routing changes

- **WHEN** VITE_PORT changes from 5173 to 4173 while PORT remains 3000
- **THEN** API, Socket.IO, and uploaded-media client helpers SHALL keep the same dev-mode routing behavior
- **AND** no helper SHALL need a per-port exception for 4173

#### Scenario: Conflicting listen ports fail before launch

- **WHEN** PORT and VITE_PORT resolve to the same numeric port
- **THEN** the dev startup command SHALL fail before launching backend or web child processes
- **AND** the error SHALL identify that the backend and web listen ports must differ

#### Scenario: Startup cleanup covers both resolved listen ports

- **WHEN** the dev startup command resolves backend and web listen ports
- **THEN** its conflict cleanup SHALL target both resolved ports before launch
- **AND** cleanup SHALL remain scoped to those resolved ports instead of unrelated local services


<!-- @trace
source: stabilize-dev-runtime-origin-proxy
updated: 2026-06-09
code:
  - .env.example
  - apps/web/src/hooks/useImagesAutoplay.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - scripts/dev.test.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.ts
  - apps/web/src/services/runtimeOrigin.ts
  - scripts/dev-lib.mjs
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/services/api.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayRotationService.ts
tests:
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/services/api.test.ts
  - packages/shared/src/imagePlaylist.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.test.ts
-->

---
### Requirement: Explicit API base URL is reserved for deployment override mode

VITE_API_BASE_URL SHALL represent an explicit production or preview API origin override. When that value is configured, API, Socket.IO, and uploaded-media helpers SHALL resolve against that configured API origin consistently.

#### Scenario: API base URL override controls runtime destinations

- **WHEN** VITE_API_BASE_URL is set to https://display-api.example.test
- **THEN** API requests SHALL resolve under https://display-api.example.test
- **AND** Socket.IO and uploaded-media URLs SHALL use the same configured API origin contract

#### Scenario: Dev mode without API base URL uses proxy topology

- **WHEN** VITE_API_BASE_URL is empty and the app runs in dev mode
- **THEN** runtime helpers SHALL use same-origin dev paths
- **AND** runtime helpers SHALL NOT infer an absolute backend origin from VITE_PORT


<!-- @trace
source: stabilize-dev-runtime-origin-proxy
updated: 2026-06-09
code:
  - .env.example
  - apps/web/src/hooks/useImagesAutoplay.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - scripts/dev.test.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.ts
  - apps/web/src/services/runtimeOrigin.ts
  - scripts/dev-lib.mjs
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/services/api.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayRotationService.ts
tests:
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/services/api.test.ts
  - packages/shared/src/imagePlaylist.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.test.ts
-->

---
### Requirement: Management boundaries remain protected under dev proxy topology

The server SHALL preserve management read-access boundaries and Socket.IO session classification when development runtime traffic is routed through the Vite proxy.

#### Scenario: Management-only read route still denies untrusted callers

- **WHEN** an untrusted non-loopback caller requests a management-only read route without a trusted origin or valid management access token
- **THEN** the server SHALL return a denied response
- **AND** the dev proxy topology SHALL NOT expose the management payload

#### Scenario: Socket session classification remains explicit

- **WHEN** a Socket.IO client connects through the dev proxy without management credentials
- **THEN** the server SHALL classify the session according to the existing playback-safe versus management-trusted rules
- **AND** the connection SHALL NOT receive management-only diagnostic events unless it satisfies the trusted management criteria

<!-- @trace
source: stabilize-dev-runtime-origin-proxy
updated: 2026-06-09
code:
  - .env.example
  - apps/web/src/hooks/useImagesAutoplay.ts
  - packages/shared/src/imagePlaylist.ts
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
  - apps/web/src/pages/Images/index.tsx
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - scripts/dev.test.mjs
  - apps/web/vite.config.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.ts
  - apps/web/src/services/runtimeOrigin.ts
  - scripts/dev-lib.mjs
  - apps/server/src/services/imagePlaylistService.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/server/src/routes/image-playlist.ts
  - apps/web/src/services/api.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/services/displayRotationService.ts
tests:
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - apps/server/src/routes/image-playlist.test.ts
  - apps/web/src/services/api.test.ts
  - packages/shared/src/imagePlaylist.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.test.ts
  - apps/web/src/hooks/useImagesAutoplay.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/web/src/pages/shared/runtimeMediaUrl.test.ts
-->