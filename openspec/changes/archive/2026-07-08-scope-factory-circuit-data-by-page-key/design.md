## Context

The page registry already registers `factory-circuit` and `factory-circuit-guanyin` as separate Factory Circuit page instances. The current circuit data path still treats all circuit slot bindings as global: `circuit_configs` has `display_slot` but no page scope, Factory Circuit story resolution iterates one fixed slot list, and Card Data Management builds rows from one aggregate `factoryCircuit` story payload.

This means Jungli can visually hide two load rows while the data model still expects the same eight slots as Guanyin. It also means same-name engineering areas cannot safely use the same metric key across sites because live values are keyed by `metric_key`.

## Goals / Non-Goals

**Goals:**

- Scope Factory Circuit circuit bindings by playback page key.
- Let `factory-circuit` use six visible Jungli engineering slots while `factory-circuit-guanyin` uses eight Guanyin engineering slots.
- Ensure Factory Circuit total power is computed only from the page-scoped slot set.
- Ensure readiness and Card Data Management use the same page-scoped slot set as playback.
- Preserve existing Circuit Settings compatibility for callers that still request all circuits.

**Non-Goals:**

- Do not redesign Factory Circuit visuals or editor geometry.
- Do not add a separate site management UI.
- Do not migrate non-Factory Circuit MQTT metrics to page-scoped keys.
- Do not change Sustainability, Overview, or Solar story semantics.

## Decisions

### Page key scopes Factory Circuit circuit data

Use the existing page key as the circuit scope instead of introducing a separate `site_key`. The route registry already distinguishes `factory-circuit` and `factory-circuit-guanyin`, and display editor configurations are keyed by page key. A separate site key would add mapping state without solving a current problem.

Alternative considered: add `site_key` and map pages to sites. Rejected for this change because it would require a new management model and migration path while page key already provides the needed identity.

### Circuit bindings keep display slot names but add page key

Add `page_key` to `circuit_configs`. The unique circuit identity becomes `(page_key, display_slot)` at the application level for enabled Factory Circuit bindings. Existing unscoped rows migrate to `factory-circuit`.

Alternative considered: create a new `factory_circuit_slots` table. Rejected for this change because `circuit_configs` already owns circuit name, topic, thresholds, order, and enabled state; splitting would increase joins and UI changes without immediate benefit.

### Factory Circuit metric keys are page-scoped where site separation matters

Factory Circuit slot metric keys SHALL be resolved from the page key and slot key. Jungli may keep legacy keys such as `factoryStampingPower` for compatibility. Guanyin SHALL use page-scoped keys such as `factoryCircuit.guanyin.stampingPower` so same-name engineering areas do not overwrite each other in live metric storage.

Alternative considered: reuse legacy metric keys for all pages and rely on topics only. Rejected because `live_metric_values.metric_key` is the storage identity.

### Card Data Management lists Factory Circuit page instances separately

Factory Circuit KPI and slot rows SHALL include the page key in their `cardId` and `pageId` where needed so operators can distinguish Jungli and Guanyin rows. Publish actions SHALL target the page-scoped metric key shown by that row.

Alternative considered: only show the currently selected Factory Circuit page. Rejected because the existing management request is about seeing and completing all card data from one workspace.

## Implementation Contract

The implementation SHALL deliver these observable behaviors:

- `GET /api/display-story/factory-circuit` returns a Factory Circuit payload whose slots and `totalPower` use only circuits scoped to `factory-circuit`.
- `GET /api/display-story/factory-circuit-guanyin` returns a Factory Circuit payload whose slots and `totalPower` use only circuits scoped to `factory-circuit-guanyin`.
- Jungli slot aggregation SHALL ignore Guanyin-only slots such as `heavy_vehicle` and `ed_coating`.
- Guanyin slot aggregation SHALL include all eight Guanyin slots when they are scoped to `factory-circuit-guanyin`.
- `GET /api/circuits?pageKey=<pageKey>` returns only circuits for that Factory Circuit page key; `POST` and `PUT` preserve or update the circuit `pageKey`.
- Display readiness slot findings SHALL be page-scoped so a missing Guanyin slot does not block Jungli and a missing Jungli hidden slot does not block Jungli.
- `GET /api/display-card-data` lists Factory Circuit rows for both page instances, and each Factory Circuit slot row uses a page-specific card id and metric key.
- Existing callers without `pageKey` SHALL continue to receive all circuit rows.

Acceptance criteria:

- Server route tests cover Jungli and Guanyin story payloads, including different slot counts and aggregate total power.
- Circuit route tests cover page-key filtered reads and persisted page keys.
- Readiness tests cover page-scoped slot requirements.
- Card data tests cover page-scoped Factory Circuit rows and publish metric keys.
- `rtk pnpm --filter @solar-display/server exec tsx --test ...` for affected server tests passes.
- `rtk pnpm --filter @solar-display/web exec tsx --test ...` for affected Factory Circuit and MQTT settings tests passes.
- `rtk pnpm run build` passes.

## Risks / Trade-offs

- [Risk] Existing databases have unscoped circuit rows. → Migration defaults existing rows to `factory-circuit` and seed creates Guanyin rows explicitly.
- [Risk] Guanyin MQTT mappings may not exist yet. → Rows surface `missing-topic` and publish actions only appear when a mapping exists.
- [Risk] Page-scoped metric keys can be mistyped. → Shared helpers resolve metric keys from page key and slot key instead of duplicating literals across services.
