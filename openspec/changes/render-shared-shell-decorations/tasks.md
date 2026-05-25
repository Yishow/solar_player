## 1. Runtime 讀取與掛載

- [ ] 1.1 Implement **Read live shell decorations through one shell runtime loader** so **Render shared shell decoration objects inside playback and management shell bands** feeds both shell families from the same live payload, and verify with new hook or loader tests plus `pnpm --filter @solar-display/web test`.
- [ ] 1.2 Implement **Mount header and footer object layers inside existing shell bands** so **Render shared shell decoration objects inside playback and management shell bands** draws `line`, `asset-image`, and `ornament-image` objects at stable FHD coordinates in both shells, and verify with shell render coverage plus `pnpm --filter @solar-display/web test`.

## 2. 互動保護與 fallback

- [ ] 2.1 Implement **Keep shell decoration layers passive to shell interactions** so **Shell decoration layers preserve deterministic order without blocking shell interactions** respects saved z-order without stealing interaction from brand, status, weather, or navigation chrome, and verify with component assertions plus `pnpm --filter @solar-display/web test`.
- [ ] 2.2 [P] Implement **Fallback cleanly when no live decorations exist** so **Shell decoration rendering falls back cleanly when live data or assets are unavailable** skips missing assets and preserves shell chrome under empty or degraded data, and verify with fallback-focused tests plus `pnpm --filter @solar-display/web test`.

## 3. 驗證

- [ ] 3.1 Run `pnpm --filter @solar-display/web test` and `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` to confirm shell decoration runtime rendering compiles and passes its playback and management coverage.
- [ ] 3.2 Run `spectra validate --strict --changes render-shared-shell-decorations` to confirm the runtime rendering handoff remains consistent with the shared shell decoration artifacts.
