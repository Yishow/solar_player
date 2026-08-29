## Context

See `proposal.md` for motivation. The current Overview runtime demonstrates the coupling this change removes: `overviewCardOrder` is mapped with an array index and the rendered card later reads `viewModel.metrics[shell.index]`. Shared `playbackMetricContract.ts` provides static runtime key lists, while page configs primarily describe geometry/style/content rather than metric selection. The Display Editor has a `Source Connection` panel for media/icon/content sources but no first-class metric data inspector.

This design assumes the scoped metric runtime from `scope-live-metrics-by-site`. The server can resolve `(scope, metricKey)` safely, and formal playback defaults to Device Context scope. The design also preserves the future-safe rule established there: a trusted published binding may explicitly cross site, but the Pi/client cannot expand its own data authority.

## Goals / Non-Goals

**Goals:**

- Persist stable data-binding identity with each value-bearing authorable item.
- Make one page configuration reusable across CL and KN by using `inherit-device` as the default scope.
- Allow trusted explicit CL/KN/global bindings for intentional mixed-site dashboards without adding Data Profile complexity.
- Give Display Editor a shared Data inspector and trusted Preview Context rather than page-local settings.
- Compile one effective binding plan that drives story resolution, runtime subscriptions, freshness/provenance, and management preview.
- Remove positional/index-based metric coupling from Overview/Solar and provide the same schema for Factory Circuit.

**Non-Goals:**

- No arbitrary expression/formula stored in widget config.
- No raw MQTT topic picker as the normal widget authoring control.
- No Pi-side site/topic chooser and no client-controlled scope override.
- No forced unification of the CL/KN Factory Circuit layouts.
- No redesign of page geometry, typography, FHD visual composition, or media Source Connection behavior beyond adding the Data capability.
- No speculative Data Profile model.

## Decisions

### Persist a minimal typed dataBinding beside stable widget identity

Use a shared config shape conceptually equivalent to:

```text
MetricDataBinding {
  sourceType: "metric"
  metricKey: string
  scope: "inherit-device" | "cl" | "kn" | "global"
  format?: {
    precision?: integer
    unitDisplay?: "auto" | "hide"
  }
}
```

The stable item id remains separate from the binding. Existing page-specific keys such as Overview `power`, `today`, `total`, `co2Today`, and `co2Total` can serve as stable item identities where already durable; items that currently lack a durable id receive one during config normalization. Layout order is a rendering concern only.

Format controls are intentionally limited to display formatting and must not change the underlying metric value or unit semantics. Unit conversion/calculation belongs in the metric layer.

Alternative: store `topic`, `valuePath`, and formula in each widget. Rejected because it duplicates ingestion/derived-metric behavior and turns page config into an ETL definition.

### Use shared metric catalog metadata to constrain compatible bindings

Extend the shared playback metric catalog so registered metrics expose enough authoring metadata to filter/select them, for example:

```text
metricKey
label
valueType: numeric | text | state
unit / unitFamily
sourceClass
freshness/dependency contract
compatible widget roles or capability tags
```

The catalog remains the source of metric semantics/defaults/readiness metadata. The saved widget binding becomes the source of the actual metric selection for that widget.

A numeric KPI cannot select a non-numeric/state-only metric unless that widget family explicitly supports it. Unknown metric keys are validation errors, not silent fallback to the previous positional metric.

Alternative: let every page provide its own picker list. Rejected because page-local lists become another source of truth and drift from readiness/story contracts.

### Compile an EffectiveBindingPlan once per page/context

Introduce a shared/server binding compiler with inputs:

```text
page instance + published config
playback or management preview context
metric catalog
```

and output conceptually:

```text
EffectiveBindingPlan {
  pageId
  contextKey
  items: [
    {
      itemId
      metricKey
      configuredScope
      effectiveScope
      dependencyIdentities[]
      sourceClass
      format
    }
  ]
}
```

`inherit-device` is resolved from the trusted context. Explicit CL/KN/global remains explicit. Dependency identities come from the shared metric contract (and later the Derived Metric Registry), not from a page-local array.

This plan is consumed by Display Story/readiness, live bootstrap/subscription authorization, and management preview. The web renderer binds output by `itemId`, never by index.

Alternative: resolve scope/metric separately in React, story service, preview, and Socket code. Rejected because that recreates the current mixed-value/freshness risk with four implementations of the same rule.

### Derive live delivery authorization from all active published bindings for the Device profile

For normal inherited data, keep the foundation's `site:<siteScope>` room. Global metrics follow the existing explicit-global path.

For explicit foreign-site bindings, compile the set of foreign `(scope, metricKey/dependency)` identities required by the Device's enabled playback pages/profile. Store that set as session/device subscription metadata and use the existing `device:${deviceId}` room (or equivalent fine-grained session target) for those specific updates. Do not join the device to the complete foreign `site:*` room.

The live bootstrap snapshot follows the same authorization set: inherited-site metrics required by the profile, permitted global dependencies, and explicit foreign identities from trusted bindings. When page config/profile/context revision changes, recompute the authorization set and force/reconcile a fresh bootstrap before applying further deltas.

Alternative: send all CL and KN metrics to every Pi and filter client-side. Rejected for data isolation and stale merge reasons. Alternative: create one Socket room per metric. Possible but unnecessary for the current two-device scale; a per-device allowed-identity set is simpler and can later be indexed if fleet size grows.

### Move value lookup from positional arrays to item-id keyed results

Story/runtime results for authorable widgets should expose a map or item list carrying `itemId` plus resolved binding result. Overview rendering then does conceptually:

```text
card config key/itemId -> resolved binding result by itemId
```

rather than:

```text
card at index N -> viewModel.metrics[N]
```

Solar KPI/flow nodes that are data-authorable follow the same rule. Static/non-value widgets (weather shell, visual ornaments, alert containers) are not forced into metric bindings unless their data model actually fits this capability.

Factory Circuit keeps page-specific slot visibility/layout but maps each slot id to the shared binding schema and scoped semantic metric.

### Keep `Source Connection` and `Data` as separate editor concepts

The right inspector gains a Data tab/section driven by data-bindable capability metadata. Existing Source Connection remains media/content/asset provenance. Naming should make the distinction explicit in Traditional Chinese UI, for example `資料` versus `來源連接（媒體）`, without moving metric selection into the media source panel.

The Data inspector provides:

- metric picker from compatible catalog entries,
- scope selector,
- limited display format controls,
- current resolved value/freshness,
- read-only provenance chain and source ownership.

It does not expose formula editing in this change.

### Use a management-only Preview Context service

Preview Context is ephemeral editor state, not page config. Supported context forms:

```text
{ kind: "site", siteScope: "cl" | "kn" }
{ kind: "device", deviceId }
{ kind: "group", groupId }
```

Device/Group contexts are resolved through the same trusted management/domain services used by formal identity. A site-only context supplies a synthetic trusted preview site for `inherit-device` resolution but does not mint a Device Credential.

Management preview APIs accept this context after management authorization. Formal `/api/playback/*` and device story/live endpoints do not accept a site query parameter.

Preview cache keys include page instance + published revision/draft revision as appropriate + normalized Preview Context. Explicit pinned bindings ignore the preview site for scope resolution but still display that distinction in the UI.

### Migrate legacy configs from repository defaults, not runtime index

For Overview/Solar, define a deterministic migration table from existing stable config keys/semantic roles to default metric bindings. The migration runs when config is normalized/persisted and is idempotent. Once a stable item id and binding exist, later array reorder cannot influence binding.

Example defaults conceptually include:

```text
Overview power       -> realTimePower / inherit-device
Overview today       -> todayGeneration / inherit-device
Overview total       -> totalGeneration / inherit-device
Overview co2Today    -> todayCo2Reduction / inherit-device
Overview co2Total    -> totalCo2Reduction / inherit-device
```

Equivalent Solar/Factory Circuit defaults are taken from the shared contract. Do not inspect the current index in `viewModel.metrics` to decide a migrated binding.

## Risks / Trade-offs

- [Risk] Existing published configs lack stable ids/bindings → deterministic role-key migration and idempotent normalization tests must run before rendering starts using bindings.
- [Risk] Cross-site bindings broaden data exposure accidentally → derive a narrow allowed-identity set from trusted published config and deliver foreign data only through targeted device/session delivery.
- [Risk] Binding changes alter readiness/subscription but client retains old state → page/profile/context revision invalidates the effective plan and triggers a fresh scoped bootstrap before deltas resume.
- [Risk] Editor picker lists metrics incompatible with a widget → shared catalog exposes value type/capability metadata and server validates on save/publish.
- [Risk] Metric result list and UI still rely on ordering in hidden places → add reorder/insert regression tests and migrate view models to item-id keyed resolution.
- [Risk] Preview context cache leaks CL values into KN preview → cache key includes normalized preview context and tests alternate contexts on the same page instance.
- [Trade-off] A page can intentionally show foreign-site data, which is more flexible than strict site-only playback → accepted because the authority is trusted published configuration, not the Pi; least-data delivery keeps the exposure explicit and narrow.

## Migration Plan

1. Add shared binding/catalog types, validation, stable-id normalization, and legacy default-binding migration tests for Overview/Solar/Factory Circuit.
2. Add server EffectiveBindingPlan compilation and unit tests for inherited, explicit site, global, missing context, incompatible metric, and mixed-scope pages.
3. Migrate page-scoped story/readiness and live bootstrap/subscription authorization to consume the effective plan; add targeted foreign-scope device delivery and revision invalidation tests.
4. Migrate Overview/Solar value rendering/view models away from positional lookup to stable item-id binding results; adapt Factory Circuit slots without merging page layouts.
5. Add Editor Data capability/inspector and metric picker/format/scope controls through shared editor schema/capability registration. Keep Source Connection media-focused.
6. Add management Preview Context resolution and context-keyed preview state/caching; verify formal playback routes still ignore client-selected scope.
7. Run focused shared/server/web editor, page config migration, story, Socket, preview, Overview/Solar/Factory Circuit tests, `git diff --check`, and `pnpm verify`.
8. Because the change adds editor capability but should not intentionally alter existing FHD appearance, run required browser/config-render checks; produce FHD witness only if implementation changes visible playback geometry/style, otherwise document render-invariance evidence.

Rollback can continue reading configs with additive binding fields if the previous schema tolerates unknown fields; if not, preserve a pre-change display page config/database backup. Do not deploy a rollback binary that interprets reordered arrays positionally after authors have changed bindings unless configs are restored as well.
