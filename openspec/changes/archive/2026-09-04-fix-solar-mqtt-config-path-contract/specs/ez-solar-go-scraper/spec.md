## MODIFIED Requirements

### Requirement: Configuration file compatibility

The Go implementation SHALL read and write `solar_config.json` beside the built executable, independent of the process working directory, as the deployed equivalent of Python `CONFIG_PATH`. The executable-relative path SHALL be authoritative for command, tray, and WebUI defaults even when a different `solar_config.json` exists in the process working directory, and missing or inaccessible executable-relative config SHALL NOT trigger fallback to working-directory candidates. Repository `start.sh` and `start.ps1` launchers SHALL build and execute an ignored local platform binary beside the prepared `solar_config.json` and SHALL NOT use a temporary `go run` executable. An explicitly supplied non-empty config path used by an embedded caller or test SHALL remain authoritative. The implementation SHALL preserve the exact Python format, global keys, defaults, factory keys (`factory_id`, `base_url`, `login_user`, `login_pass`), per-factory defaults, legacy migration, unknown global and factory keys, and temp-file-plus-replace save behavior. Boolean coercion SHALL match Python exactly: after lower-casing, only string values `"1"`, `"true"`, `"yes"`, and `"on"` become true; every other string becomes false without a warning; non-string values use Python-bool-equivalent truthiness. Numeric coercion SHALL accept numeric strings and SHALL keep the pre-load value with a warning when int/float conversion fails.

#### Scenario: Existing Python config loads unchanged

- **WHEN** the Go service starts with a `solar_config.json` written by the Python version
- **THEN** all global and factory values match what the Python version would load
- **AND** unknown keys present in the file are retained and written back on save
- **AND** launching the built binary from a different working directory still loads the config beside the executable

##### Example: boolean coercion matches Python

| JSON value | Effective boolean | Warning |
| --- | --- | --- |
| `"true"` | `true` | no |
| `"1"` | `true` | no |
| `"off"` | `false` | no |
| `"banana"` | `false` | no |
| `0` | `false` | no |
| `2` | `true` | no |

#### Scenario: Working directory contains a conflicting config

- **WHEN** command, tray, or WebUI startup runs from a directory containing a different `solar_config.json`
- **THEN** the application reads and writes only the executable-relative config
- **AND** the working-directory config remains unchanged

#### Scenario: Repository launch wrapper starts the executable beside its config

- **WHEN** an operator starts the collector through `start.sh` or `start.ps1`
- **THEN** the wrapper builds and launches the ignored `.solar_mqtt_go_run` platform binary from the `solar_mqtt_go` directory
- **AND** the launched binary reads and writes the adjacent `solar_config.json` without using `go run`
- **AND** relative `sqlite_path` values continue to resolve from the `solar_mqtt_go` process working directory

#### Scenario: Caller supplies an explicit config path

- **WHEN** an embedded caller or isolated test starts the WebUI with a non-empty config path
- **THEN** all local-config read and write operations use that exact path
- **AND** no working-directory candidate replaces it when the file is absent or later created

##### Example: absent explicit target remains authoritative

- **GIVEN** `/tmp/cwd/solar_config.json` contains `mqtt_host=cwd-decoy` and `/tmp/explicit/solar_config.json` does not exist
- **WHEN** WebUI starts with `Options.ConfigPath=/tmp/explicit/solar_config.json`, reads local config, and writes `mqtt_host=explicit-update`
- **THEN** `/tmp/explicit/solar_config.json` contains `mqtt_host=explicit-update`
- **AND** `/tmp/cwd/solar_config.json` remains byte-for-byte unchanged

#### Scenario: Legacy single-factory config migrates

- **WHEN** the config file lacks a `factories` array but contains factory-level keys
- **THEN** the loaded in-memory config moves the top-level factory keys into a single-element `factories` array and prints a migration notice
- **AND** load alone does not rewrite the source file; the migrated shape is written only by a later explicit save

#### Scenario: set command updates and persists

- **WHEN** a `/set` payload changes any global or factory field
- **THEN** the in-memory config is updated, the file is saved atomically, and the effective config is republished to the config topic
