## 1. Deploy contract tests

- [x] 1.1 Add RED coverage in scripts/deploy.test.mjs proving deploy bundles include deploy/verify-kiosk-install.sh and deploy/enable-readonly-root.sh with executable permissions; verifies the Use /data/solar-display as the kiosk install root decision through the bundle-shape regression command node scripts/deploy.test.mjs.
- [x] 1.2 Add RED shell/fixture coverage proving Install both autostart and desktop launchers from one launcher definition: install-kiosk.sh installs Solar Display Kiosk to autostart and Desktop paths for KIOSK_USER=kz; verify with node scripts/deploy.test.mjs or a focused fixture command documented in that test.

## 2. Kiosk installer and launcher behavior

- [x] 2.1 Implement Install Raspberry Pi kiosk runtime under the data volume by making deploy/install-kiosk.sh derive WorkingDirectory, EnvironmentFile, DATA_DIR, LOG_DIR, ReadWritePaths, and runtime directories from INSTALL_DIR=/data/solar-display; verify with the tests from 1.1 and shell syntax check bash -n deploy/install-kiosk.sh.
- [x] 2.2 Implement Provide a desktop re-entry launcher after kiosk exit and Install a concrete desktop re-entry target for kiosk exit guidance by installing the launcher template to both autostart and Desktop, setting owner/executable permissions, and using the configured start helper path; verify with the tests from 1.2 and manual file assertions on the target host.
- [x] 2.3 Preserve Keep kiosk exit and re-entry bounded to fixed helpers by ensuring launcher and Device Status guidance use deploy/start-solar-kiosk.sh and deploy/stop-solar-kiosk.sh without accepting arbitrary web-provided commands; verify with existing apps/server/src/routes/device.test.ts and focused source review of the kiosk exit service contract.

## 3. Read-only hardening and verification helpers

- [x] 3.1 Implement Harden root filesystem writes while preserving runtime writes and Gate read-only hardening behind runtime write verification through deploy/enable-readonly-root.sh, gated by writable /data/solar-display checks for the kiosk user before any root write restriction changes; verify with bash -n deploy/enable-readonly-root.sh and dry-run or fixture assertions that missing/unwritable runtime paths exit non-zero.
- [x] 3.2 Implement Verify kiosk boot, exit, re-entry, and runtime storage through deploy/verify-kiosk-install.sh, checking service state, health endpoint, autostart launcher, Desktop launcher, and runtime storage under INSTALL_DIR; verify with bash -n deploy/verify-kiosk-install.sh and a target-host run after deploy.
- [x] 3.3 Apply the Verify before and after reboot decision by documenting and running the target sequence on kz@192.168.31.166: install to /data/solar-display, run verify, exit kiosk, click desktop launcher, enable read-only hardening, reboot, rerun verify; verification evidence is the command output and health endpoint result.

## 4. Final gates

- [x] 4.1 Run package verification for deploy tooling: node scripts/deploy.test.mjs, bash -n deploy/install-kiosk.sh deploy/start-solar-kiosk.sh deploy/stop-solar-kiosk.sh deploy/verify-kiosk-install.sh deploy/enable-readonly-root.sh, and spectra validate harden-raspberry-pi-kiosk-readonly-deploy.
- [x] 4.2 Run graphify update . after code changes and record any graph update limitation separately from product verification.
