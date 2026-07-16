## Context

Raspberry Pi one-key deployment already targets Ubuntu 24.04 arm64, performs host/disk preflight, uploads a bundle, runs `deploy/raspi-bootstrap.sh`, and finishes with `deploy/verify-kiosk-install.sh`. The verifier currently accepts a machine without Tailscale and only checks `tailscaled` when the CLI happens to exist. Live deployment proved that installing the package and starting the daemon is distinct from joining a tailnet: before enrollment the expected control-plane state is `NeedsLogin`, and the Pi cannot select its own tailnet IP.

This change spans bootstrap package installation, final verification, dry-run reporting, deployment tests, and operator documentation. It must also respect the readonly-root lifecycle: a package first installed into an active overlay would not be a durable prerequisite.

## Goals / Non-Goals

**Goals:**

- Make the Tailscale CLI and enabled/active `tailscaled.service` required outcomes of init and update deployment.
- Use Tailscale's official Ubuntu stable apt repository for Ubuntu 24.04 Noble instead of executing a downloaded shell installer.
- Keep installation idempotent and preserve an already enrolled node's state.
- Fail before application replacement when the prerequisite cannot be made durable.
- Explain enrollment and operation-time host selection without storing credentials or fixed Pi addresses.

**Non-Goals:**

- Run `tailscale up` automatically.
- Store or accept reusable auth keys in repository scripts, environment examples, logs, or artifacts.
- Request, predict, or hardcode a control-plane-assigned Tailscale IP.
- Change tailnet ACLs, DNS, routes, exit-node settings, SSH policy, or the existing hotspot trigger behavior.
- Support distributions other than the one-key contract's Ubuntu 24.04 arm64 target.

## Decisions

### Install through a dedicated idempotent prerequisite helper

Create `deploy/install-tailscale.sh` as a root-only helper. It reads Ubuntu identity from `/etc/os-release`, requires Ubuntu 24.04 with codename `noble`, and uses the official Noble keyring and apt source endpoints under `pkgs.tailscale.com`. Downloads go to temporary files and are installed only after successful non-empty responses. The helper installs `curl` and `ca-certificates` when needed, installs the `tailscale` package, and runs systemctl enable --now for `tailscaled.service`.

A dedicated helper keeps external-repository behavior testable without adding flags or package logic to the application installer. Executing the vendor's curl-to-shell installer was rejected because repository/keyring steps provide a narrower and auditable trust boundary.

The root bundle builder copies the helper into online and offline bundles, marks it executable, and treats a missing source helper as a bundle preflight failure so the remote bootstrap cannot receive an incomplete prerequisite payload.

### Run the prerequisite before application replacement

`deploy/raspi-bootstrap.sh` invokes the staged helper after host/disk preflight and before the update backup/application replacement sequence. A missing helper, unsupported host, repository failure, package failure, or service enable/start failure exits nonzero and prevents application replacement.

If Tailscale is already installed, enabled, and active, the helper exits successfully without changing repository files or node enrollment. If the CLI is absent or the service is not durably enabled while `/` is an active overlay filesystem, the helper fails with guidance to disable readonly root and reboot before retrying. This avoids reporting a package installed only in a transient overlay.

### Verify local readiness without requiring enrollment

`deploy/verify-kiosk-install.sh` requires the `tailscale` executable, requires `tailscaled.service` to be enabled, and requires it to be active. It does not require a Tailscale IP or a logged-in backend state. `NeedsLogin` is therefore a valid post-install handoff, while missing/disabled/inactive daemon state is a deployment failure.

This separates the repo-owned prerequisite from administrator-owned tailnet authorization and keeps existing enrolled machine state untouched.

### Keep dry-run and documentation explicit

`scripts/raspi-onekey-deploy.sh --dry-run` reports that Tailscale installation and daemon enable/start would occur while retaining the existing guarantee that dry-run performs no package or service changes. `deploy.md` and `docs/runbooks/raspi-onekey-kiosk-deploy.md` document the enrollment handoff, state that the control plane assigns the IP, and use only operation-time placeholders such as `SSH_TARGET`.

## Implementation Contract

**Behavior:** Init and update deployment on supported Ubuntu 24.04 arm64 machines finish only when the Tailscale CLI exists and `tailscaled.service` is both enabled and active. Existing installed/enrolled machines remain enrolled. A fresh machine can finish in `NeedsLogin`, after which the operator explicitly enrolls it and uses the resulting MagicDNS name or assigned IP as the next operation's target.

**Helper interface:** `deploy/install-tailscale.sh` takes no auth material and is run as root. It returns zero only when the local package and daemon prerequisite is ready. It returns nonzero with a step-specific error for non-root execution, unsupported OS/codename, active readonly overlay requiring persistent installation, failed official key/source download, apt failure, or daemon enable/start failure.

**Bootstrap ordering:** The bootstrap invokes the helper before update backup and application replacement. Dry-run describes the stage and invokes neither the helper nor package/service commands.

**Verification:** The kiosk verifier aggregates a Tailscale failure when the CLI is absent, the unit is not enabled, or the unit is not active. It does not fail solely because the node is `NeedsLogin` or has no Tailscale IP.

**Acceptance criteria:** Deployment fixtures prove missing-install, idempotent-ready, readonly rejection, online/offline bundle inclusion and executable mode, service readiness, dry-run, and verifier failure cases. The complete `scripts/deploy.test.mjs` suite and `pnpm verify` pass. Spectra analysis has no Critical or Warning findings, and Spectra validation passes.

**In scope:** Official stable repository setup for Noble, package installation, daemon enable/start, bootstrap ordering, readiness verification, dry-run output, and deployment documentation.

**Out of scope:** Automated login, auth-key transport, fixed tailnet IP assignment, ACL/DNS/routes policy, browser choice, xRDP, Deskflow, hotspot switching, and live tailnet administration.

## Risks / Trade-offs

- [Official package endpoints or distribution support change] → Keep endpoint construction isolated in one helper and cover the Noble URLs in tests and operator errors.
- [Package installation on active overlay appears successful but disappears after reboot] → Reject first-install or missing-enable work on overlay and direct the operator through readonly disable plus reboot.
- [Making Tailscale mandatory makes deployment depend on external repository reachability] → Fail before application replacement with a specific prerequisite error; an existing ready installation remains offline-idempotent.
- [Operators confuse daemon readiness with enrollment] → Treat `NeedsLogin` as valid locally and document enrollment as a separate explicit handoff.
- [Automatic enrollment would leak credentials or alter existing node state] → The helper has no auth parameter and never invokes `tailscale up`.

## Migration Plan

1. Add failing deployment fixtures for helper behavior, bootstrap ordering, dry-run reporting, and verifier readiness.
2. Add the helper and bootstrap integration, then make the targeted tests pass.
3. Update operator documentation and run the full deployment and repository verification gates.
4. Existing machines with a ready daemon require no state migration; fresh or unready machines install/enable the prerequisite on the next writable-root deployment.
5. Rollback removes the bootstrap invocation and restores optional verifier behavior. Do not remove an installed Tailscale package or erase node state automatically.

## Open Questions

None. Tailnet enrollment method and assigned address are intentionally operation-time administrator decisions.
