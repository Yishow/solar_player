## Tasks

- [ ] Implement `Model media effects as composable effect layers with explicit target zones` by `Model media effects as composable effect layers that target explicit zones` in the shared effect schema, resolver, and rendering paths.
- [ ] Implement `Support directional and percentage-based zone controls symmetrically` by `Support directional and percentage-based controls symmetrically` across top, bottom, left, right, dual-edge scopes, all-edges, and percentage-based coverage.
- [ ] Implement `Declare media effect authoring eligibility explicitly per page media surface` through `Keep page-level support explicit while effect types become extensible` with a page-level support matrix for effect kinds and zones.
- [ ] Implement `Expose media effect controls from the operator's visible selection context` by `Resolve visible container selections back to the owning media source` before rendering editable controls.
- [ ] Implement `Keep media effect editing in Properties and summaries in Source Connection` by `Keep effect editing inside Properties only` so `來源連接` stays summary-only.
- [ ] Add unsupported-state messaging for media surfaces that do not yet support composable effect authoring.
- [ ] Add migration coverage for legacy blur/fade/opacity data so existing seeded media effects remain readable under the new framework.
- [ ] Add tests for composable zone rendering, effect stacking, coverage clamping, eligible selection routing, unsupported states, and non-duplication between `屬性` and `來源連接`.
- [ ] Run affected web tests for shared media effect resolution, DisplayPagesEditor authoring, and bounded runtime rendering.
