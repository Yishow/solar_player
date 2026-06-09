## ADDED Requirements

### Requirement: Web production build excludes dev-only react-grab bootstrap

The web production build SHALL exclude the real `react-grab` bootstrap module and SHALL resolve any `react-grab` devtools entrypoint to a noop module outside development mode.

#### Scenario: Development mode keeps the real bootstrap

- **WHEN** the web app resolves the `react-grab` bootstrap in development mode
- **THEN** the runtime uses the real devtools bootstrap module
- **AND** the bootstrap remains callable from the existing development entrypoint

#### Scenario: Production mode resolves to noop bootstrap

- **WHEN** the web app resolves the same bootstrap contract in production or test mode
- **THEN** the runtime uses a noop bootstrap module
- **AND** the real `react-grab` package is not required for that non-development bootstrap path

##### Example: production build output stays free of react-grab

- **GIVEN** the repository runs a production web build
- **WHEN** the emitted bundle is inspected after build completion
- **THEN** the output does not contain `react-grab`
- **AND** the output does not contain the real bootstrap module source that imports `react-grab`
