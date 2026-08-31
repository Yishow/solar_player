## Context

See `proposal.md` for motivation. Management currently spreads related data operations across `/settings/mqtt`, `/settings/data-source`, Card Data tabs, Energy History, and Device Fleet. `MqttSettingsContent` mixes broker/topic mapping, Card Data, and Weather. Device Fleet still uses browser prompt flows for parts of Device/Group editing. The preceding changes establish scoped metrics, a managed Solar adapter, explicit widget bindings, and a Derived Metric Registry; the management surface needs to expose those seams directly rather than flattening them back into “MQTT”.

## Goals / Non-Goals

**Goals:**

- Make Data Hub the primary operator mental model for data infrastructure → sources → semantic metrics → derived metrics → usage/diagnostics → external integrations.
- Reuse existing domain APIs/services wherever possible; reorganize UI without creating a new duplicate data backend.
- Preserve explicit management scope and destructive-operation safety in the single-server multi-site deployment.
- Replace untyped Device/Group prompt workflows with validated structured controls.
- Preserve Weather, Energy History, Card Data, and MQTT operational behavior while placing them in clearer IA.
- Keep all playback/FHD data authoring in Display Editor capabilities rather than adding hidden page-local controls here.

**Non-Goals:**

- No new Data Profile model.
- No Pi MQTT/topic management.
- No change to the central one-broker deployment topology.
- No merge of CL/KN Factory Circuit layouts.
- No replacement of Display Editor with Data Hub; Data Hub manages data definitions/diagnostics, Editor chooses widget bindings.
- No arbitrary new formula engine; Data Hub hosts the Registry authoring capability from the preceding change.

## Decisions

### Make `/settings/data-hub` the primary workspace with section routes

Use a primary route family conceptually:

```text
/settings/data-hub/connections
/settings/data-hub/sources
/settings/data-hub/metrics
/settings/data-hub/derived
/settings/data-hub/usage
/settings/data-hub/diagnostics
/settings/data-hub/external
```

A compact tab/side-navigation inside Data Hub can preserve selected section/scope in the URL. Existing `/settings/mqtt` becomes a compatibility redirect/entry to the MQTT-relevant Data Hub section; `/settings/data-source` can redirect to Diagnostics or an appropriate preserved operations section once every current control has a mapped destination.

Do not remove legacy routes until route/navigation/browser tests prove bookmarks and internal links resolve. Redirects must not replay mutations or lose an in-progress draft silently; navigation away from a dirty form uses existing dirty-state protection.

Alternative: keep one giant `/settings/mqtt` page and rename it Data Hub. Rejected because the core problem is mixed information architecture, not the title.

### Keep backend domain services separate; compose management read models at the UI/API boundary

Do not build a single “DataHubService” that owns broker, Weather, metrics, registry, history, and devices. Existing authoritative seams remain:

```text
MQTT settings/client        -> Connections + generic Sources
Solar source adapter        -> managed Sources
MetricResolver/catalog      -> Metrics
Derived Metric Registry     -> Derived Metrics
Display page binding catalog-> Usage
provenance resolvers        -> Diagnostics
Weather services            -> External Data
history/monitoring services -> scoped operations
```

Add small management read-model endpoints/services only where cross-domain joins are needed, particularly metric usage and bounded provenance chains. This avoids a broad facade that becomes a second source of truth.

### Represent management scope as a view filter, not stored identity

Use normalized management selection:

```text
scope = cl | kn | global | all
```

`all` exists only as a management view/action selector; it is never stored as `MetricScope`. Each result row still carries its actual stored scope. Section defaults should prefer an explicit sensible context: for Metrics/Diagnostics either retain the operator's last UI selection in client navigation state or default to `all` if the view is read-only. Destructive actions such as reset must require an actual stored scope (`cl|kn|global`) and never interpret `all`/missing scope implicitly.

Alternative: add `all` to shared MetricScope. Rejected because it is a query set, not metric identity.

### Build Usage from contracts/bindings, not source-code/topic text search

Usage index inputs include published display page instances/config bindings, shared readiness/story registrations, and other explicit metric consumers. Index results by semantic metric key plus configured/effective scope semantics where meaningful:

```text
metric -> [page instance, item id, binding scope, consumer type]
```

For an `inherit-device` widget, Usage reports the binding as inherited rather than pretending it is only CL or KN. Data Hub can resolve preview/effective usage for a selected context when needed.

Source topic strings are diagnostic provenance only and never the Usage join key.

### Use a bounded provenance graph DTO for Diagnostics

Create a management-safe graph/chain model with node categories such as:

```text
source-connection
managed-source / mqtt-topic
semantic-metric
calculation-setting
derived-metric
widget/page/readiness-consumer
```

Edges represent “produces”, “depends-on”, or “used-by”. Every node includes safe label/id/scope/status metadata only. Credential fields, raw exceptions, secrets, full private URLs, and unbounded raw payloads are excluded. Existing source/registry provenance services provide inputs; the Diagnostic endpoint composes/de-duplicates and caps depth/node count.

### Move Weather UI components, not Weather semantics

Relocate the existing Weather settings/preview/manual-refresh/diagnostic components and view-model behavior under External Data. Keep Weather APIs/cache/CWA fetch behavior unchanged except decouple UI/save orchestration from MQTT broker reconnect.

`save MQTT` continues to persist before reconnect result as the existing spec requires. `save Weather` calls the Weather settings path only; it does not trigger/rely on MQTT reconnect just because the old combined page did.

Existing Weather MQTT broadcast used internally by runtime may remain; “External Data” describes the upstream configuration domain, not necessarily the internal fan-out mechanism.

### Replace Device Fleet prompts with one typed edit model

Create structured forms/dialogs for:

```text
Device: clientId, displayName, groupId, enabled
Group: name, siteScope (CL/KN select), playbackProfileId, enabled
Pairing: selected/assigned Device + resolved Group/Site/Profile + token lifecycle
```

Device form loads enabled/valid Groups and displays their resolved site/profile. Group form loads Playback Profiles. Server validation remains authoritative; client form validation improves immediate feedback but cannot invent invalid ids.

Pairing does not add MQTT fields. It uses the Device already assigned to a Group, or requires group assignment before generating/exchanging a pairing token.

Alternative: add a wizard that also chooses raw data topics or Data Profile. Rejected for current deployment; trusted widget bindings already cover intentional mixed-site data.

### Make scope mandatory for monitoring destructive operations

Change reset-today-trend management contract so the request carries `metricScope = cl|kn|global`. Missing/`all` is a validation error for the standard endpoint. If an explicit all-scope reset is retained, it must be a separate UI action with multi-scope confirmation and server path/flag that cannot be reached accidentally by omission.

Diagnostics endpoints can accept `all` and return per-scope summaries, never one collapsed pseudo-scope.

### Add scope to Energy History without changing range semantics

Scope selection happens before the existing range/query semantics:

```text
selected MetricScope -> existing day/week/month/year/total range logic
```

Server queries must filter by stored scope. Global aggregate histories are explicitly labeled global. Empty selected scope stays empty rather than falling back.

Do not recalculate CL+KN browser-side unless the selected metric explicitly defines a client-visible aggregation contract; canonical global history comes from server global records.

### Reuse Display Editor for page data authoring

Data Hub Metrics/Usage can deep-link to the relevant Display Editor item/page, and Editor can deep-link back to a metric diagnostic. Data Hub does not add duplicate “change this widget's metric” controls on generic diagnostics pages. This preserves editor-capability-first and avoids management changes that cannot be represented in published page config.

## Risks / Trade-offs

- [Risk] Large IA move breaks old links/tests → retain compatibility routes, update route metadata centrally, and test every legacy route plus navigation target before deleting old containers.
- [Risk] One Data Hub page loads too much data → section routes load only their domain/read model; diagnostics/provenance fetch on demand.
- [Risk] `all` scope is accidentally used for destructive reset → server requires concrete scope, UI separates any all-scope destructive action and confirmation.
- [Risk] Weather move unintentionally changes CWA/cache behavior → reuse current services/components and write parity tests around save/preview/manual refresh/diagnostics.
- [Risk] Usage becomes stale after page publish → derive/cache from current published page contracts with existing display-sync/revision invalidation; do not maintain a manually edited usage table.
- [Risk] Provenance exposes secrets/internal detail → safe DTO allowlist, bounded nodes/depth, and tests with credential-containing source settings.
- [Risk] Device form duplicates server constraints → server remains authoritative and form consumes returned validation codes/options.
- [Trade-off] More sections/routes than current page → accepted because each section now maps to one operational concept and can load independently.

## Migration Plan

1. Add Data Hub route/section shell, shared scope selector, and compatibility route tests without removing current screens.
2. Add/normalize management read models for Connections, managed/generic Sources, scoped Metrics, Usage, bounded Diagnostics, and Derived Registry links; mount current components progressively into the new sections.
3. Move Weather UI to External Data and decouple save orchestration from broker reconnect; run all existing Weather settings/cache/manual-refresh/diagnostic tests through the new route.
4. Move/bridge Card Data into Metrics/Usage/Diagnostics and add cross-links to Display Editor while preserving override/formula/source diagnostics.
5. Make monitoring diagnostics/reset scope-aware, require concrete scope for destructive reset, and migrate Data Source operations into Data Hub.
6. Add Energy History scope selector/server filtering while retaining existing range semantics and tests.
7. Replace Device Fleet prompt flows with typed Device/Group forms and pairing workflow based on Group/Site/Playback Profile; remove prompt-only code after behavior tests are green.
8. Make Data Hub primary navigation, retain tested compatibility redirects, then remove obsolete duplicated page sections/components.
9. Run route/navigation, management auth, MQTT/settings, source/metric/registry diagnostics, Weather, Card Data, monitoring ops, Energy History, Device Fleet/pairing tests plus `git diff --check` and `pnpm verify`.
10. Because Data Hub is management-only, playback/FHD visual output should be render-invariant; if implementation touches playback visual configuration, apply `docs/ops/fhd-closeout.md` witness rules rather than accepting page-local hardcode.

Rollback can restore previous management routing/components without reverting scoped data models. Keep legacy route compatibility until the new workspace has passed operator acceptance so a UI rollback has a known entry path.
