# Runtime proof

- Fresh server: `PORT=3340 DATA_DIR=/private/tmp/solar-player-fhd-proof`
- `GET http://127.0.0.1:3340/overview`: HTTP 404 because the backend dev process does not serve the Vite SPA; the Vite dev server returned HTTP 200 for the same route at `http://127.0.0.1:4174/overview`.
- Unpaired display runtime request through the fresh backend: `GET /api/display-story/overview` returned HTTP 401.
- Follow-up `GET /api/device/status` returned HTTP 200 with:
  - `unpairedDisplayAccess.counts.device_unpaired = 1`
  - `unpairedDisplayAccess.totalCount = 1`
  - `unpairedDisplayAccess.lastDeniedRoute = "/api/display-story/overview"`
  - `displayClients.clients = []`, `displayClients.summary.total = 0`

The agent-browser and Playwright browser daemons could not launch Chromium in this managed macOS environment (`DevToolsActivePort` / `SIGABRT`), so the same HTTP flow was verified through the Vite route and fresh backend directly.
