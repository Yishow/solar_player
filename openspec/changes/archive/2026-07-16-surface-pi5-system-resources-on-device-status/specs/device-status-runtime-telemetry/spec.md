## ADDED Requirements

### Requirement: Surface Pi 5 host resources with on-demand low-overhead telemetry

The system SHALL present CPU load, memory usage, disk usage, system temperature, and fan status on Device Status from telemetry gathered on demand by the existing device status request, and it SHALL NOT require a background collector, telemetry persistence, MQTT publication, or a new periodic browser poll.

#### Scenario: Trusted operator opens Device Status on a Pi 5

- **WHEN** a trusted management caller requests Device Status on a Pi 5 with readable procfs and sysfs telemetry
- **THEN** the response SHALL include the existing CPU, memory, and disk telemetry together with measured system temperature and fan telemetry
- **AND** the page SHALL render the system temperature and fan status from that response

#### Scenario: Fan RPM is exposed by the host

- **WHEN** the Pi 5 host exposes a readable numeric fan RPM value
- **THEN** the device status response SHALL report that measured RPM
- **AND** the page SHALL identify the fan as running when the RPM is greater than zero and stopped when it is zero

#### Scenario: Only a cooling state is exposed by the host

- **WHEN** the Pi 5 host does not expose fan RPM but exposes a readable pwm-fan cooling state
- **THEN** the device status response SHALL report the measured cooling state without inventing an RPM value
- **AND** the page SHALL distinguish a positive running state from a zero stopped state

#### Scenario: Temperature or fan telemetry is unavailable

- **WHEN** a temperature or fan source is missing, unreadable, or unparsable
- **THEN** the affected telemetry field SHALL be explicitly unavailable with a null measured value
- **AND** the status request SHALL continue returning the other available host telemetry
- **AND** the page SHALL NOT present zero or a fixed placeholder as a measured hardware value

#### Scenario: No background monitoring work is introduced

- **WHEN** no trusted caller requests Device Status
- **THEN** the application SHALL perform no temperature or fan sampling for this capability
- **AND** it SHALL perform no telemetry database writes or MQTT publications for this capability
