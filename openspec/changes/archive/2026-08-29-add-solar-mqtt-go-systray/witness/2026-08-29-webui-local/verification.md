# Task 4.3 local WebUI witness — 2026-08-29

## Scope and safety boundary

This is a local, no-broker WebUI witness for the `add-solar-mqtt-go-systray`
change. A short-lived helper started the embedded server on
`http://127.0.0.1:18968/` with an empty temporary config at
`/private/tmp/solar-webui-witness-config.json`; no broker credential was
provided and no production host was contacted. The helper and temporary config
were removed after capture.

The rendered evidence is:

- `dashboard-full.png` — reviewed screenshot of the rendered dashboard.
- `browser-batch-output.txt` — agent-browser rendered accessibility snapshot and
  DOM text read from the same page.
- `network-requests.txt` — local asset/API requests; all dashboard assets and
  `/api/local-config` returned 200. The only 404 is the optional favicon.

The fresh archive capture used the named session `awit` and navigated only to
`127.0.0.1`. The installed agent-browser version rejects combining its
`--allowed-domains` containment option with an existing CDP connection, so the
final capture used a fresh isolated Chrome instance through CDP with no
external navigation; this tooling limitation is not treated as a full
allowlist witness.

## Rendered subscription evidence

The accessibility snapshot and screenshot show the `MQTT Subscriptions`
region, with both cards visible without a hidden/test-only anchor:

- KN: exactly 11 visible topics, all using active `solar/KN/` prefix:
  `summary`, `total_power_kw`, `today_mwh`, `month_mwh`, `total_mwh`, `zone/#`,
  `status`, `heartbeat`, `alert`, `state/config`, `state/control-result`.
- CL: exactly 11 visible topics, all using active `solar/CL/` prefix, with the
  same suffix set.
- Initial state for both cards: `not-subscribed`.
- No broker username/password value was supplied or rendered by this witness.

## Automated evidence

Commands run from `solar_mqtt_go`:

| Check | Result |
|---|---|
| `gofmt -l solar_mqtt_go` | PASS; `internal/webui/webui_test.go` formatted |
| `go test -v ./internal/tray ./internal/webui -count=1` | PASS; tray pause/resume, quit ordering, solar.log tests, embedded asset graph, safe DOM, control contract, visible topics, lifecycle/TLS/generation tests all passed |
| `go vet ./...` | PASS |
| `go test ./... -count=1` | PASS |
| `go test -race ./... -count=1` | PASS |
| `node --check solar_mqtt_go/internal/webui/web/js/*.js` | PASS |
| `spectra validate modernize-solar-mqtt-webui --strict` | PASS |
| `spectra validate add-solar-mqtt-go-systray --strict` | PASS |
| `spectra analyze modernize-solar-mqtt-webui --json` | Coverage and Consistency `Clean`; remaining Ambiguity entries are suggestions |
| `git diff --check` | PASS |
| `CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build ... -H windowsgui` | PASS; `file` reports PE32+ GUI; `objdump` reports `Subsystem 00000002 (Windows GUI)` |
| console cross-build | PASS; PE32+ console; `Subsystem 00000003 (Windows CUI)` |

The focused remediation removed only comments and blank lines from
`internal/webui/web/index.html`; its line count is now 393 and the `<400`
asset-size gate passes. The browser witness was rerun after this change and
the rendered KN/CL DOM remains unchanged.

## Task 4.3 acceptance status

Task `4.3` is **checked**. On 2026-08-29, the user explicitly confirmed
Windows manual acceptance for seven items: double-click launch without a
console and entry into the system tray, Open Web, pause/resume, Open Folder,
Quit, single-instance behavior, and `solar.log` beside the executable.

The fresh local rendered witness above separately covers KN and CL with 11
topics each, prefix/subscription state, and the local asset graph. It does not
claim to be Windows field evidence.
