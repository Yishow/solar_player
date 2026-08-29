## 1. Shared binding schema and legacy normalization

- [x] 1.1 Add shared `MetricDataBinding`, scope-selector, stable item identity, effective binding, and compatible metric catalog types plus validation tests; verify allowed scopes are exactly `inherit-device|cl|kn|global`, raw MQTT topic/formula fields are not part of the binding, and incompatible/unknown metrics return stable validation errors.
- [x] 1.2 Define deterministic repository-owned default bindings for existing Overview, Solar, and Factory Circuit value-bearing items and add red config-normalization tests proving legacy configs receive stable ids/bindings without using array position.
- [x] 1.3 Implement idempotent config normalization/migration for stable ids and default bindings; verify reorder and insertion after normalization preserve each existing item's binding and existing page metric meanings remain unchanged.
- [x] 1.4 Update the shared playback metric contract so it owns metric vocabulary/defaults/dependencies/sourceClass while explicit saved bindings own actual widget selection; update contract tests to derive runtime dependencies from effective bindings rather than fixed page arrays.

## 2. Effective binding runtime

- [x] 2.1 Implement `EffectiveBindingPlan` compilation for published page instance + trusted context + metric catalog, covering inherited CL/KN, explicit CL/KN, global, mixed-scope, missing context, and incompatible binding cases; verify unit tests return stable item-id keyed effective scopes and dependency identities.
- [x] 2.2 Migrate page-scoped Display Story/readiness resolution to consume the effective binding plan so value, freshness, provenance, fallback, and sourceClass come from the same binding result; verify mixed CL/KN bindings remain correctly scoped within one story.
- [x] 2.3 Derive live bootstrap/subscription authorization from effective bindings across the Device's active playback profile, retaining inherited site/global delivery and adding only explicitly required foreign-scope identities; verify a CL session with one KN binding receives that KN dependency but no unrelated KN metrics.
- [x] 2.4 Recompute subscription authorization on published page/profile/context revision and perform a fresh authorized bootstrap before accepting subsequent deltas; verify removing a cross-site binding stops later foreign-scope updates and stale cached values are cleared.

## 3. Playback page migration away from positional binding

- [x] 3.1 Refactor Overview runtime/view model so KPI values are resolved by stable item id/effective binding instead of `viewModel.metrics[index]`; add regression tests for reorder, insertion, binding change, freshness/provenance, and unchanged static card geometry.
- [x] 3.2 Refactor Solar value-bearing KPI/flow bindings to the same stable binding result model and verify existing default content remains equivalent while a published compatible metric change updates the intended item only.
- [x] 3.3 Adapt Factory Circuit slot data resolution to the shared data-binding schema while preserving existing CL/KN page instances, slot visibility, and geometry; verify shared semantic slot keys plus scope still satisfy current page routing/story tests.

## 4. Display Editor Data capability

- [x] 4.1 Extend shared Display Editor capability/schema registration so eligible items expose a Data inspector without page-local hardcoded controls; verify non-data items do not receive metric controls and data changes participate in draft/save/reset/diff/publish lifecycle.
- [x] 4.2 Implement the Data inspector with compatible semantic metric picker, scope selector, limited precision/unit-display formatting, current preview value/freshness, and read-only provenance; verify no raw topic picker or formula editor is introduced and existing Source Connection media behavior remains green.
- [x] 4.3 Update Source Connection labeling/content where necessary to distinguish media/content source from Data while preserving current asset/icon replacement functionality; verify existing Source Connection and editor media tests continue to pass.

## 5. Trusted management Preview Context

- [x] 5.1 Add management-authorized Preview Context resolution for site CL/KN plus valid Device/Group contexts, without changing formal playback endpoint scope inputs; verify disabled/unauthorized Device/Group contexts are rejected and playback query/header site claims remain ignored.
- [x] 5.2 Key live preview/effective-binding cache state by page instance + relevant config revision + normalized Preview Context; verify alternating CL/KN previews of one page never reuse the other site's values/freshness and duplicate page instances remain isolated.
- [x] 5.3 Add Editor Preview Context controls and clearly distinguish temporary preview context from each widget's saved scope; verify a KN-pinned widget stays KN while Preview Context switches to CL and an inherited widget follows the preview context.

## 6. Verification and render invariance

- [x] 6.1 Run affected shared config/contract, server story/Socket/preview, web Editor, Overview/Solar/Factory Circuit, live preview, and config-render tests; add explicit regressions for index reorder, cross-site least-data delivery, preview-cache isolation, and legacy binding migration.
- [x] 6.2 Run `git diff --check` and `pnpm verify`; confirm no Formula Builder, Data Profile, Pi MQTT selection, raw-topic widget binding, or Factory Circuit layout merge entered this change.
- [x] 6.3 Verify existing published default bindings render visually equivalent playback surfaces; if implementation changes visible FHD geometry/style, produce fresh `docs/ops/fhd-closeout.md` witness before completion, otherwise record render-invariance evidence showing the change is data/editor capability only.
