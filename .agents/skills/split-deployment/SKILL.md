---
name: split-deployment
description: Deploy or migrate Solar Player split topology — Windows PC server, Pi thin browser kiosk, and co-located Pi migration — transferring only runtime-necessary files (never the full repo).
---

# Split Deployment (PC server + Pi thin kiosk)

Use this skill for the **split topology**: Solar Player server runs on a Windows PC; Raspberry Pi 5 units are browser-only thin kiosks. Coexists with `pi5-deployment` and **must not** modify that skill or the existing co-located deploy scripts.

## Hard boundary — do not modify existing deployment

| Allowed | Forbidden |
|---|---|
| `deploy/install-thin-kiosk.sh` | Editing `deploy/install-kiosk.sh` |
| `deploy/verify-thin-kiosk.sh` | Editing `deploy/verify-kiosk-install.sh` |
| `deploy/solar-device-agent.py` + `.service` | Editing `deploy/solar-display.service` |
| `docs/runbooks/pc-server-deploy.md` | Editing `pi5-deployment` skill |
| `docs/runbooks/pi-thin-kiosk-deploy.md` | Editing one-key / bootstrap scripts |
| `DEVICE_AGENT_URL` on the PC server (opt-in) | Removing co-located Pi installs automatically |
| Lean file transfer (below) | Shipping the full monorepo (docs/, openspec/, .git, node_modules, artifacts) |

Keep operation-time IPs and secrets in the shell / operator `.env` — never commit them.

---

## Lean transfer (required) — never ship the whole repo

Full checkout is multi‑GB (`docs/`, `openspec/`, images, archives). **Do not** rsync/tar the repo root.

### PC server — necessary set

**Preferred path (fast, reliable on Windows):**

1. On a **dev Mac/Linux** with the worktree:
   - `pnpm install && pnpm build` (or at least `build:shared` + web `vite build` + `build:server`)
   - Copy operator `.env` separately (never invent secrets)
2. Transfer only:

```text
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
tsconfig.base.json          # if packages reference it
apps/server/package.json
apps/server/tsconfig.json
apps/server/src/            # or only apps/server/dist/ after build
apps/server/dist/           # REQUIRED to run without Windows tsc
apps/web/package.json
apps/web/dist/              # REQUIRED production static assets
packages/shared/            # source + dist after build
docs/openapi.yaml           # server OpenAPI path
scripts/dev-lib.mjs         # only if rebuilding web on the PC
.env                        # operator file, scp separately
```

3. On the PC (once):
   - Node LTS + `corepack enable` + `pnpm`
   - `pnpm install --frozen-lockfile` in the install root (builds Windows `better-sqlite3`)
   - Ensure `HOST=0.0.0.0` and `PORT=3000` in `.env` for LAN access
   - Create `data/`, `logs/`, `uploads/images`, `uploads/brand`
   - Inbound firewall TCP **3000**
   - Start: `node apps/server/dist/server.js` from install root  
     Production-hardening option: nssm (see runbook) — optional for smoke “just runs”

**Do not transfer:**

- `docs/reference/**` (except nothing — web assets are already in `apps/web/dist`)
- `openspec/`, `.git/`, `artifacts/`, `node_modules/` from Mac
- AppleDouble `._*` files (`COPYFILE_DISABLE=1` when tarring on macOS)

Example lean pack from Mac:

```bash
export COPYFILE_DISABLE=1
tar -czf /tmp/solar_pc_runtime.tgz \
  --exclude='node_modules' --exclude='.DS_Store' \
  package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json \
  apps/server/package.json apps/server/dist apps/server/src \
  apps/web/package.json apps/web/dist \
  packages/shared docs/openapi.yaml
# scp tarball + scp .env separately
```

### Pi thin-kiosk — necessary set

Only the **deploy helpers** (not the monorepo app):

```text
deploy/install-thin-kiosk.sh
deploy/verify-thin-kiosk.sh
deploy/start-solar-kiosk.sh          # reused unmodified
deploy/stop-solar-kiosk.sh
deploy/solar-device-agent.py
deploy/solar-device-agent.service
deploy/read-solar-display-journal.sh # copied by installer, not edited
deploy/configure-pi5-fan-control.sh
deploy/disable-display-sleep.sh
deploy/readonly-system-enable.sh
deploy/readonly-system-disable.sh
deploy/enable-readonly-system.desktop
deploy/disable-readonly-system.desktop
deploy/configure-lightweight-desktop.sh  # fresh Pi only
```

No Node/pnpm/SQLite on thin kiosk.

---

## Phase 1 — PC server

**Goal:** PC serves `http://<PC_IP>:3000` (health + overview HTML).

1. Lean-transfer runtime set (above).
2. `scp` operator `.env` → install-root `.env`; force `HOST=0.0.0.0` if missing.
3. `pnpm install` once on Windows (native modules).
4. Prefer prebuilt `apps/*/dist` from dev machine; avoid full `pnpm build` on Windows unless assets + `tsconfig` tree are complete.
5. Firewall inbound TCP 3000.
6. Start process (node or nssm). Device Status **app logs unavailable on Windows** (no journald) — expected.

### Phase 1 completion gate

- `curl http://127.0.0.1:3000/health` → 200
- From another host: `curl http://<PC_IP>:3000/health` → 200 and `Accept: text/html` `/overview` → 200
- Supported verify: build/server/web stages when tooling allows; full `pnpm verify` optional (Git Bash + sqlite3)
- nssm = production option; smoke gate is **process up + health/overview**, not “must nssm” for lean smoke

Do **not** start Phase 2 until Phase 1 gate passes.

---

## Phase 2 — New Pi thin kiosk

**Goal:** Pi Firefox kiosk opens `http://<PC_IP>:3000/overview`.

1. PC first (or accept extended `KIOSK_WAIT_SECONDS`, default 600).
2. Fresh Pi: `configure-lightweight-desktop.sh` first.
3. Disable readonly if needed; reboot; install.
4. Copy **only** the Pi necessary deploy files (above), then:

```bash
sudo ./deploy/install-thin-kiosk.sh \
  --kiosk-url "http://<PC_IP>:3000/overview" \
  --kiosk-user <u> \
  --server-allow-ip "<PC_IP>"
```

5. Verify with **`deploy/verify-thin-kiosk.sh` only**.
6. Reboot witness; set PC `DEVICE_AGENT_URL=http://<Pi_IP>:3001` and restart server.

### Phase 2 completion gate

- `verify-thin-kiosk.sh` OK
- Reboot witness with remote overview URL
- PC can `curl` Pi `:3001/stats`; non-allowlisted → 403

---

## Phase 3 — Migrate existing co-located Pi

One Pi at a time (canary first). Explicit confirmation:

```bash
sudo ./deploy/install-thin-kiosk.sh \
  --kiosk-url "http://<PC_IP>:3000/overview" \
  --kiosk-user <u> \
  --server-allow-ip "<PC_IP>" \
  --migrate --confirm-migrate
```

Stops+disables `solar-display.service` without deleting files. Verify with thin verifier.

### Rollback

Re-enable **and start** `solar-display.service`, re-run unmodified `install-kiosk.sh` to repoint the kiosk back to `127.0.0.1:3000`, **and confirm the `/data/solar-display` runtime is intact** — DB, `.env`, `uploads/`, `logs/` present and the co-located service reaches ready. Re-enabling the service alone is insufficient: the kiosk URL must be repointed and the untouched `/data/solar-display` runtime verified before declaring rollback complete. Confirm with `verify-kiosk-install.sh`.

---

## What this skill never does

- Transfer full monorepo or Mac `node_modules`
- Modify legacy co-located deploy scripts / `pi5-deployment`
- Install Node on thin kiosk
- Claim FHD closeout without `pnpm run fhd:witness -- --base-url http://<PC_IP>:3000`

## Related

- `docs/runbooks/pc-server-deploy.md`
- `docs/runbooks/pi-thin-kiosk-deploy.md`
- `.agents/skills/pi5-deployment/SKILL.md` (legacy / rollback)
