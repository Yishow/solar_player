## 1. Backend diagnostics contract

- [x] 1.1 Write RED server tests for Provide a management-protected diagnostics API covering trusted success response, untrusted denial, SQLite count summary, upload summary, section-level degradation, and Redact secrets from data source diagnostics; verify with cd apps/server && node --import tsx --test src/routes/data-source.test.ts.
- [x] 1.2 Implement Use a read-only diagnostics API behind the management boundary with GET /api/data-source/overview returning runtime storage, sqlite, uploads, mqtt, weather, retention, browserLocalCache, relatedRoutes, recommendations, and warnings sections; verify with cd apps/server && node --import tsx --test src/routes/data-source.test.ts.
- [x] 1.3 Implement Return partial diagnostics instead of failing the whole page by marking failed SQLite or upload sections unavailable while preserving other sections; verify with the degradation cases in src/routes/data-source.test.ts.
- [x] 1.4 Implement Redact secrets from data source diagnostics and Redact secrets by category rather than masking raw values so MQTT password, management token, and CWA authorization values never appear in the response; verify with explicit negative assertions in src/routes/data-source.test.ts.

## 2. Frontend page and view model

- [x] 2.1 Write RED frontend view-model tests for Expose a read-only data source overview page covering ready, degraded, no-secret, related-route, and recommendation states; verify with cd apps/web && node --import tsx --test src/pages/DataSourceSettings/viewModel.test.ts.
- [x] 2.2 Implement Follow existing settings page loading style by adding /settings/data-source route metadata, route registration, API helper, and DataSourceSettings page with loading and degraded states; verify with the focused frontend tests and updated router/source tests.
- [x] 2.3 Implement Present recommendations without implementing new connectors and Keep recommendations informational by rendering runtime state export, database backup and restore, health check, and external database connector evaluation as recommendation items only; verify with view-model assertions that PostgreSQL/MySQL setup is not rendered as an active control.
- [x] 2.4 Add navigation actions from /settings/data-source to existing /settings/mqtt, /settings/images, /settings/playback, and /device-status pages without adding write controls; verify with view-model tests and source review of rendered actions.

## 3. Final gates

- [x] 3.1 Run focused server verification: cd apps/server && node --import tsx --test src/routes/data-source.test.ts.
- [x] 3.2 Run focused web verification: cd apps/web && node --import tsx --test src/pages/DataSourceSettings/viewModel.test.ts plus updated api/router tests.
- [x] 3.3 Run build verification with pnpm --filter @solar-display/server build and pnpm --filter @solar-display/web build, then spectra validate add-data-source-settings-overview.
- [x] 3.4 Run graphify update . after code changes and report any graph update limitation separately from product verification.
