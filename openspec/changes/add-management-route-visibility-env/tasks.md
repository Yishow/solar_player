## 1. Route visibility helper

- [x] 1.1 Write RED tests for Hide configured management routes from navigation covering VITE_HIDDEN_MANAGEMENT_ROUTES=/trends,/history, whitespace, empty segments, duplicates, unknown paths, and playback path ignoring; verify with cd apps/web && node --import tsx --test src/app/managementRouteVisibility.test.ts.
- [x] 1.2 Implement Resolve hidden routes through a dedicated helper in apps/web/src/app/managementRouteVisibility.ts so known management routes are filtered by exact normalized path and unknown/playback paths are ignored; verify with cd apps/web && node --import tsx --test src/app/managementRouteVisibility.test.ts.

## 2. Router and navigation integration

- [x] 2.1 Implement Use a build-time Vite environment setting for management route hiding by adding VITE_HIDDEN_MANAGEMENT_ROUTES to .env.example with /trends,/history and wiring import.meta.env through the helper; verify with source-level tests that default hidden routes are passed into route filtering.
- [x] 2.2 Implement Hide configured management routes from navigation in the management footer/nav path so 趨勢 and 歷史 are absent while other visible management routes remain; verify with focused React/source tests for AppFooterNav or ManagementShell route entries.
- [x] 2.3 Implement Redirect direct access to hidden management routes and Redirect hidden direct access before page mount for /trends and /history, selecting the first visible management route or /overview fallback; verify with router/source tests proving EnergyTrend and EnergyHistory elements are guarded when hidden.
- [x] 2.4 Implement Keep playback page enablement independent and Keep playback route enablement separate by ensuring VITE_HIDDEN_MANAGEMENT_ROUTES cannot hide /overview, /solar, /factory-circuit, /images, or /sustainability and does not mutate playback_pages.enabled; verify with managementRouteVisibility tests and no server DB migration changes.

## 3. Final gates

- [x] 3.1 Run focused web verification: cd apps/web && node --import tsx --test src/app/managementRouteVisibility.test.ts plus any updated router/navigation tests.
- [x] 3.2 Run broader web build verification with pnpm --filter @solar-display/web build and spectra validate add-management-route-visibility-env.
- [x] 3.3 Run graphify update . after code changes and report any graph update limitation separately from product verification.
