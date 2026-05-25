## 1. Page object contract

- [ ] 1.1 Implement **Store freeform objects inside page configuration envelopes** so **Store page freeform objects inside each display page draft and live config** persists page object lists together with each page draft or live config, and verify with shared or server contract coverage plus `pnpm --filter @solar-display/server test`.
- [ ] 1.2 [P] Implement **Reuse shared object schema with content-surface mounts only** so **Store page freeform objects inside each display page draft and live config** reuses the shared object vocabulary for `line`, `asset-image`, and `icon-asset`, and verify with shared schema coverage plus `pnpm --filter @solar-display/shared build`.

## 2. Runtime 與驗證

- [ ] 2.1 Implement **Render freeform objects as a dedicated content layer** so **Display pages render freeform objects in a dedicated content layer** shows valid page objects on Overview, Solar, FactoryCircuit, Images, and Sustainability without reassigning existing component ownership, and verify with page runtime tests plus `pnpm --filter @solar-display/web test`.
- [ ] 2.2 Implement **Validate bounds, sources, and deterministic order before publish** so **Page freeform object publish validation blocks invalid bounds and sources** rejects out-of-bounds objects and malformed asset payloads before live publish, and verify with validation coverage plus `pnpm --filter @solar-display/server test`.

## 3. 驗證

- [ ] 3.1 Run `pnpm --filter @solar-display/shared build`, `pnpm --filter @solar-display/server test`, `pnpm --filter @solar-display/web test`, and `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` to confirm the page freeform object runtime contract compiles and passes server and playback coverage.
- [ ] 3.2 Run `spectra validate --strict --changes add-display-page-freeform-object-runtime` to confirm the page freeform object runtime artifacts remain internally consistent.
