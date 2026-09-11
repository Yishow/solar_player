## ADDED Requirements

### Requirement: Solar collector data plane requires explicit persisted factory configuration

The Go Solar collector SHALL fail closed before Solar HTTP collection or production MQTT data-plane startup unless the configured `solar_config.json` exists, parses as JSON, and explicitly supplies at least one factory with non-empty `factory_id`, `base_url`, `login_user`, and `login_pass`. Readiness SHALL be evaluated from persisted fields rather than values after compatibility defaults are merged. Factory ids SHALL be unique and each base URL SHALL be a complete HTTP or HTTPS URL with a host. Validation failures SHALL NOT disclose login password values.

#### Scenario: Missing config cannot start collection

- **WHEN** `run`, `once`, legacy `--once`, `test-login`, or `dump-api` is invoked without a persisted config file
- **THEN** the command exits non-zero before Solar collection or production MQTT data-plane work starts
- **AND** built-in compatibility defaults are not treated as operator-supplied factory configuration

#### Scenario: Incomplete factory is not repaired by defaults

- **GIVEN** a persisted factory omits `login_pass`, `base_url`, `login_user`, or `factory_id`
- **WHEN** a data-plane command is requested
- **THEN** readiness fails even if the in-memory Config loader has a compatibility default for that field

#### Scenario: Tray remains a local recovery surface

- **WHEN** tray mode starts with missing or invalid Solar factory configuration
- **THEN** the local tray/WebUI remains available
- **AND** production MQTT/data-plane startup is blocked for that tray session
- **AND** the operator is told to save a complete configuration and restart the tray before collection starts

#### Scenario: Non-collector utilities remain usable

- **WHEN** the operator uses `test-mqtt`, `history`, or `alerts`
- **THEN** Solar factory readiness does not block that command solely because factory login configuration is absent

#### Scenario: Existing explicit configurations remain compatible

- **WHEN** an existing multi-factory config or legacy top-level single-factory config explicitly contains all required factory fields
- **THEN** readiness accepts it without changing its persisted format
