## MODIFIED Requirements

### Requirement: Persist the verified Pi 5 four-stage fan profile

The deployment system SHALL manage a Raspberry Pi 5 boot configuration block with four active cooling stages at 0, 60000, 67500, and 75000 millicelsius; each stage SHALL use 5000 millicelsius hysteresis; and the corresponding PWM values SHALL be 75, 125, 175, and 250. The 0 millicelsius first trip SHALL keep the existing lowest cooling stage active during normal positive-temperature operation.

#### Scenario: Installer configures a Raspberry Pi 5

- **WHEN** the kiosk installer runs as root on a Raspberry Pi 5
- **THEN** it writes the complete four-stage profile to `/boot/firmware/config.txt` before the first `dtoverlay=` directive
- **AND** it preserves unrelated boot configuration
- **AND** it reports whether a reboot is required for the profile to become the boot-time source of truth

##### Example: Managed profile values

| Stage | Temperature mC | Hysteresis mC | PWM |
| ----- | -------------- | ------------- | --- |
| 0 | 0 | 5000 | 75 |
| 1 | 60000 | 5000 | 125 |
| 2 | 67500 | 5000 | 175 |
| 3 | 75000 | 5000 | 250 |

#### Scenario: Installer reruns after the profile already exists

- **WHEN** the fan configuration helper runs more than once against the same boot configuration
- **THEN** exactly one Solar Player managed fan block remains
- **AND** the resulting managed block contains the agreed four-stage values
- **AND** unrelated lines remain unchanged

#### Scenario: Installer runs on a non-Pi-5 target

- **WHEN** the fan configuration helper detects a target model other than Raspberry Pi 5
- **THEN** it reports that Pi 5 fan configuration is not applicable
- **AND** it exits successfully without modifying boot configuration

#### Scenario: Pi 5 boot configuration cannot be updated

- **WHEN** the helper detects Raspberry Pi 5 but the selected boot configuration is missing or cannot be written
- **THEN** it exits nonzero with the failing path in the error message
- **AND** the kiosk installer stops instead of reporting a successful thermal deployment

### Requirement: Verify the boot and runtime thermal contract

The kiosk verification command SHALL verify the managed boot profile, active Linux thermal contract, minimum cooling state, and physical fan motion on Raspberry Pi 5.

#### Scenario: Verification runs after reboot with the configured fan

- **WHEN** kiosk verification runs on Raspberry Pi 5 after reboot at a positive CPU temperature
- **THEN** the managed boot block contains all four temperatures, hysteresis values, and PWM values
- **AND** Linux exposes a `pwm-fan` cooling device with `max_state=4` and `cur_state` of at least 1
- **AND** the thermal zone mode is `enabled` with `step_wise` policy
- **AND** active trip points include 0, 60000, 67500, and 75000 millicelsius
- **AND** a fan RPM input reports a value greater than 0

##### Example: Lowest-stage boot witness

- **GIVEN** the CPU temperature is greater than 0 millicelsius
- **WHEN** the Pi has rebooted and SSH is reachable
- **THEN** within 20 seconds cooling state is at least 1 and fan RPM is greater than 0

#### Scenario: Verification finds a thermal mismatch

- **WHEN** any managed value, cooling-device state range, minimum state, fan RPM, thermal mode, policy, or active trip point differs from the agreed contract on Raspberry Pi 5
- **THEN** kiosk verification reports the mismatched condition
- **AND** exits nonzero

#### Scenario: Verification runs before reboot after changing boot configuration

- **WHEN** the managed boot profile is correct but the active thermal contract still differs
- **THEN** verification reports the runtime mismatch and fails
- **AND** the operator documentation directs the operator to reboot and rerun verification
