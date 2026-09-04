## Why

The Go Solar Collector currently prefers a `solar_config.json` found in the process working directory in both command startup and WebUI path resolution. This contradicts the deployed Python-compatible contract and can load or overwrite the wrong configuration when the binary is launched by a service, shortcut, or operator from another directory. Review also found that the repository launch wrappers use `go run`, whose temporary executable cannot share the copied working-directory config under the corrected contract.

## What Changes

- Make the application default config path unconditionally resolve to `solar_config.json` beside the executable.
- Remove working-directory candidate probing from command and WebUI startup while preserving explicit config-path injection used by tests and callers.
- Make the documented shell and PowerShell launch wrappers build and execute a repository-local ignored binary beside `solar_config.json` instead of launching a temporary `go run` executable.
- Add regression tests where both working-directory and executable/default-path candidates exist, proving every startup/read/write path uses the same canonical config.
- Cover command/tray persistence, default WebUI GET/PUT, and the non-callback scrape path while keeping test fixtures isolated from arbitrary executable-adjacent files.
- Preserve the existing process-working-directory semantics of relative `sqlite_path` values.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ez-solar-go-scraper`: Clarify executable-relative config precedence across command, tray, and WebUI flows when a conflicting working-directory config exists.

## Impact

- Modified: `solar_mqtt_go/commands.go`, `solar_mqtt_go/internal/webui/webui.go`, `solar_mqtt_go/start.sh`, `solar_mqtt_go/start.ps1`, `.gitignore`, and focused Go tests including the existing wrapper contract test.
- Unchanged: config JSON format/coercion/migration, explicit path injection, relative `sqlite_path`, MQTT/security contracts, Python source, and deployment topology.
