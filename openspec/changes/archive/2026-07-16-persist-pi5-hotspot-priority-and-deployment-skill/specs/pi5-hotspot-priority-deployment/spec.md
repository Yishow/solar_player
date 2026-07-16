## ADDED Requirements

### Requirement: Persist an operation-selected hotspot as the preferred Wi-Fi profile

The deployment system SHALL configure an existing NetworkManager Wi-Fi connection with autoconnect enabled and an operator-provided integer autoconnect priority without storing Wi-Fi secrets in the repository.

#### Scenario: Existing hotspot profile is configured

- **WHEN** the hotspot policy helper runs with connection id `Yishow`, scan SSID `Yishow`, and priority `100`
- **THEN** the NetworkManager connection `Yishow` has `connection.autoconnect=yes`
- **AND** it has `connection.autoconnect-priority=100`
- **AND** its configured SSID remains `Yishow`
- **AND** the helper does not activate or disconnect any Wi-Fi connection

##### Example: Preferred hotspot inputs

| Connection ID | Scan SSID | Priority | Expected active switch during deploy |
| --- | --- | ---: | --- |
| Yishow | Yishow | 100 | none |

#### Scenario: Hotspot is visible during initial network selection

- **WHEN** NetworkManager performs its initial autoconnect selection and the configured hotspot and lower-priority remembered profiles are visible
- **THEN** NetworkManager selects the configured hotspot before the lower-priority profiles

#### Scenario: Hotspot profile is missing

- **WHEN** the helper receives a connection id that NetworkManager does not know
- **THEN** it exits nonzero before installing or enabling the trigger
- **AND** it reports the missing connection id

#### Scenario: Priority is invalid

- **WHEN** the helper receives a non-integer priority
- **THEN** it exits nonzero without modifying the NetworkManager profile or systemd state

### Requirement: Install the delayed hotspot trigger as persistent system state

The deployment system SHALL install the hotspot trigger executable, service, timer, and environment file and SHALL enable the timer for subsequent boots without starting it during the active remote deployment.

#### Scenario: Hotspot trigger is installed during update

- **WHEN** target bootstrap receives a non-empty hotspot connection id
- **THEN** it invokes the hotspot policy helper before final kiosk verification
- **AND** the helper installs the trigger executable under `/usr/local/sbin`
- **AND** installs the service and timer under `/etc/systemd/system`
- **AND** writes `HOTSPOT_CONNECTION_ID`, `HOTSPOT_SCAN_SSID`, and `HOTSPOT_PRIORITY` to `/etc/solar-display/tailscale-hotspot-trigger.env`
- **AND** reloads systemd and enables the timer
- **AND** leaves the timer inactive until the next boot

#### Scenario: Hotspot becomes visible after boot

- **WHEN** NetworkManager has already activated a fallback profile and the enabled timer later observes the configured hotspot
- **THEN** the trigger brings up the configured hotspot connection
- **AND** it does not proactively bring down the current Wi-Fi connection

### Requirement: Verify hotspot policy from target state

The kiosk verification command SHALL validate every configured hotspot policy value from the installed environment file.

#### Scenario: Configured hotspot policy is healthy

- **WHEN** kiosk verification finds `/etc/solar-display/tailscale-hotspot-trigger.env`
- **THEN** it verifies the connection id exists and maps to the configured scan SSID
- **AND** verifies autoconnect is enabled and priority equals the configured integer
- **AND** verifies the executable, service, and timer are installed
- **AND** verifies the timer is enabled

#### Scenario: Hotspot policy is not configured

- **WHEN** the hotspot environment file does not exist
- **THEN** kiosk verification reports the hotspot policy as not configured
- **AND** it does not fail a generic target that did not request hotspot management

#### Scenario: Configured hotspot policy drifted

- **WHEN** any profile value, installed file, or timer enablement differs from the environment file contract
- **THEN** kiosk verification reports the hotspot policy failure
- **AND** exits nonzero
