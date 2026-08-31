## 1. Data Hub shell, routing, and shared scope context

- [x] 1.1 Add `/settings/data-hub` section routing/navigation for Connections, Sources, Metrics, Derived Metrics, Usage, Diagnostics, and External Data plus a shared management scope selector model `cl|kn|global|all`; verify route metadata/navigation tests and confirm `all` is never accepted as stored `MetricScope`.
- [x] 1.2 Add compatibility route tests for existing `/settings/mqtt` and `/settings/data-source` entry points, then route them to the appropriate Data Hub section without dropping dirty-form protection; verify old bookmarks/internal links do not produce dead routes.
- [x] 1.3 Build the Data Hub shell with section-scoped loading/error/empty states so opening one section does not eagerly fetch every domain; verify staged-loading/render tests and management authorization remain equivalent to existing settings surfaces.

## 2. Connections, Sources, and scoped Metrics

- [x] 2.1 Move/reuse central MQTT broker configuration/status controls under Connections while preserving masked credentials and the existing “persist before reconnect result” save contract; verify settings and reconnect failure tests remain green with one broker for both sites.
- [x] 2.2 Build Sources read models/UI for managed Solar adapter sources and generic MQTT mappings, including source type, scope/site, health/activity, ownership, and editable generic mapping fields; verify adapter-owned identities cannot be edited as generic mappings and CL/KN same-key mappings remain distinguishable.
- [x] 2.3 Build scoped Metrics inventory from the metric catalog/MetricResolver with current value, unit, freshness/evaluation state, source class, ownership, and provenance summary; verify CL, KN, and global rows sharing one semantic key are never collapsed.
- [x] 2.4 Migrate near-real-time MQTT/source activity updates into Data Hub source/metric rows with scope-preserving update keys; verify a CL update changes only the CL row and managed/generic ownership remains intact.

## 3. Derived, Usage, and bounded Diagnostics

- [x] 3.1 Mount/link the Derived Metric Registry list/detail/preview/authoring capability under Data Hub Derived Metrics, respecting managed/read-only versus custom definitions; verify existing registry management auth/validation tests pass through the new entry point.
- [x] 3.2 Implement a metric Usage index/read model from published page bindings plus registered story/readiness consumers, keyed by semantic metric/binding identity rather than MQTT topic text; verify a metric used by multiple page instances returns each page/item and inherited bindings are labeled as inherited.
- [x] 3.3 Implement a bounded, de-duplicated management provenance graph/read model joining sources/topics, scoped metrics, calculation settings, derived dependencies, and page/widget consumers; verify depth/node limits and credential/raw-exception redaction tests.
- [x] 3.4 Integrate existing Card Data details/overrides into Metrics/Usage/Diagnostics navigation and add safe deep links to/from Display Editor data binding; verify current value/display override/formula/provenance behavior remains scope-aware and no duplicate widget-binding editor is added to Data Hub.

## 4. External Data / Weather migration

- [x] 4.1 Move/reuse Weather enable/location/preset/custom-field/update-interval/preview controls under External Data → Weather; verify all existing Weather field-preset, preview, save, and rendering tests pass without requiring the MQTT settings page.
- [x] 4.2 Decouple Weather save orchestration from MQTT broker reconnect while preserving MQTT save/reconnect behavior; verify valid Weather saves succeed during broker outage and MQTT reconnect failure cannot discard Weather settings.
- [x] 4.3 Move manual Weather refresh, options loading, cache/stale indicators, and latest safe diagnostic/copy action under External Data; verify current success/failure/diagnostic tests and secret-redaction behavior remain green.

## 5. Scope-safe monitoring operations and Energy History

- [x] 5.1 Update monitoring day diagnostics APIs/read models to require or report explicit stored scope and support a read-only `all` summary without collapsing rows; verify CL empty/current-day diagnostics cannot be satisfied by KN/global snapshots.
- [x] 5.2 Change reset-today-trend to require concrete `cl|kn|global` scope, delete only that scope's current-day `metric_snapshots`, and emit a scope-tagged refresh; verify missing/`all` scope is rejected and other scopes/live/daily/cumulative tables remain untouched.
- [x] 5.3 If an all-scope reset UI is retained, implement it as a separately explicit destructive action with affected-scope confirmation and dedicated server contract; verify it cannot be triggered through omitted scope on the single-scope path.
- [x] 5.4 Add Energy History scope selection/server filtering before existing day/week/month/year/total range semantics; verify CL/KN/global range tests, empty selected scope behavior, and visible global labeling without browser-side accidental aggregation.

## 6. Device Fleet and pairing workflow

- [x] 6.1 Replace Device `window.prompt`/raw-id edit flows with a typed form/dialog that loads valid Groups and shows resolved Site Scope/Playback Profile; verify create/edit/enable/disable/group-assignment and server validation errors in Device Fleet tests.
- [x] 6.2 Replace Group prompt/free-text site/profile flows with typed CL/KN Site Scope and valid Playback Profile selectors; verify create/edit/enable/disable lifecycle tests and no unsupported scope/profile id can be submitted silently.
- [x] 6.3 Update pairing preparation/workflow to require/confirm Device Group and resolved Site/Profile context while keeping pairing token/credential behavior unchanged; verify a CL and KN device can pair without any MQTT topic/broker credential field and Device Context resolves after exchange.

## 7. Cutover, compatibility, and verification

- [x] 7.1 Make Data Hub the primary management navigation after all migrated sections have parity tests, retain compatibility redirects, and remove only truly duplicated old page sections/components; verify route smoke tests cover every old/new entry and no capability disappears during cutover.
- [x] 7.2 Run management auth/read-boundary, MQTT/settings/source diagnostics, metric/registry/Usage/provenance, Weather, Card Data/override, monitoring ops, Energy History, Device Fleet/pairing, route/navigation and dirty-state tests plus `git diff --check` and `pnpm verify`.
- [x] 7.3 Confirm no Data Profile, Pi MQTT selector, second broker topology, duplicate widget metric editor, Factory Circuit layout merge, or page-local FHD data hardcode entered this change; because playback visuals should be unchanged, document render invariance or run `docs/ops/fhd-closeout.md` witness only if visible playback geometry/style was actually touched.
