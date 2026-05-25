## 1. Effect contract

- [x] 1.1 Implement **Separate effect controls from raw page CSS** so **Supported hero and media surfaces store bounded display effect settings** persists structured effect groups for supported hero or media surfaces instead of CSS-only assumptions, and verify with config or resolver coverage plus `pnpm --filter @solar-display/web test`.
- [x] 1.2 [P] Implement **Use token-aware effect presets plus bounded numeric controls** so **Supported hero and media surfaces store bounded display effect settings** exposes bounded fade, blur, and overlay-style values with safe defaults, and verify with effect-config-focused tests plus `pnpm --filter @solar-display/web test`.

## 2. Resolver 與媒體整合

- [x] 2.1 Implement **Keep runtime and editor preview on the same effect resolver** so **Editor preview and playback runtime resolve the same display effect settings** applies the same hero or media effect logic in both authoring and playback routes, and verify with preview/runtime parity coverage plus `pnpm --filter @solar-display/web test`.
- [x] 2.2 Implement **Scope first-wave effect controls to seeded hero or media surfaces** so **Provide per-binding media placement controls for display pages** combines placement and supported effect settings on the same media surfaces without widening to arbitrary regions, and verify with page-config or inspector coverage plus `pnpm --filter @solar-display/web test`.
- [x] 2.3 [P] Implement safe resolver fallbacks so **Effect settings fall back safely when values or surfaces are unsupported** clamps or resets unsupported effect payloads without hiding the hero or media surface, and verify with fallback-focused resolver coverage plus `pnpm --filter @solar-display/web test`.

## 3. 驗證

- [x] 3.1 Run `pnpm --filter @solar-display/web test` and `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` to confirm the effect control schema, resolver, and placement integration compile and pass their targeted coverage.
- [x] 3.2 Run `spectra validate --strict --changes add-display-page-effect-controls` to confirm the display effect artifacts remain internally consistent.
