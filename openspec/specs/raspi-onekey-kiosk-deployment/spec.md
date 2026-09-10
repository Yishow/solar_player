# raspi-onekey-kiosk-deployment Specification

## Purpose

TBD - created by archiving change 'add-raspi-onekey-kiosk-deploy'. Update Purpose after archive.

## Requirements

### Requirement: Provide a local Raspberry Pi kiosk deployment entrypoint

The system SHALL provide a local deployment command that targets a Raspberry Pi over SSH, builds or selects a deploy bundle, uploads the bundle, invokes target-side bootstrap, protects existing runtime state before an update, applies an operation-selected hotspot policy when requested, restarts the service, and reports verification and recovery results.

The local entrypoint SHALL transport SSH, sudo, and RDP secret values through dedicated file descriptors, bounded stdin framing, or a short-lived target-side secure channel. Raw secret values and reversible shell-escaped, quoted, base64, or other encoded copies SHALL NOT be placed in local or remote child argv, SSH command strings, remote bootstrap option values, child environment, stdout, stderr, or ordinary logs. A direct secret flag supplied by the parent invocation remains outside this child-transport guarantee; the entrypoint SHALL state that limitation without reproducing the value.

This guarantee SHALL cover transport and diagnostics controlled by these deployment scripts, not caller exposure before invocation, hostile child diagnostics, privileged process-memory inspection, or the existing final persisted RDP configuration. Secret emitters SHALL use shell builtins or FD writers that do not put values in child argv. Inherited xtrace SHALL be disabled before source capture.

The secure input interface SHALL support numeric `--ssh-password-fd`, `--sudo-password-fd`, and `--rdp-password-fd` sources. Each source SHALL be read once to EOF as at most 4096 raw bytes, SHALL reject NUL, CR, and LF, and SHALL treat an empty value as not provided. Existing `SSH_PASSWORD`, `SUDO_PASSWORD`, `RDP_PASSWORD`, `--rdp-password`, and `--sudo-password` inputs SHALL remain operation-time compatibility sources. There is no legacy `--ssh-password` option. Source precedence SHALL be SSH FD > SSH_PASSWORD env; sudo FD > legacy `--sudo-password` > SUDO_PASSWORD env > already-resolved SSH secret fallback; and RDP FD > legacy `--rdp-password` > RDP_PASSWORD env. Sudo SHALL use the SSH fallback only when all sudo sources are unspecified. An invalid or unreadable FD, invalid frame, overlong value, or truncated value SHALL fail closed without fallback. An explicit empty legacy CLI value SHALL retain its current override semantics and SHALL fail a required-password check instead of silently using a lower source.

Empty environment values SHALL count as unspecified. Every resolved value, regardless of source, SHALL satisfy the same byte limits and forbidden-byte rules. Input FDs SHALL NOT alias a consumed source descriptor; each configured source SHALL be read and closed once.

Before any `dirname`, `pwd`, build, `date`, SSH, rsync, firstboot, or other child operation, the entrypoint SHALL capture non-dry-run source values into private non-exported variables, remove export attributes, and unset `SSH_PASSWORD`, `SUDO_PASSWORD`, `RDP_PASSWORD`, and `SSHPASS`. It SHALL NOT set `SSHPASS` or enable `set -x`. Dry-run SHALL complete its shell-only target/mode/scope gate and return before reading password FDs, creating pipes/frames/files, copying secret material, building, obtaining `date`, or starting a child.

Every SSH, rsync, firstboot, and other authenticated child SHALL receive a fresh readable pipe or FD; no consumed pipe, descriptor, or offset SHALL be reused. The remote bootstrap stdin frame SHALL be versioned and non-evaluated, with fixed format:

```text
frame = ASCII("SOLAR-DEPLOY-SECRET-FRAME/1") || LF
     || ASCII_DECIMAL(BYTE_LENGTH(sudo)) || LF || sudo || LF
     || ASCII_DECIMAL(BYTE_LENGTH(rdp))  || LF || rdp  || LF
     || ASCII("END") || LF
```

The notation SHALL mean byte concatenation, not shell source; the final LF SHALL be followed by immediate EOF, and EOF SHALL NOT be encoded as payload.

Each length SHALL be ASCII canonical decimal `0` through `4096`, with no leading zero except `0`; each raw value SHALL contain no NUL, CR, or LF, SHALL be followed by exactly one LF, and SHALL preserve other bytes including spaces, quotes, dollar signs, semicolons, and backslashes. Length `0` SHALL mean not provided. The magic is 28 bytes, each field is at most 4102 bytes, and the complete frame is at most 8236 bytes. The parser SHALL reject malformed length, extra bytes, missing delimiters, truncation, overlong values, and any bytes after `END\n`; it SHALL NOT use `eval`, shell word splitting, command substitution, or secret-bearing/base64 commands.

The remote receiver SHALL parse the frame before privileged bootstrap and create the RDP file inside an invocation-owned mode-700 controlled mktemp parent. The file SHALL be regular, non-symlink, mode 600, and owned by the remote login user or root. Sudo authentication SHALL receive only its password through a fresh stdin pipe; sudo and bootstrap argv SHALL contain only non-secret options, including the exact option --rdp-password-file. Bootstrap SHALL validate file metadata and forward that path without reading its payload; the configurator SHALL validate, read the RDP payload once, and close it. Legacy direct bootstrap inputs SHALL be converted to an invocation-owned file before forwarding to the configurator.

Cleanup SHALL remove only exact files and parents created and marked by that cleanup owner, after owner, marker, type, and containment checks; forwarding or validating a caller-supplied file SHALL NOT authorize its deletion. The existing final RDP credential configuration storage, including its base64 representation, SHALL remain unchanged and SHALL be outside the transient-secret transport guarantee.

Normal exit and catchable `EXIT`, `HUP`, `INT`, and `TERM` paths SHALL close descriptors and clean owned transient material. SSH disconnect, remote host loss, or an unobserved target process SHALL report cleanup as `unknown` and provide exact-owned-path recovery instructions. SIGKILL, kernel kill, and power loss SHALL have no trap-cleanup guarantee; the implementation SHALL NOT claim that every interruption cleans all material. Sudo authentication, RDP passwordless/system-password behavior, SSH target handling, and non-secret shell quoting SHALL remain available.

#### Scenario: Operator starts an update deployment

- **WHEN** an operator runs the Raspberry Pi deployment entrypoint with the operation-time `SSH_TARGET` in update mode
- **THEN** the command verifies SSH reachability and sudo access before uploading files
- **AND** it prints the target, mode, install directory, bundle type, MQTT host setting, readonly-root setting, and hotspot policy inputs before making target changes
- **AND** it prints the kiosk user derived from the SSH target or explicit override before making target changes
- **AND** target-side bootstrap stops the active service and creates a verified runtime backup before replacing application files
- **AND** a backup failure stops the update before application replacement
- **AND** it forwards the hotspot connection id, scan SSID, and integer priority to target bootstrap when hotspot management is requested
- **AND** the final output reports the backup path and recovery command
- **AND** captured local/remote child argv, remote command text, child environment, stdout, stderr, and ordinary logs contain no raw or reversible secret representation
- **AND** RDP and sudo functionality remains available through their secure channel

#### Scenario: Dry run reports planned stages without target changes

- **WHEN** an operator runs the deployment entrypoint with dry-run enabled
- **THEN** the command prints the local and remote stages that would run, including backup verification, hotspot policy configuration when requested, and recovery handoff
- **AND** it does not upload a bundle, create a backup, install packages, change NetworkManager profiles, install or enable systemd units, restart services, edit partitions, or enable readonly root
- **AND** it does not read a password FD, create a secret pipe/frame/file, or copy secret material
- **AND** it does not build, obtain a date for a staging path, start a child, or print/forward/materialize any secret value

#### Scenario: SSH_PASSWORD remains the sudo fallback

- **WHEN** all sudo sources are absent and `SSH_PASSWORD` is supplied through its operation-time source
- **THEN** sudo authentication receives the already-resolved SSH password through the bounded secure channel
- **AND** the password is not exported as `SSHPASS` or placed in any child argv, remote command text, child environment, or log

#### Scenario: SUDO_PASSWORD takes precedence

- **WHEN** both `SUDO_PASSWORD` and `SSH_PASSWORD` are supplied and no sudo FD or legacy sudo CLI value is supplied
- **THEN** sudo authentication receives `SUDO_PASSWORD`
- **AND** SSH authentication receives `SSH_PASSWORD`
- **AND** neither secret appears in captured argv, command text, environment, output, or logs

#### Scenario: Legacy direct sudo CLI retains actual precedence

- **WHEN** `SUDO_PASSWORD`, `SSH_PASSWORD`, and legacy `--sudo-password` are all supplied
- **THEN** the explicit `--sudo-password` value is selected for sudo, preserving the existing CLI-over-env behavior
- **AND** the direct value is not forwarded to a child argv, remote command, environment, output, or log
- **AND** a redacted migration warning names `--sudo-password-fd` and states that the parent invocation argv is not retroactively protected

#### Scenario: Secure FD sources are fresh across repeated operations

- **WHEN** secure SSH and RDP/sudo FD sources contain sentinel values and the deployment performs at least three consecutive SSH and rsync authenticated pairs plus any firstboot query
- **THEN** each authenticated child reads a new readable FD or pipe and receives the exact resolved bytes
- **AND** no child reuses an exhausted descriptor or offset
- **AND** raw, shell-escaped/quoted, base64, and other reversible sentinel representations are absent from captured argv, command text, environment, stdout, stderr, and logs

#### Scenario: Special-character secrets round-trip without shell interpolation

- **WHEN** secure FD sources contain sentinel values with spaces, single quotes, dollar signs, semicolons, and backslashes
- **THEN** the target-side secure channel delivers each value byte-for-byte
- **AND** the remote command contains only non-secret deployment options
- **AND** the deployment function remains unchanged

#### Scenario: Legacy direct secret flags provide a migration path

- **WHEN** an operator supplies legacy `--rdp-password` or `--sudo-password` direct options
- **THEN** the entrypoint preserves the existing RDP or sudo behavior
- **AND** it emits a redacted migration warning naming `--rdp-password-fd` or `--sudo-password-fd`
- **AND** it does not forward the direct secret value to remote args, child argv, remote command text, environment, output, or logs
- **AND** it states that the parent invocation argv is not retroactively protected

#### Scenario: Empty and invalid secure input fail according to source rules

- **WHEN** a password FD is valid but empty, or an explicit legacy CLI value is empty
- **THEN** an empty FD is treated as not provided and source precedence continues
- **AND** an empty explicit legacy CLI value remains selected and fails a required-password check without falling back
- **WHEN** a password FD is invalid, closed, unreadable, malformed, overlong, or truncated
- **THEN** the command exits nonzero without falling back to env, CLI, or SSH

#### Scenario: Versioned frame rejects unsafe boundaries

- **WHEN** the remote stdin does not exactly match the version 1 magic, fixed sudo/RDP order, canonical lengths, raw value restrictions, single LF delimiters, `END\n`, and immediate EOF
- **THEN** the target parser exits nonzero for malformed, extra, truncated, overlong, NUL, CR, or LF-containing input
- **AND** no secret-bearing command, `eval`, base64 argv, or redacted-boundary bypass is used

#### Scenario: Target RDP file is validated and read once

- **WHEN** target bootstrap receives `--rdp-password-file`
- **THEN** it accepts only a path in the invocation-owned mode-700 parent whose file is regular, non-symlink, mode 600, and owned by the remote login user or root
- **AND** bootstrap validates and forwards only the non-secret path, the configurator reads the payload once and closes it, and existing persisted base64 config behavior is preserved
- **AND** invalid type, mode, owner, containment, or marker fails closed without arbitrary path removal

#### Scenario: Early child processes cannot inherit source secrets

- **WHEN** operation-time secret variables are exported and the entrypoint begins a non-dry-run deployment
- **THEN** every child, including path discovery and build, MUST observe none of SSH_PASSWORD, SUDO_PASSWORD, RDP_PASSWORD, or SSHPASS
- **AND** private captured values MUST remain non-exported and secret emitters MUST NOT create secret-bearing argv

#### Scenario: Failure or catchable interruption cleans transient secret material

- **WHEN** sshpass, SSH, rsync, sudo, bootstrap, secret parsing, or RDP setup fails, or an error EXIT or catchable HUP, INT, or TERM interrupts deployment while a secret channel is active
- **THEN** the command exits nonzero
- **AND** owned local descriptors and target mode-700/mode-600 transient secret files are closed or removed when cleanup is confirmed
- **AND** stderr, stdout, and ordinary logs contain redacted failure context without raw or reversible secret representations
- **AND** the deployment does not silently change sudo or RDP authentication policy

#### Scenario: Remote loss reports cleanup as unknown

- **WHEN** the SSH connection or remote host is lost before target cleanup is observed
- **THEN** the local result reports cleanup `unknown` rather than claiming that all target material was removed
- **AND** it records only the exact invocation-owned recovery path and requires fresh owner/marker/type/containment validation before recovery cleanup

#### Scenario: Uncatchable termination has no cleanup guarantee

- **WHEN** the process is SIGKILLed or the host loses power while a secret channel is active
- **THEN** the contract makes no trap-cleanup claim
- **AND** any later recovery remains limited to exact-owned-path validation and cleanup


<!-- @trace
source: harden-onekey-deploy-secret-transport
updated: 2026-09-10
code:
  - deploy/raspi-bootstrap.sh
  - deploy/configure-lightweight-desktop.sh
  - scripts/deploy.test.mjs
  - scripts/raspi-onekey-deploy.sh
-->

---
### Requirement: Prepare first-boot user-data with an interactive menu

The system SHALL provide macOS/Linux and Windows helpers that prepare Ubuntu Raspberry Pi `system-boot/user-data` without requiring the operator to remember cloud-init YAML.

#### Scenario: Interactive defaults create a pi sudo SSH user

- **WHEN** an operator runs the user-data helper without arguments
- **THEN** the helper prompts for the boot path, hostname, Linux user, user password, root password, timezone, package upgrade choice, and final confirmation
- **AND** accepting defaults writes cloud-init for user `pi`, password `pi`, sudo group membership, `openssh-server`, `sudo`, `avahi-daemon`, SSH password auth enabled, first-boot root auto-grow disabled, and root SSH login disabled

#### Scenario: Root auto-grow is disabled before first boot

- **WHEN** the helper writes `user-data` for a fresh production card
- **THEN** the generated cloud-init disables `growpart` and root filesystem resize
- **AND** it writes a growroot-disabled marker so the card keeps free space for `/data` creation during init deploy

#### Scenario: Existing user-data is backed up

- **WHEN** the target boot partition already contains `user-data`
- **THEN** the helper copies it to `user-data.before-solar-player` before writing the Solar Player cloud-init file

#### Scenario: Project-specific user can be explicit

- **WHEN** an operator passes a user such as `kz`
- **THEN** the helper writes that user into cloud-init instead of the generic `pi` default

#### Scenario: Interactive helper records data partition size

- **WHEN** an operator runs the user-data helper without arguments
- **THEN** the helper prompts for the target `/data` partition size
- **AND** accepting defaults writes a boot-partition deploy environment file with `DATA_SIZE_GB=10`
- **AND** entering another positive integer writes that value instead

#### Scenario: Init deploy reads first-boot deploy environment

- **WHEN** init deployment runs after the user-data helper wrote `/boot/firmware/solar-deploy.env`
- **THEN** the deployment entrypoint reads `DATA_SIZE_GB` and `MQTT_HOST` from that file when the operator did not pass explicit CLI values
- **AND** explicit `--data-size-gb` or `--mqtt-host` values take precedence over the boot-partition deploy environment

#### Scenario: First-login maintenance tools script is written

- **WHEN** an operator accepts the first-login tools option
- **THEN** the helper writes an executable `solar-first-login-tools.sh` script to the boot partition
- **AND** the script installs minimum maintenance tools and nvm for the selected kiosk user
- **AND** the script is safe to rerun without changing SSH or sudo authentication policy


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Keep daily update deployments non-destructive

The system SHALL support a daily update mode that updates the application deployment while preserving target runtime state and without changing disk partitions.

#### Scenario: Update deployment preserves runtime state

- **WHEN** an operator runs update mode against a target with an existing install directory
- **THEN** the deployment preserves the target `.env`, data directory, logs directory, image uploads directory, and brand uploads directory
- **AND** it updates application files and deploy helpers needed by the current bundle

#### Scenario: Update mode refuses disk initialization

- **WHEN** an operator runs update mode
- **THEN** the deployment does not run disk partition creation, disk resizing, filesystem formatting, or mount table creation commands
- **AND** it fails if the required `/data` runtime mount or install directory prerequisites are missing


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Gate new-card disk initialization behind detected layout and confirmation

The system SHALL gate new-card disk initialization behind explicit layout detection, safe-case checks, and operator confirmation.

#### Scenario: Init mode displays disk choices

- **WHEN** an operator runs init mode on a Raspberry Pi target
- **THEN** the bootstrap prints the detected disk name, total disk size, partition list, filesystem labels, mountpoints, root partition size, and `/data` mount status
- **AND** it presents root-size and `/data` layout choices before performing disk changes

#### Scenario: Data partition defaults to ten GiB

- **WHEN** init mode creates `/data` on a fresh card without an explicit root-size override
- **THEN** it allocates `/data` as 10GiB
- **AND** it expands root to use the remaining leading disk space

#### Scenario: Existing writable data mount is reused

- **WHEN** init mode detects an existing writable `/data` mount
- **THEN** it offers to reuse `/data`
- **AND** reusing `/data` does not format, resize, or repartition the disk

#### Scenario: Root-full layout is rejected

- **WHEN** init mode detects that the root partition consumes the full disk and `/data` is absent
- **THEN** it exits non-zero with a message explaining that online root shrink is not supported
- **AND** it does not run partition shrink, filesystem shrink, formatting, or mount table modification commands


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Install and verify kiosk runtime on Ubuntu 24.04 Raspberry Pi

The system SHALL install and verify the runtime prerequisites for the Solar Display kiosk on Ubuntu 24.04 arm64 Raspberry Pi targets.

#### Scenario: Supported host passes preflight

- **WHEN** bootstrap runs on Ubuntu 24.04 arm64 with sudo access
- **THEN** it accepts the host as a supported target
- **AND** it verifies or installs the required runtime pieces for Node, pnpm, Firefox, the Solar Display service, kiosk launcher helpers, and desktop re-entry launcher

#### Scenario: Unsupported host is rejected

- **WHEN** bootstrap runs on a host that is not Ubuntu 24.04 arm64 or lacks sudo access
- **THEN** it exits non-zero before installing packages or changing service configuration
- **AND** it prints the unsupported OS, architecture, or sudo check that failed


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Configure lightweight XFCE RDP without weakening SSH or sudo

The system SHALL support lightweight remote desktop setup with XFCE and xrdp, and RDP passwordless access SHALL NOT disable SSH password authentication or sudo password prompts.

#### Scenario: XFCE xrdp desktop Firefox browser and lightdm autologin are installed

- **WHEN** bootstrap runs with desktop mode set to `xfce-xrdp`
- **THEN** it verifies or installs XFCE, lightdm, xrdp, xorgxrdp, Firefox, and the kiosk user's XFCE session file
- **AND** it enables the xrdp service for remote desktop access
- **AND** it configures lightdm to autologin the kiosk user for the local desktop

#### Scenario: RDP passwordless is limited to the kiosk desktop

- **WHEN** bootstrap runs with RDP auth mode set to `passwordless`
- **THEN** it configures xrdp to enter the kiosk user's XFCE desktop without prompting the RDP operator for a password
- **AND** it does not disable SSH password authentication
- **AND** it does not add sudo passwordless rules

#### Scenario: RDP passwordless requires a password source

- **WHEN** bootstrap runs with RDP auth mode set to `passwordless` and no kiosk password source is provided
- **THEN** it exits non-zero before changing xrdp configuration
- **AND** it explains that SSH and sudo remain password-protected


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Preserve MQTT defaults without overwriting target configuration

The system SHALL allow first-install MQTT defaults to be supplied during deployment while preserving an existing target `.env` file.

#### Scenario: First install writes MQTT default

- **WHEN** deployment runs with an MQTT host value and the target install directory has no `.env`
- **THEN** the generated `.env` contains the supplied MQTT broker host value
- **AND** the deployment prints that it created the target `.env`

#### Scenario: Existing env is preserved

- **WHEN** deployment runs with an MQTT host value and the target install directory already has `.env`
- **THEN** the deployment preserves the existing `.env` file unchanged
- **AND** it prints that MQTT defaults were not overwritten


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Gate readonly root apply behind successful verification

The system SHALL keep readonly root hardening as an explicit optional apply step that can run only after service and kiosk verification succeed.

#### Scenario: Readonly root defaults to dry run

- **WHEN** deployment completes without an explicit readonly apply flag
- **THEN** the deployment runs readonly-root preflight in dry-run mode or prints the readonly-root dry-run command
- **AND** it does not write overlayroot configuration or update initramfs

#### Scenario: Readonly root apply requires verification success

- **WHEN** an operator requests readonly root apply
- **THEN** the deployment first verifies the Solar Display service is active, the health endpoint responds, runtime write paths are writable by the kiosk user, and kiosk launchers are installed
- **AND** it invokes readonly root apply only if all verification checks pass

#### Scenario: Verification failure blocks readonly root apply

- **WHEN** readonly root apply is requested and any verification check fails
- **THEN** the deployment exits non-zero
- **AND** it leaves overlayroot configuration unchanged


<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Provide fixed desktop controls for readonly system maintenance

The system SHALL install fixed desktop launchers for enabling readonly system mode and temporarily disabling readonly system mode without exposing arbitrary host command execution.

#### Scenario: Desktop launchers are installed for kiosk user

- **WHEN** kiosk desktop setup completes
- **THEN** the kiosk user's desktop contains an executable launcher named `Enable Read Only System`
- **AND** it contains an executable launcher named `Temporarily Disable Read Only System`
- **AND** both launchers invoke fixed helper scripts installed under the kiosk user's bin directory

#### Scenario: Enable readonly desktop control requires sudo and verification

- **WHEN** an operator launches `Enable Read Only System`
- **THEN** the helper runs readonly-root verification before applying overlayroot
- **AND** it requires sudo for the host-level change
- **AND** it prompts the operator to reboot after a successful apply

#### Scenario: Temporarily disable readonly desktop control requires sudo and reboot

- **WHEN** an operator launches `Temporarily Disable Read Only System`
- **THEN** the helper disables overlayroot through the writable root or `overlayroot-chroot`
- **AND** it requires sudo for the host-level change
- **AND** it prompts the operator to reboot for the change to take effect

<!-- @trace
source: add-raspi-onekey-kiosk-deploy
updated: 2026-06-29
code:
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - apps/web/src/components/PageNumberPill.tsx
  - deploy/enable-readonly-root.sh
  - scripts/dev.test.mjs
  - deploy/start-solar-kiosk.sh
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Sustainability/displayPageConfig.ts
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/disable-display-sleep.sh
  - apps/web/src/pages/Overview/index.tsx
  - docs/runbooks/sustainability-calculation-settings.md
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - deploy/repair-kiosk-system.sh
  - deploy.md
  - apps/web/src/pages/DataSourceSettings/viewModel.ts
  - apps/server/src/routes/calculation-settings.ts
  - deploy/firefox-kiosk.desktop
  - packages/shared/src/types.ts
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/app/managementRouteVisibility.ts
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/displayPageMediaStyle.ts
  - deploy/verify-kiosk-install.sh
  - README.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - apps/web/src/pages/Images/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/web/src/pages/ImageManagement/imageManagement.css
  - deploy/readonly-system-enable.sh
  - apps/server/src/db/migrations/016_co2_display_preference.sql
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - apps/web/src/pages/DisplayPagesEditor/runtimeFactoryCircuit.tsx
  - scripts/raspi-onekey-deploy.sh
  - apps/web/src/pages/DisplayPagesEditor/runtimeOverview.tsx
  - apps/web/src/pages/DisplayPagesEditor/runtimeSustainability.tsx
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/displayPageConfig.ts
  - apps/server/src/db/migrations/014_topic_display_names.sql
  - docs/fhd-editor-gap-ledger.md
  - apps/web/src/pages/DisplayPagesEditor/runtimeImages.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - scripts/prepare-raspi-user-data.sh
  - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
  - apps/web/src/mocks/weather.ts
  - apps/web/src/pages/Overview/overview.css
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/deviceKioskExitService.ts
  - docs/runbooks/device-diagnostics-safe-ops.md
  - packages/shared/src/displayPageCardRail.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - deploy/readonly-system-disable.sh
  - apps/server/src/db/seed.ts
  - apps/server/src/routes/device.ts
  - scripts/connect-raspi-rdp.ps1
  - scripts/dev-lib.mjs
  - scripts/dev-lib.d.mts
  - apps/web/src/hooks/usePageRotation.ts
  - apps/server/src/services/calculationSettingsService.ts
  - apps/web/scripts/run-tests.mjs
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - packages/shared/src/displayStory.ts
  - apps/web/vite.config.ts
  - .env.example
  - deploy.sh
  - deploy/raspi-bootstrap.sh
  - deploy/apply-desktop-theme.sh
  - apps/web/src/pages/DisplayPagesEditor/cardStatusField.ts
  - scripts/deploy.test.mjs
  - apps/server/src/db/migrations/015_calculation_settings.sql
  - deploy/configure-lightweight-desktop.sh
  - packages/shared/src/householdEquivalence.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/routes/settings-mqtt.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/generationTrendSeries.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimeSolar.tsx
  - docs/README.md
  - apps/server/src/app.ts
  - apps/web/src/services/api.ts
  - apps/server/src/routes/data-source.ts
  - deploy/disable-readonly-system.desktop
  - deploy/enable-readonly-system.desktop
  - apps/web/src/app/routeMeta.ts
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - deploy/solar-display.service
  - scripts/prepare-raspi-user-data.ps1
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.ts
  - apps/web/src/pages/shared/PageScaffold.tsx
  - apps/server/src/env.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - deploy/install-kiosk.sh
  - scripts/dev.mjs
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
tests:
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/calculationSettingsService.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/server/src/routes/device.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorGeometry.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/server/src/services/generationTrendSeries.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/web/src/pages/Overview/densityViewModel.test.ts
  - apps/web/src/pages/DisplayPagesEditor/fhdEditorCapabilityGapLedger.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/pages/DisplayPagesEditor/displayEditorPresets.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - apps/web/src/pages/FactoryCircuit/cardFamily.test.ts
  - apps/web/src/app/managementRouteVisibility.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/app/router.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - apps/server/src/routes/settings-mqtt.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/server/src/db/migrations/topicDisplayNames.test.ts
  - apps/web/src/pages/Solar/cardFamily.test.ts
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - packages/shared/src/displayPageCardRail.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/DisplayPagesEditor/cardRailTemplateFields.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/MockMetricsFeedService.test.ts
-->

---
### Requirement: Resolve the Raspberry Pi connection target at operation time

The deployment documentation SHALL treat the SSH target supplied by the operator for the current operation as the sole connection target and SHALL NOT persist a project Raspberry Pi fixed IP in SSH, deployment, RDP, health-check, or reboot-verification examples.

#### Scenario: Operator prepares an SSH deployment session

- **WHEN** an operator follows the Raspberry Pi deployment documentation
- **THEN** the documentation instructs the operator to set a `<pi-host>` or `<ssh-target>` placeholder from the IP address or MagicDNS name supplied for that operation
- **AND** subsequent SSH, one-key deployment, RDP, health, and reboot-verification commands reuse that selected target

#### Scenario: Target address changes between operations

- **WHEN** the Raspberry Pi receives a different LAN or Tailscale address
- **THEN** the operator changes only the operation-time target value
- **AND** no repository documentation edit is required

#### Scenario: Documentation retains non-target infrastructure addresses

- **WHEN** deployment documentation includes an address for a separate dependency such as the MQTT broker
- **THEN** that address is explicitly identified as dependency configuration rather than the Raspberry Pi SSH target
- **AND** it is not reused as an SSH, RDP, health, or reboot-verification target


<!-- @trace
source: deploy-pi5-four-stage-fan-control
updated: 2026-07-16
code:
  - deploy/verify-kiosk-install.sh
  - deploy/disable-xfce-display-popups.sh
  - deploy.sh
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/configure-lightweight-desktop.sh
  - deploy.md
  - deploy/apply-desktop-theme.sh
  - deploy/disable-display-sleep.sh
  - deploy/configure-pi5-fan-control.sh
  - scripts/deploy.test.mjs
  - deploy/install-kiosk.sh
-->

---
### Requirement: Include Pi 5 thermal configuration in kiosk installation

The kiosk installation flow SHALL invoke the Pi 5 fan configuration helper before final kiosk verification and SHALL package that helper in every deploy bundle that supports Raspberry Pi kiosk installation.

#### Scenario: One-key deployment installs the thermal profile

- **WHEN** the one-key deployment reaches kiosk installation on Raspberry Pi 5
- **THEN** the installer invokes the packaged fan configuration helper
- **AND** helper failure stops installation before final verification is reported as successful

#### Scenario: Deploy bundle is built

- **WHEN** a deploy bundle is assembled
- **THEN** it contains the executable Pi 5 fan configuration helper
- **AND** bundle validation fails if the helper is missing

<!-- @trace
source: deploy-pi5-four-stage-fan-control
updated: 2026-07-16
code:
  - deploy/verify-kiosk-install.sh
  - deploy/disable-xfce-display-popups.sh
  - deploy.sh
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/configure-lightweight-desktop.sh
  - deploy.md
  - deploy/apply-desktop-theme.sh
  - deploy/disable-display-sleep.sh
  - deploy/configure-pi5-fan-control.sh
  - scripts/deploy.test.mjs
  - deploy/install-kiosk.sh
-->

---
### Requirement: Install Tailscale as a standard deployment prerequisite

The Raspberry Pi one-key deployment SHALL install the Tailscale client from Tailscale's official Ubuntu stable package repository and SHALL ensure `tailscaled.service` is enabled and active before replacing application files. The prerequisite SHALL be idempotent and SHALL preserve existing Tailscale node state.

#### Scenario: Fresh supported host does not have Tailscale

- **WHEN** init or update deployment runs on a writable Ubuntu 24.04 arm64 host without the Tailscale CLI
- **THEN** bootstrap configures the official Ubuntu Noble Tailscale keyring and package source
- **AND** it installs the `tailscale` package
- **AND** it enables and starts `tailscaled.service` before application replacement

#### Scenario: Host already has a ready Tailscale installation

- **WHEN** deployment runs with the Tailscale CLI present and `tailscaled.service` enabled and active
- **THEN** the prerequisite succeeds without replacing tailnet enrollment state
- **AND** it does not invoke Tailscale login or change the node's assigned address

#### Scenario: Durable installation is blocked by readonly root

- **WHEN** Tailscale is absent or not durably enabled and the root filesystem is an active overlay
- **THEN** the prerequisite exits nonzero before application replacement
- **AND** it directs the operator to disable readonly root and reboot before retrying

#### Scenario: Package or daemon preparation fails

- **WHEN** the official keyring/source download, apt operation, or daemon enable/start operation fails
- **THEN** bootstrap exits nonzero with the failed prerequisite step
- **AND** it does not replace application files or report deployment success

#### Scenario: Dry run reports the prerequisite

- **WHEN** the operator runs one-key deployment with dry-run enabled
- **THEN** output includes the planned Tailscale install and daemon enable/start stage
- **AND** no package, repository, service, or enrollment state is changed


<!-- @trace
source: add-tailscale-deployment-prerequisite
updated: 2026-07-16
code:
  - deploy/disable-display-sleep.sh
  - scripts/deploy.test.mjs
  - deploy/apply-desktop-theme.sh
  - deploy/raspi-bootstrap.sh
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/verify-kiosk-install.sh
  - deploy.sh
  - deploy.md
  - scripts/raspi-onekey-deploy.sh
  - deploy/disable-xfce-display-popups.sh
  - deploy/install-tailscale.sh
  - deploy/configure-lightweight-desktop.sh
-->

---
### Requirement: Verify local Tailscale readiness separately from tailnet enrollment

The kiosk verification command SHALL require the Tailscale CLI and an enabled and active `tailscaled.service`. Tailnet login, a Tailscale IP, and a particular backend state SHALL NOT be required by local deployment verification.

#### Scenario: Daemon is ready before enrollment

- **WHEN** verification finds the Tailscale CLI and `tailscaled.service` enabled and active while the node has no Tailscale IP
- **THEN** the Tailscale prerequisite check passes
- **AND** documentation directs the operator to complete enrollment explicitly

#### Scenario: Required local Tailscale component is unavailable

- **WHEN** the Tailscale CLI is missing, `tailscaled.service` is disabled, or `tailscaled.service` is inactive
- **THEN** verification reports the Tailscale prerequisite failure
- **AND** verification exits nonzero

#### Scenario: Operator completes enrollment

- **WHEN** the daemon is ready and the operator chooses an interactive login or externally supplied one-time enrollment method
- **THEN** no reusable auth material is read from or written to repository-managed files
- **AND** the operator uses the control-plane-assigned Tailscale IP or MagicDNS name as the operation-time SSH target
- **AND** deployment does not promise or hardcode a particular Tailscale IP

<!-- @trace
source: add-tailscale-deployment-prerequisite
updated: 2026-07-16
code:
  - deploy/disable-display-sleep.sh
  - scripts/deploy.test.mjs
  - deploy/apply-desktop-theme.sh
  - deploy/raspi-bootstrap.sh
  - docs/runbooks/raspi-onekey-kiosk-deploy.md
  - deploy/verify-kiosk-install.sh
  - deploy.sh
  - deploy.md
  - scripts/raspi-onekey-deploy.sh
  - deploy/disable-xfce-display-popups.sh
  - deploy/install-tailscale.sh
  - deploy/configure-lightweight-desktop.sh
-->

---
### Requirement: Select application update or full deployment scope

The deployment entrypoint SHALL expose an explicit `app` or `full` scope and SHALL default update mode to `app` and init mode to `full` when the operator omits the scope.

#### Scenario: Installed application is updated with default scope

- **WHEN** an operator runs update mode without `--scope`
- **THEN** the entrypoint selects app scope
- **AND** forwards app scope to target bootstrap

#### Scenario: Fresh installation selects full scope

- **WHEN** an operator runs init mode without `--scope`
- **THEN** the entrypoint selects full scope

#### Scenario: Host option conflicts with app scope

- **WHEN** app scope is combined with init mode, readonly application, data partition creation, or hotspot policy inputs
- **THEN** the entrypoint exits nonzero before build, upload, or target mutation
- **AND** reports that full scope is required


<!-- @trace
source: split-pi5-full-deploy-and-app-update
updated: 2026-07-16
code:
  - deploy/raspi-bootstrap.sh
  - deploy.md
  - scripts/raspi-onekey-deploy.sh
tests:
  - scripts/deploy.test.mjs
-->

---
### Requirement: Perform a minimal installed-application update

Target bootstrap SHALL provide an app scope that preserves runtime data and updates the existing application without reconfiguring the host.

#### Scenario: App update succeeds

- **WHEN** target bootstrap receives app scope for an existing installed kiosk
- **THEN** it validates the host, existing install root, `/data`, Node, pnpm, and the existing `solar-display.service`
- **AND** creates and verifies a runtime backup before bundle replacement
- **AND** preserves `.env`, SQLite data, logs, and uploads
- **AND** installs production dependencies from the uploaded bundle
- **AND** restarts the existing service
- **AND** verifies the release manifest, active service, and `/health`
- **AND** reports the backup and recovery command

#### Scenario: App update excludes host deployment actions

- **WHEN** target bootstrap runs app scope
- **THEN** it does not install OS packages or Tailscale
- **AND** does not create environment defaults or mutate disk state
- **AND** does not invoke desktop, kiosk, fan, hotspot, readonly, or full kiosk verification helpers
- **AND** does not reboot the target

#### Scenario: Existing application prerequisite is missing

- **WHEN** app scope cannot find the existing install, Node, pnpm, `/data`, or `solar-display.service`
- **THEN** it exits nonzero without silently escalating to full scope
- **AND** retains recovery material when the verified backup was already created

<!-- @trace
source: split-pi5-full-deploy-and-app-update
updated: 2026-07-16
code:
  - deploy/raspi-bootstrap.sh
  - deploy.md
  - scripts/raspi-onekey-deploy.sh
tests:
  - scripts/deploy.test.mjs
-->

---
### Requirement: Keep the kiosk browser recoverable within the graphical session

The installed kiosk launcher SHALL remain active after starting its Firefox child, SHALL recover the browser after an unexpected child exit, and SHALL keep retrying the existing server health gate when one health-check window expires.

#### Scenario: Firefox exits without an operator stop request

- **WHEN** the Firefox child exits and the kiosk stop marker is absent
- **THEN** the launcher records the child exit status
- **AND** the launcher waits for the configured recovery delay
- **AND** the launcher passes the server health gate again before starting Firefox with the same kiosk URL

#### Scenario: One server health window expires

- **WHEN** the server does not become healthy within `KIOSK_WAIT_SECONDS`
- **THEN** the launcher records the health timeout
- **AND** the launcher waits for the configured recovery delay
- **AND** the launcher begins another health-check window instead of permanently exiting

#### Scenario: A second launcher starts in the same active session

- **WHEN** the session PID file identifies a live kiosk launcher or Firefox lifecycle process
- **THEN** the second launcher records that the session is already managed
- **AND** the second launcher exits without starting another recovery loop

<!-- @trace
source: recover-pi-kiosk-browser-after-exit
updated: 2026-09-08
code:
  - apps/web/src/pages/DeviceFleet/PairingDialog.tsx
  - apps/server/src/services/metricInventoryService.ts
  - scripts/run-browser-smoke.mjs
  - apps/web/src/pages/MqttSettings/MqttConnectionsPanel.tsx
  - apps/web/src/pages/DisplayPagesEditor/publishing.ts
  - apps/web/src/pages/DisplayPagesEditor/PublishReviewDrawer.tsx
  - apps/server/src/db/migrations/044_mapping_apply_receipts.sql
  - apps/server/src/services/factoryGenerationAggregateService.ts
  - apps/server/src/services/displayPublishEnergyScopes.ts
  - apps/web/src/hooks/useLiveMetrics.ts
  - scripts/check-web-bundle-budget.mjs
  - solar_mqtt_go/internal/webui/web/styles/theme.css
  - apps/web/src/pages/PlaybackProfiles/index.tsx
  - apps/server/src/routes/metrics-inventory.ts
  - apps/server/src/services/freshnessPolicyService.ts
  - docs/ops/workflow.md
  - apps/web/src/pages/DeviceStatus/index.tsx
  - docs/openapi.yaml
  - apps/server/src/routes/management-auth.ts
  - apps/web/src/pages/Overview/runtimeContent.tsx
  - apps/web/src/pages/Solar/viewModel.ts
  - packages/shared/src/metricPicker.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.ts
  - solar_mqtt_go/build.sh
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.tsx
  - solar_mqtt_go/internal/display/display.go
  - apps/web/src/hooks/useSustainabilityStoryRuntime.ts
  - apps/server/src/routes/metrics.ts
  - apps/web/src/pages/EnergyHistory/index.tsx
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
  - packages/shared/src/mqttTestPublish.ts
  - apps/web/src/pages/MqttSettings/MqttTopicPanel.tsx
  - packages/shared/src/meterReading.ts
  - scripts/device-scoped-playback-load.mjs
  - apps/server/src/services/departmentSharesService.ts
  - apps/server/src/services/SnapshotWriterService.ts
  - apps/web/src/pages/DataHub/sourceWorkspace.ts
  - packages/shared/src/widgetDataBinding.ts
  - apps/web/src/vite-env.d.ts
  - apps/web/src/pages/DataHub/SharedInfrastructureBanner.tsx
  - apps/server/src/db/migrations/047_projection_activation_context.sql
  - apps/web/src/hooks/useManagementPasswordGate.ts
  - apps/server/src/services/playbackProfileGovernanceService.ts
  - scripts/verify.mjs
  - apps/web/src/pages/EnergyHistory/history.css
  - tests/offline-playback-browser.test.mjs
  - solar_mqtt_go/internal/anomaly/anomaly.go
  - packages/shared/src/guidedSiteEnergySetup.ts
  - apps/server/src/routes/data-source.ts
  - .agents/skills/openspec-apply-change/SKILL.md
  - apps/web/src/sw.ts
  - docs/ops/conventions.md
  - apps/web/src/pages/FactoryCircuit/viewModel.ts
  - apps/web/src/pages/DataHub/UsageModel.ts
  - pnpm-workspace.yaml
  - apps/web/src/pages/PlaybackProfiles/viewModel.ts
  - apps/web/src/pages/DataHub/SiteEnergySetupPanel.tsx
  - packages/shared/src/imagePlaylist.ts
  - packages/shared/src/freshnessPolicy.ts
  - apps/server/src/routes/mqtt-captures.ts
  - solar_mqtt_go/start.sh
  - apps/server/src/routes/metric-provenance.ts
  - apps/web/src/pages/DataHub/index.tsx
  - apps/web/src/hooks/useOfflinePlaybackSnapshot.ts
  - apps/server/src/mqtt/SolarSourceAdapter.ts
  - apps/web/src/pages/EnergyTrend/viewModel.ts
  - apps/web/src/services/api.ts
  - apps/web/scripts/run-tests.test.mjs
  - apps/server/src/services/displayDataPreviewService.ts
  - apps/server/src/services/effectiveRotationCache.ts
  - apps/web/src/app/dataHub.ts
  - apps/server/src/db/migrations/037_derived_metric_registry.sql
  - apps/web/src/pages/EnergyHistory/viewModel.ts
  - solar_mqtt_go/internal/webui/web/js/mqtt-manager.js
  - apps/server/src/services/meterReadingService.ts
  - apps/server/src/services/displayValueOverrideService.ts
  - apps/web/src/pages/DeviceStatus/layout.ts
  - apps/server/src/mqtt/ManagedSourceAdapter.ts
  - apps/server/src/db/migrations/038_derived_metric_site_scopes.sql
  - solar_mqtt_go/internal/mqttbus/bus.go
  - packages/shared/src/index.ts
  - solar_mqtt_go/internal/webui/web/vendor/mqtt.min.js
  - packages/shared/src/displayCardData.ts
  - packages/shared/src/playbackMetricContract.ts
  - apps/web/src/pages/DataHub/links.ts
  - .agents/skills/openspec-sync-specs/SKILL.md
  - apps/server/src/db/migrations/041_site_energy_profiles.sql
  - apps/server/src/db/migrations/036_remove_managed_solar_topic_mappings.sql
  - apps/web/src/pages/EnergyTrend/index.tsx
  - apps/web/src/components/AppFooterNav.tsx
  - apps/web/src/pages/DeviceFleet/GroupEditDialog.tsx
  - apps/web/src/pages/MqttSettings/MqttCardDataPanel.tsx
  - apps/web/src/pages/MqttSettings/MqttSettingsViewHelpers.ts
  - apps/server/src/db/migrations/042_consumption_projections.sql
  - apps/web/src/pages/DataHub/SourceDetailsDrawer.tsx
  - apps/web/src/pages/DataHub/Metrics.tsx
  - apps/server/src/db/migrations/045_profile_apply_guards.sql
  - packages/shared/src/periodConsumption.ts
  - packages/shared/src/unsavedBindingPreview.ts
  - apps/web/src/pages/DataSourceSettings/DataSourceOperations.tsx
  - CLAUDE.md
  - apps/server/src/services/derivedMetricCatalogService.ts
  - apps/server/src/db/migrations/040_meter_reading_contracts.sql
  - apps/server/src/routes/images.ts
  - packages/shared/src/displayEditorSchema.ts
  - apps/web/src/pages/DataHub/Weather.tsx
  - apps/server/src/db/migrations/034_management_password_gate.sql
  - apps/server/src/routes/device.ts
  - apps/server/src/services/displayStoryService.ts
  - apps/server/src/services/sourceImpactService.ts
  - apps/web/src/pages/Solar/index.tsx
  - apps/server/src/services/metricUsageService.ts
  - apps/web/src/app/dataHubCompatibility.ts
  - deploy/start-solar-kiosk.sh
  - solar_mqtt_go/commands.go
  - apps/web/src/pages/DataHub/sectionState.tsx
  - apps/server/src/routes/brand.ts
  - apps/server/src/routes/display-pages.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.tsx
  - apps/web/src/pages/DataHub/MetricDetailsModel.ts
  - packages/shared/src/displayPublishPreflight.ts
  - apps/web/src/pages/DeviceStatus/LeftWingTriagePanel.tsx
  - apps/web/src/pages/MqttSettings/MqttWeatherPanel.tsx
  - apps/web/src/pages/MqttSettings/index.tsx
  - apps/server/src/services/meterSourceCatalogService.ts
  - apps/server/src/db/scopedMetricMigration.ts
  - packages/shared/src/displayClientContext.ts
  - packages/shared/src/playbackProfileVersion.ts
  - apps/web/src/pages/DeviceStatus/device.css
  - solar_mqtt_go/internal/heartbeat/heartbeat.go
  - apps/server/src/services/deviceGroupService.ts
  - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsBroker.ts
  - apps/web/src/pages/DataHub/WeatherCards.tsx
  - apps/web/src/pages/PlaybackProfiles/playbackProfiles.css
  - AGENTS.md
  - apps/web/src/pages/FactoryCircuit/index.tsx
  - apps/server/src/db/migrations/033_freshness_policy.sql
  - apps/web/src/styles/management.css
  - apps/web/src/hooks/liveMetricsStore.ts
  - apps/server/src/services/periodConsumptionService.ts
  - apps/server/src/db/migrations/048_meter_source_lifecycle.sql
  - apps/web/src/pages/runtimeRefreshRegistry.ts
  - solar_mqtt_go/internal/tray/logfile.go
  - packages/shared/src/displayClientLiveness.ts
  - apps/server/src/db/migrations/050_profile_source_review.sql
  - apps/web/src/pages/MqttSettings/mqttSettingsRouteModel.ts
  - apps/server/src/services/imagePlaylistService.ts
  - apps/web/src/layouts/ManagementShell.tsx
  - apps/server/src/server-startup.ts
  - apps/server/src/db/migrations/046_meter_reading_evidence.sql
  - apps/server/src/db/migrations/043_energy_authoring_tokens.sql
  - apps/web/src/pages/DeviceFleet/deviceFleet.css
  - apps/server/src/services/metricProvenanceService.ts
  - apps/web/src/pages/Sustainability/viewModel.ts
  - solar_mqtt_go/internal/tray/instance_unix.go
  - .agents/skills/.openspec-target
  - apps/web/src/pages/PlaybackProfiles/PlaybackProfilePreviewPanel.tsx
  - docs/ops/device-scoped-playback-test-matrix.md
  - apps/server/src/services/deviceProfileRolloutService.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.types.ts
  - apps/server/src/services/MetricHistoryRetentionService.ts
  - apps/web/src/pages/DataSourceSettings/DataSourceOperationsView.tsx
  - solar_mqtt_go/internal/mosquitto/mosquitto.go
  - apps/web/src/pages/MqttSettings/mqttSettings.css
  - solar_mqtt_go/internal/mosquitto/proc_windows.go
  - apps/server/src/routes/playback-profiles.ts
  - apps/server/src/services/householdEquivalenceService.ts
  - apps/server/src/services/displayPagePublishingService.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.tsx
  - packages/shared/src/monthlyConsumptionSeries.ts
  - apps/web/src/pages/Overview/index.tsx
  - apps/server/src/services/derivedMetricExpression.ts
  - apps/server/src/services/mqttObservationCatalogService.ts
  - apps/server/src/fastify.ts
  - .agents/skills/openspec-archive-change/SKILL.md
  - apps/web/src/pages/DataHub/Diagnostics.tsx
  - apps/server/src/services/displayRotationService.ts
  - apps/web/src/pages/DisplayPagesEditor/inspectorCard.tsx
  - apps/server/src/routes/site-energy-profiles.ts
  - apps/server/src/services/managementSessionService.ts
  - apps/web/src/pages/shared/monitoringHistoryPayloadCache.ts
  - solar_mqtt_go/go.sum
  - apps/web/src/pages/DataHub/CardDataDiagnosticsModel.ts
  - apps/server/src/services/MetricResolver.ts
  - packages/shared/scripts/run-tests.mjs
  - apps/server/src/app.ts
  - apps/web/src/services/profileRollout.ts
  - packages/shared/src/metricScope.ts
  - solar_mqtt_go/internal/webui/web/styles/layout.css
  - apps/server/src/services/safeDiagnosticText.ts
  - apps/server/src/routes/shell-decorations.ts
  - apps/server/src/services/unpairedDisplayAccessRegistry.ts
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.tsx
  - apps/server/src/services/consumptionProjectionService.ts
  - apps/web/src/pages/DataHub/WeatherModel.ts
  - apps/web/src/pages/PlaybackProfiles/PlaybackProfilesContent.tsx
  - .agents/skills/openspec-propose/SKILL.md
  - apps/web/src/main.tsx
  - apps/server/src/services/managementPasswordService.ts
  - apps/web/src/pages/DataHub/draftGuard.tsx
  - apps/web/src/pages/DeviceFleet/index.tsx
  - apps/server/src/services/deviceCredentialService.ts
  - apps/server/src/plugins/deviceContext.ts
  - start.ps1
  - .agents/skills/openspec-explore/SKILL.md
  - solar_mqtt_go/internal/service/control.go
  - apps/server/src/services/derivedMetricRegistryService.ts
  - apps/web/src/pages/DeviceStatus/RightWingMetricsPanel.tsx
  - apps/server/src/db/migrations/039_remove_derived_metric_topic_mappings.sql
  - packages/shared/src/guidedOnboarding.ts
  - packages/shared/src/sourceMutationImpact.ts
  - apps/server/src/services/displayCardDataService.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsData.ts
  - apps/web/src/pages/DeviceFleet/viewModel.ts
  - apps/web/vite.config.ts
  - apps/server/src/services/displayPreviewContextService.ts
  - solar_mqtt_go/internal/tray/run_nocgo.go
  - apps/server/src/routes/playback.ts
  - apps/server/src/realtime/SocketService.ts
  - apps/web/src/pages/DeviceFleet/route.ts
  - apps/web/src/layouts/LayoutShell.tsx
  - apps/server/src/mqtt/MqttClientService.ts
  - apps/web/src/pages/MqttSettings/weatherFieldPresets.ts
  - solar_mqtt_go/internal/tray/instance_windows.go
  - apps/web/src/pages/MqttSettings/useMqttSettingsTopics.ts
  - apps/web/src/pages/DeviceFleet/loadModel.ts
  - apps/server/src/metrics/metricTimestamp.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsCardData.ts
  - solar_mqtt_go/internal/config/config.go
  - solar_mqtt_go/internal/tray/run.go
  - solar_mqtt_go/internal/webui/webui.go
  - apps/web/src/pages/DataHub/GuidedMqttMappingPanel.tsx
  - apps/web/src/pages/shared/DisplayLeafOrnament.tsx
  - apps/web/src/pages/Overview/displayPageConfig.ts
  - apps/web/src/pages/Overview/OverviewKpiFooter.tsx
  - apps/web/src/components/AppHeader.tsx
  - apps/web/src/pages/DisplayPagesEditor/regionTree.tsx
  - scripts/deploy.test.mjs
  - apps/web/src/components/ManagementUnlockScreen.tsx
  - apps/web/src/pages/DataHub/Usage.tsx
  - apps/web/src/pages/DataHub/Connections/BrokerForm.tsx
  - apps/web/src/pages/DataHub/CardDataDiagnostics.tsx
  - packages/shared/src/mqttMappingBatch.ts
  - packages/shared/src/displayReadiness.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.tsx
  - apps/server/src/mqtt/MqttDiscoveryService.ts
  - packages/shared/src/derivedMetricCatalogOverlay.ts
  - apps/web/src/services/offlinePlaybackStore.ts
  - apps/web/src/app/routeMeta.ts
  - solar_mqtt_go/internal/webui/web/js/config-view.js
  - apps/web/src/pages/MqttSettings/useMqttSettingsRemoteSync.ts
  - apps/server/src/routes/display-card-data.ts
  - solar_mqtt_go/internal/mosquitto/proc_unix.go
  - apps/server/src/routes/imagesSupport.ts
  - apps/web/src/pages/Overview/viewModel.ts
  - apps/web/src/pages/DisplayPagesEditor/index.tsx
  - packages/shared/src/sustainabilityStory.ts
  - apps/server/src/services/displayReadinessService.ts
  - apps/server/src/services/sustainabilityStoryService.ts
  - apps/web/src/pages/DataHub/TaskHome.tsx
  - solar_mqtt_go/assets/assets.go
  - solar_mqtt_go/internal/webui/web/styles/forms.css
  - apps/web/src/pages/DataHub/liveActivity.ts
  - apps/server/src/routes/calculation-settings.ts
  - apps/web/src/pages/SecuritySettings/index.tsx
  - apps/server/src/services/MockMetricsFeedService.ts
  - apps/server/src/db/migrations/031_playback_profile_versions.sql
  - apps/web/src/pages/DataHub/placeholder.tsx
  - apps/server/src/services/guidedMqttMappingService.ts
  - apps/web/src/pages/DeviceStatus/formatters.ts
  - apps/web/src/pages/runtimeConfigHydration.tsx
  - apps/web/src/pages/SecuritySettings/viewModel.ts
  - apps/web/src/pages/DataHub/SourcesModel.ts
  - solar_mqtt_go/internal/scraper/scraper.go
  - apps/web/src/services/appUpdateProtocol.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.tsx
  - apps/web/src/pages/DeviceStatus/localization.ts
  - apps/web/src/pages/ImageManagement/index.tsx
  - solar_mqtt_go/main.go
  - apps/server/src/services/deviceLivenessRegistry.ts
  - apps/web/src/pages/MqttSettings/factoryTopicSites.ts
  - apps/web/src/pages/DataHub/MetricsModel.ts
  - scripts/device-scoped-playback-load.test.mjs
  - package.json
  - solar_mqtt_go/build.ps1
  - apps/server/src/services/DailySummaryService.ts
  - apps/web/src/pages/DataHub/Sources.tsx
  - deploy/stop-solar-kiosk.sh
  - packages/shared/src/ephemeralPreviewState.ts
  - apps/server/src/services/displayOpsService.ts
  - packages/shared/src/departmentEnergyShares.ts
  - apps/web/src/pages/DataHub/DerivedMetrics.tsx
  - apps/server/src/services/siteEnergyProfileService.ts
  - apps/web/src/pages/DataHub/DiagnosticsModel.ts
  - tests/browser/fixtures/runtime.ts
  - solar_mqtt_go/internal/storage/storage.go
  - apps/web/scripts/run-tests.mjs
  - apps/server/src/routes/derived-metrics.ts
  - packages/shared/src/displayStory.ts
  - solar_mqtt_go/internal/webui/web/styles/components.css
  - apps/server/src/db/migrations/049_meter_source_boundary_age.sql
  - apps/web/src/services/displayRuntimeSyncReporter.ts
  - scripts/verify.test.mjs
  - apps/server/src/metrics/liveMetrics.ts
  - apps/server/src/mqtt/topicFilter.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - apps/web/src/recovery/installCrashRecovery.ts
  - apps/web/src/pages/MqttSettings/useMqttSettingsController.ts
  - apps/web/src/hooks/usePlaybackController.ts
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx
  - solar_mqtt_go/internal/service/service.go
  - apps/web/src/pages/DeviceFleet/DeviceFleetContent.tsx
  - apps/web/tsconfig.json
  - apps/server/src/routes/settings-mqtt.ts
  - apps/web/src/pages/Sustainability/index.tsx
  - solar_mqtt_go/internal/webui/web/js/factory-view.js
  - start.sh
  - packages/shared/src/guidedMqttMapping.ts
  - apps/server/src/services/profileSourceSnapshot.ts
  - solar_mqtt_go/internal/schedule/schedule.go
  - packages/shared/src/deviceIdentity.contract.ts
  - docs/runbooks/pc-server-deploy.md
  - apps/server/src/routes/metric-usage.ts
  - apps/server/src/services/mqttMeterIngest.ts
  - apps/server/src/db/migrate.ts
  - apps/server/src/routes/freshness-policy.ts
  - apps/server/src/plugins/managementAuth.ts
  - apps/web/src/pages/Solar/displayPageConfig.ts
  - apps/server/src/services/MetricsAccumulatorService.ts
  - packages/shared/src/displayPageFreshness.ts
  - apps/server/src/testing/deviceContextTestSupport.ts
  - apps/web/src/pages/DataHub/SourceCards.tsx
  - apps/web/src/services/socket.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - apps/web/src/pages/DisplayPagesEditor/MetricPicker.tsx
  - solar_mqtt_go/assets/tray.ico
  - apps/server/src/routes/meter-sources.ts
  - solar_mqtt_go/internal/tray/app.go
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.ts
  - apps/web/src/app/router.tsx
  - apps/web/src/pages/MqttSettings/loadModel.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.ts
  - apps/web/src/pages/Images/index.tsx
  - packages/shared/src/derivedMetric.ts
  - apps/web/src/pages/MqttSettings/viewModel.ts
  - apps/web/src/hooks/useSafeAppUpdate.ts
  - packages/shared/package.json
  - apps/server/src/config.ts
  - apps/web/src/pages/DeviceStatus/viewModel.ts
  - apps/server/src/db/migrations/032_device_profile_rollout.sql
  - apps/web/src/pages/MqttSettings/useMqttSettingsWeather.ts
  - solar_mqtt_go/internal/webui/web/js/local-config-view.js
  - packages/shared/src/managementAccess.ts
  - apps/server/src/routes/metrics-history.ts
  - packages/shared/src/displayOps.ts
  - solar_mqtt_go/internal/webui/web/js/app.js
  - solar_mqtt_go/internal/webui/web/index.html
  - .env.example
  - packages/shared/src/deviceIdentity.ts
  - apps/server/src/services/playbackMetricAuthorizationService.ts
  - apps/server/src/services/authoringCanonicalJson.ts
  - packages/shared/src/siteEnergyProfile.ts
  - apps/web/src/pages/DataSourceSettings/index.tsx
  - apps/web/src/pages/DisplayPagesEditor/workspaceLayout.ts
  - apps/server/src/db/migrations/035_scoped_metric_identity.sql
  - apps/web/src/hooks/useImagePlaylistRuntime.ts
  - packages/shared/src/mqttObservation.ts
  - solar_mqtt_go/start.ps1
  - apps/web/src/pages/FactoryCircuit/runtimeContent.tsx
  - apps/web/src/hooks/useFreshnessState.ts
  - apps/web/src/pages/DataHub/workspaceContext.ts
  - solar_mqtt_go/internal/webui/web/styles.css
  - apps/web/src/pages/Images/viewModel.ts
  - apps/server/src/services/calculationSettingsService.ts
  - packages/shared/src/deviceProfileRollout.ts
  - apps/web/src/pages/MqttSettings/MqttSourcePanel.tsx
  - solar_mqtt_go/go.mod
  - solar_mqtt_go/internal/discovery/discovery.go
  - apps/web/src/pages/MqttSettings/useMqttSettingsRuntime.ts
  - apps/web/src/pages/Solar/runtimeContent.tsx
  - apps/server/src/db/seed.ts
tests:
  - apps/web/src/pages/EnergyHistory/viewModel.test.ts
  - apps/server/src/routes/playback-profiles.test.ts
  - apps/web/src/pages/DataSourceSettings/DataSourceOperations.test.tsx
  - apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts
  - packages/shared/src/derivedMetricCatalogOverlay.test.ts
  - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - apps/server/src/services/carbonReductionConsistency.test.ts
  - apps/server/src/services/consumptionProjectionService.test.ts
  - packages/shared/src/meterReading.test.ts
  - apps/web/src/pages/DeviceFleet/index.test.tsx
  - apps/web/src/app/dataHub.test.ts
  - apps/web/src/pages/DataSourceSettings/viewModel.test.ts
  - apps/server/src/services/managementPasswordService.test.ts
  - apps/server/src/services/siteEnergyProfileService.test.ts
  - apps/server/src/routes/calculation-settings.test.ts
  - apps/server/src/metrics/metricTimestamp.test.ts
  - apps/web/src/pages/shared/playbackMetricContract.test.ts
  - apps/server/src/routes/display-preview-context.test.ts
  - apps/web/src/pages/DisplayPagesEditor/dataInspector.test.tsx
  - apps/web/src/pages/DataHub/UsageModel.test.ts
  - apps/web/src/pages/SecuritySettings/viewModel.test.ts
  - solar_mqtt_go/internal/webui/webui_test.go
  - apps/server/src/routes/uploadsSecurityHeaders.test.ts
  - apps/web/src/pages/ImageManagement/index.test.tsx
  - solar_mqtt_go/internal/schedule/schedule_test.go
  - apps/web/src/pages/DataHub/CardDataDiagnostics.test.tsx
  - apps/server/src/services/displayStoryService.test.ts
  - apps/web/src/pages/DataSourceSettings/DerivedMetricRegistryPanel.test.tsx
  - apps/web/src/pages/Overview/runtimeIsolation.test.tsx
  - apps/server/src/services/meterReadingService.test.ts
  - apps/web/src/pages/shared/widgetDataBinding.test.ts
  - apps/web/src/pages/Solar/configRender.test.ts
  - packages/shared/src/displayClientLiveness.test.ts
  - apps/server/src/routes/derived-metrics.test.ts
  - apps/web/src/pages/DataHub/workspaceContext.test.ts
  - apps/web/src/services/offlinePlaybackStore.test.ts
  - apps/web/src/viteProxy.test.ts
  - apps/web/src/pages/MqttSettings/index.test.ts
  - solar_mqtt_go/build_test.go
  - apps/web/src/components/AppHeader.test.ts
  - packages/shared/src/freshnessPolicy.test.ts
  - solar_mqtt_go/internal/service/control_contract_test.go
  - apps/web/src/pages/DisplayPagesEditor/dataInspectorScopeOptions.test.ts
  - apps/server/src/services/MetricHistoryRetentionService.test.ts
  - apps/web/src/pages/DataHub/SharedInfrastructureBanner.test.tsx
  - apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts
  - apps/server/src/services/householdEquivalenceService.test.ts
  - apps/server/src/routes/metric-provenance.test.ts
  - packages/shared/src/siteEnergyProfile.test.ts
  - apps/server/src/routes/meter-sources.test.ts
  - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - tests/browser/critical-journeys.spec.ts
  - apps/web/src/pages/Overview/widgets/PhasePowerTableWidget.test.tsx
  - apps/server/src/routes/settings-mqtt.test.ts
  - solar_mqtt_go/internal/storage/storage_test.go
  - apps/server/src/routes/sustainability-story.test.ts
  - apps/web/src/hooks/useDisplayStoryRuntime.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionsView.test.tsx
  - apps/server/src/routes/display-pages.test.ts
  - apps/web/src/pages/MqttSettings/loadModel.test.ts
  - packages/shared/src/unsavedBindingPreview.test.ts
  - packages/shared/src/mqttMappingBatch.test.ts
  - apps/web/src/pages/Sustainability/configRender.test.ts
  - apps/server/src/routes/display-card-data.test.ts
  - apps/server/src/services/factoryGenerationAggregateService.test.ts
  - apps/server/src/routes/display-data-preview.test.ts
  - solar_mqtt_go/internal/scraper/scraper_test.go
  - apps/server/src/services/sustainabilityStoryService.test.ts
  - solar_mqtt_go/internal/webui/config_path_contract_test.go
  - apps/server/src/realtime/SocketService.test.ts
  - apps/web/src/pages/Overview/render.test.ts
  - apps/server/src/db/migrations/clKnGenerationSummaryTopics.test.ts
  - apps/server/src/services/mockMetricsFeedRegistryUsage.test.ts
  - apps/web/src/pages/DeviceStatus/layout.test.ts
  - apps/web/src/pages/DataHub/Connections/BrokerForm.test.tsx
  - apps/web/src/pages/DataHub/DerivedMetrics.test.tsx
  - apps/server/src/services/unpairedDisplayAccessRegistry.test.ts
  - solar_mqtt_go/internal/anomaly/anomaly_test.go
  - apps/server/src/routes/data-source.test.ts
  - apps/web/src/hooks/useFreshnessState.test.ts
  - apps/web/src/pages/runtimeRefreshRegistry.test.ts
  - apps/server/src/services/displayDataPreviewCache.test.ts
  - apps/web/src/pages/Sustainability/viewModel.test.ts
  - apps/web/src/pages/runtimeConfigHydration.test.ts
  - apps/web/src/pages/MqttSettings/viewModel.test.ts
  - apps/server/src/db/migrations/derivedMetricRegistry.test.ts
  - apps/server/src/routes/brand.test.ts
  - apps/web/src/pages/DataHub/Usage.test.tsx
  - apps/server/src/mqtt/metricKeyIngestion.test.ts
  - apps/web/src/pages/FactoryCircuit/viewModel.test.ts
  - packages/shared/src/derivedMetric.test.ts
  - apps/server/src/services/MetricResolver.test.ts
  - apps/web/src/hooks/usePageRotation.test.ts
  - apps/web/src/pages/DataHub/SiteEnergySetupPanel.test.tsx
  - apps/web/src/pages/managementDisplaySync.test.ts
  - apps/web/src/pages/DataHub/MetricDetailsModel.test.ts
  - packages/shared/src/guidedMqttMapping.test.ts
  - solar_mqtt_go/internal/tray/logfile_test.go
  - apps/server/src/routes/mqtt-captures.test.ts
  - packages/shared/src/displayPageFreshness.test.ts
  - apps/server/src/services/displayPublishEnergyScopes.test.ts
  - apps/web/src/pages/MqttSettings/MqttSettingsContent.test.ts
  - apps/web/src/pages/FactoryCircuit/runtimeIsolation.test.tsx
  - apps/server/src/routes/metrics-inventory.test.ts
  - apps/server/src/logger.test.ts
  - apps/web/src/pages/DeviceFleet/route.test.ts
  - apps/web/src/pages/DataHub/GuidedOnboardingPanel.test.tsx
  - apps/server/src/services/displayReadinessService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/index.test.tsx
  - solar_mqtt_go/internal/tray/instance_windows_test.go
  - apps/web/src/pages/DeviceStatus/viewModel.test.ts
  - packages/shared/src/guidedSiteEnergySetup.test.ts
  - packages/shared/src/metricScope.test.ts
  - apps/web/src/components/ManagementUnlockScreen.test.tsx
  - packages/shared/src/sourceMutationImpact.test.ts
  - solar_mqtt_go/internal/discovery/discovery_test.go
  - apps/web/src/hooks/useSafeAppUpdate.test.ts
  - apps/web/src/pages/DataHub/index.test.tsx
  - apps/server/src/mqtt/SolarSourceAdapter.test.ts
  - apps/server/src/routes/device-pairing.test.ts
  - apps/server/src/services/mqttObservationCatalogService.test.ts
  - apps/server/src/routes/device-group-management.test.ts
  - apps/server/src/plugins/managementAuth.test.ts
  - apps/web/src/pages/Images/configRender.test.ts
  - apps/web/src/pages/DataHub/Sources.test.tsx
  - solar_mqtt_go/internal/tray/app_test.go
  - packages/shared/src/mqttTestPublish.test.ts
  - apps/server/src/mqtt/MqttClientService.test.ts
  - solar_mqtt_go/main_test.go
  - apps/web/src/hooks/liveMetricsStore.test.ts
  - apps/server/src/services/energyAuthoringJourney.test.ts
  - apps/server/src/config.test.ts
  - apps/web/src/pages/DisplayPagesEditor/activeSurfaceRecompute.test.ts
  - packages/shared/src/energyAuthoringJourney.test.ts
  - apps/web/src/pages/PlaybackProfiles/viewModel.test.ts
  - apps/server/src/routes/metrics-history.test.ts
  - apps/server/src/services/playbackMetricAuthorizationService.test.ts
  - apps/web/src/hooks/useOfflinePlaybackSnapshot.test.ts
  - apps/server/src/services/siteEnergyProfileSourceReview.test.ts
  - apps/web/src/hooks/useDisplayClientHeartbeat.test.ts
  - apps/web/src/pages/DisplayPagesEditor/editorStaging.test.tsx
  - apps/web/src/pages/DataHub/Metrics.test.tsx
  - apps/web/src/pages/DataHub/WeatherModel.test.ts
  - apps/web/src/pages/DataSourceSettings/index.test.tsx
  - packages/shared/src/metricPicker.test.ts
  - apps/web/src/components/AppFooterNav.icons.test.tsx
  - packages/shared/src/periodConsumption.test.ts
  - apps/web/src/pages/DisplayPagesEditor/EditorToolbar.test.tsx
  - apps/web/src/pages/DataHub/Diagnostics.test.tsx
  - apps/server/src/services/deviceProfileRolloutService.test.ts
  - solar_mqtt_go/internal/mqttbus/bus_test.go
  - apps/server/src/routes/device.test.ts
  - apps/server/src/routes/energy-authoring-consumers.test.ts
  - apps/web/src/pages/DataHub/sectionState.test.tsx
  - apps/server/src/routes/management-auth.test.ts
  - apps/server/src/services/derivedMetricExpression.test.ts
  - apps/web/src/pages/DataHub/DiagnosticsModel.test.ts
  - packages/shared/src/ephemeralPreviewState.test.ts
  - apps/web/src/hooks/displayPageDraftSession.test.ts
  - apps/web/src/pages/DataHub/Weather.test.tsx
  - apps/server/src/services/MockMetricsFeedService.test.ts
  - apps/web/src/pages/PlaybackProfiles/index.test.ts
  - packages/shared/src/mqttObservation.test.ts
  - apps/server/src/routes/images.test.ts
  - apps/server/src/services/MetricsAccumulatorService.test.ts
  - apps/web/src/hooks/usePlaybackController.test.ts
  - packages/shared/src/monthlyConsumptionSeries.test.ts
  - apps/server/src/services/guidedMqttMappingService.test.ts
  - solar_mqtt_go/internal/config/applyset_test.go
  - packages/shared/src/guidedOnboarding.test.ts
  - apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx
  - apps/server/src/services/sourceImpactService.test.ts
  - apps/web/src/pages/Images/viewModel.test.ts
  - apps/web/src/pages/FactoryCircuit/index.source.test.ts
  - apps/server/src/services/periodConsumptionService.test.ts
  - apps/web/src/components/shellFoundation.test.ts
  - apps/server/src/services/SnapshotWriterService.test.ts
  - apps/web/src/app/router.test.ts
  - apps/web/src/pages/DataHub/Connections/ConnectionStatusCard.test.tsx
  - apps/server/src/routes/site-energy-profiles.test.ts
  - apps/web/src/services/socket.test.ts
  - apps/server/src/plugins/deviceContext.test.ts
  - apps/web/src/pages/DisplayPagesEditor/MetricPicker.test.tsx
  - packages/shared/src/displayStory.test.ts
  - apps/server/src/routes/display-story.test.ts
  - apps/server/src/routes/display-readiness.test.ts
  - packages/shared/src/displayPublishPreflight.test.ts
  - apps/web/src/pages/Overview/viewModel.test.ts
  - solar_mqtt_go/assets/assets_test.go
  - apps/server/src/mqtt/MqttDiscoveryService.test.ts
  - apps/server/src/routes/freshness-policy.test.ts
  - apps/server/src/services/deviceLivenessRegistry.test.ts
  - solar_mqtt_go/config_path_contract_test.go
  - solar_mqtt_go/internal/service/service_test.go
  - apps/web/src/pages/DataSourceSettings/derivedMetricPreviewScope.test.ts
  - apps/server/src/routes/playback.test.ts
  - apps/web/src/pages/DataHub/sourceWorkspace.test.ts
  - apps/web/src/services/api.test.ts
  - apps/server/src/services/DailySummaryService.test.ts
  - apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx
  - apps/web/src/sw.test.ts
  - solar_mqtt_go/internal/mosquitto/mosquitto_test.go
  - packages/shared/src/departmentEnergyShares.test.ts
  - apps/web/src/pages/DeviceFleet/contracts.test.ts
  - apps/web/src/pages/FactoryCircuit/configRender.test.ts
  - apps/server/src/services/mqttMeterIngest.test.ts
  - apps/server/src/db/migrations/scopeLiveMetricsMigration.test.ts
  - solar_mqtt_go/internal/config/config_test.go
  - apps/web/src/pages/Solar/runtimeIsolation.test.tsx
  - apps/server/src/routes/metric-usage.test.ts
  - apps/server/src/metrics/liveMetrics.test.ts
  - apps/web/src/app/dataHubCompatibility.test.ts
  - apps/server/src/routes/device-context-playback.test.ts
  - apps/server/src/app.test.ts
  - apps/server/src/services/derivedMetricRegistryService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/workspaceLayout.test.ts
  - apps/web/src/services/profileRollout.test.ts
  - solar_mqtt_go/internal/heartbeat/heartbeat_test.go
  - apps/web/src/pages/DataHub/links.test.ts
  - apps/server/src/services/managementSessionService.test.ts
  - apps/server/src/db/migrations/calculationSettings.test.ts
  - solar_mqtt_go/internal/display/display_test.go
  - solar_mqtt_go/internal/mqttbus/control_contract_test.go
  - apps/web/src/hooks/useSustainabilityStoryRuntime.test.ts
  - apps/server/src/services/displayStoryTopicNames.test.ts
  - apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts
  - apps/web/src/pages/DeviceFleet/loadModel.test.ts
  - tests/browser/offline-playback.spec.ts
  - apps/web/src/layouts/brandBootstrap.test.ts
  - apps/web/src/pages/DeviceFleet/viewModel.test.ts
  - apps/web/src/pages/Overview/configRender.test.tsx
  - apps/web/src/pages/CircuitSettings/viewModel.test.ts
  - apps/server/src/services/playbackProfileGovernanceService.test.ts
  - apps/web/src/pages/DisplayPagesEditor/PublishReviewDrawer.test.tsx
  - apps/web/src/pages/DisplayPagesEditor/dataBindingCapability.test.ts
  - apps/web/src/pages/DataHub/TaskHome.test.tsx
  - apps/web/src/pages/EnergyTrend/viewModel.test.ts
  - apps/web/src/pages/EnergyHistory/index.test.ts
  - apps/web/src/recovery/installCrashRecovery.test.ts
  - apps/server/src/services/meterSourceCatalogService.test.ts
  - apps/web/src/pages/Solar/viewModel.test.ts
  - apps/server/src/services/freshnessPolicyService.test.ts
  - apps/web/src/services/displayRuntimeSyncReporter.test.ts
-->