## 1. Schema 與儲存契約

- [x] 1.1 Implement **Keep shell decorations in a dedicated shared envelope** so **Store shared shell decoration objects separately from page configs** persists deterministic `draft` and `live` shell decoration envelopes with independent `headerObjects` and `footerObjects`, and verify with new service or route cases plus `pnpm --filter @solar-display/server test`.
- [x] 1.2 [P] Implement **Reuse one base display object shape across shell and future page objects** so **Shell decoration objects use a shared base object schema** exports typed shared contracts for `line`, `asset-image`, and `ornament-image`, and verify with new shared contract coverage plus `pnpm --filter @solar-display/shared build`.

## 2. 驗證與讀取邊界

- [x] 2.1 Implement **Validate shell objects against header/footer bands before publish** so **Shell decoration publish validation enforces band-safe geometry and supported sources** rejects band overflow, unsupported types, malformed source payloads, duplicate IDs, or unstable ordering, and verify with validation-focused server tests plus `pnpm --filter @solar-display/server test`.
- [x] 2.2 [P] Implement **Expose deterministic default seed and public-safe read contract** so runtime and editor consumers can read stable shell decoration payloads without mutating page configs, and verify with read-path route or service cases plus `pnpm --filter @solar-display/server test`.

## 3. 驗證

- [x] 3.1 Run `pnpm --filter @solar-display/shared build` and `pnpm --filter @solar-display/server test` to confirm the shared shell decoration schema, persistence, and validation contracts compile and pass their targeted suites.
- [x] 3.2 Run `spectra validate --strict --changes add-shared-shell-decoration-schema` to confirm the proposal, spec, and task handoff for shared shell decorations remains consistent.
