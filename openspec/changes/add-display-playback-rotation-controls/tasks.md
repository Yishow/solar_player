## 1. Rotation plan model

- [x] 1.1 Deliver `Maintain a first-class rotation plan for display pages` and reference `Keep rotation plan as a first-class playback model` by extending playback persistence and shared types for page order, enabled state, and duration, verified by `pnpm --filter @solar-display/server test` coverage for rotation plan reads and writes.
- [x] 1.2 Deliver `Show rotation plan preview in management workflow` by updating playback-related management UI to render the effective configured sequence and durations, verified by targeted web tests or manual preview inspection.

## 2. Conditional playback

- [x] 2.1 Deliver `Evaluate conditional playback for display pages at runtime` and reference `Evaluate conditional playback at runtime with explicit skip reasons` by applying readiness, schedule, and health checks before page selection, verified by shared playback resolver tests and targeted server tests.
- [x] 2.2 Deliver `Reuse conditional playback result in management preview` by exposing the same evaluation output to management preview APIs, verified by tests comparing runtime and preview results for the same inputs.

## 3. Skip reason reporting and safe fallback

- [x] 3.1 Deliver `Record skip reason reporting for skipped display pages` by returning machine-readable skip reasons from rotation diagnostics and preview responses, verified by targeted server route tests.
- [ ] 3.2 Deliver `Preserve a safe fallback when no display pages are playable` and reference `Expose rotation preview through management surfaces` by keeping existing safe playback or offline behavior when all pages are skipped, verified by `pnpm --filter @solar-display/web test` around playback controller and offline routing behavior.
