## Context

The application currently persists operator settings and runtime state in SQLite, stores image files under uploads/images, stores brand files under uploads/brand, reads live values from MQTT or mock mode, reads weather from CWA when configured, and keeps a small amount of browser-local cache for UI recovery. Operators do not have a single page that explains those sources, their paths, data volumes, or where to manage them.

The user asked for a settings page about database sources that includes current functionality and recommended future functionality. The repo does not currently have an external DB connector for this product, so this design presents current sources and recommendations without pretending external DB setup exists.

## Goals / Non-Goals

**Goals:**

- Add /settings/data-source as a management route.
- Add a read-only, management-protected diagnostics API for runtime data source summary.
- Show SQLite path, data dir, upload dirs, table counts, file counts, MQTT mode/status summary, weather configuration state, retention settings, and browser-local cache note.
- Provide links to existing settings pages and Device Status.
- Present recommended next features without implementing external DB connectors.
- Redact all secrets.

**Non-Goals:**

- Do not implement PostgreSQL, MySQL, or remote DB connectors.
- Do not migrate SQLite data or change runtime persistence.
- Do not expose MQTT password, CWA authorization, management access token, or raw .env contents.
- Do not add write controls to this diagnostics page.

## Decisions

### Use a read-only diagnostics API behind the management boundary

The page needs server-known paths and SQLite table counts, which the browser cannot reliably infer. A dedicated GET endpoint keeps the payload read-only and can reuse the existing management access boundary. This is preferable to embedding path guesses in the frontend or reading only env metadata at build time.

### Return partial diagnostics instead of failing the whole page

Independent summaries can fail separately, such as upload directory listing or SQLite table count reads. The API returns section-level availability with warnings so the page can tell the operator which source is unavailable. This follows existing management diagnostics behavior and avoids blank pages during degraded runtime.

### Redact secrets by category rather than masking raw values

The diagnostics payload must not include secret strings, even masked passwords that imply length or source text. For secret-backed settings, return status values such as configured, missing, masked, or unavailable. This keeps the page useful without expanding sensitive read surface.

### Keep recommendations informational

The recommendation section clearly distinguishes implemented controls from recommended future work. External DB connector evaluation belongs in a separate proposal because it affects schema, migration, credentials, safety defaults, and source selection behavior.

### Follow existing settings page loading style

The page renders a management settings surface that can show initial loading, degraded diagnostics, and action links. It does not introduce a new dashboard visual language or marketing layout. Route metadata and staged route loading follows existing management page patterns.

## Implementation Contract

Behavior:

- A trusted operator can open /settings/data-source and see current runtime source categories.
- If diagnostics are available, the page shows paths and counts for SQLite and uploads, non-secret MQTT/weather statuses, retention settings, browser-local cache notes, and links to related management pages.
- If diagnostics are degraded, the page remains visible and identifies unavailable sections.
- Untrusted callers cannot read the diagnostics API.
- The page does not offer external DB setup as an implemented feature.

Interfaces:

- GET /api/data-source/overview returns an object with sections for runtime storage, sqlite, uploads, mqtt, weather, retention, browserLocalCache, relatedRoutes, recommendations, and warnings.
- Section payloads include status fields so the UI can render ready, unavailable, or degraded states.
- Secret-backed settings return non-secret status only.
- Frontend route /settings/data-source is listed in route metadata with management shell density.

Failure modes:

- If SQLite count queries fail, the sqlite section is marked unavailable and the rest of the payload can still return.
- If upload directories are missing, upload sections show unavailable or empty states without throwing a full API error.
- If the caller is untrusted, the API returns the existing management denial envelope and no diagnostics content.

Acceptance criteria:

- Server tests cover trusted response shape, section degradation, table count summary, upload summary, and secret redaction.
- Server tests cover untrusted denial if the existing test harness supports management boundary classification.
- Frontend view-model tests cover ready, degraded, and no-secret rendering states.
- API service tests cover request path and response typing.
- Build and focused server/web tests pass.

Scope boundaries:

- In scope: read-only diagnostics endpoint, route registration, frontend page, view model, service typing, tests, route metadata.
- Out of scope: external DB connector setup, credential write APIs, DB migration, backup/restore implementation, changing existing MQTT/weather/settings pages.

## Risks / Trade-offs

- [Risk] Exposing filesystem paths expands operator-visible diagnostics. → Mitigation: protect with the management boundary and avoid secrets.
- [Risk] Operators can mistake recommendations for implemented features. → Mitigation: label recommendations as not active controls and link only to existing implemented pages.
- [Risk] Diagnostics can fail when DB is locked. → Mitigation: return section-level degraded state rather than page failure.

## Migration Plan

1. Add server diagnostics route and focused tests.
2. Add frontend API helper and route metadata.
3. Add DataSourceSettings page and view model tests.
4. Verify management navigation and direct route load.
5. Leave external DB connector work for a separate Spectra change if accepted later.

## Open Questions

- Whether the page eventually allows backup/restore execution is intentionally deferred to a future change after kiosk read-only behavior is stable.
