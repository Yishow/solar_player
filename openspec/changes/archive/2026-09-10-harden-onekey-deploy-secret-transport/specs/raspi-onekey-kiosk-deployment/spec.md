## MODIFIED Requirements

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
