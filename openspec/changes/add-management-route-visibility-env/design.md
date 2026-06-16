## Context

Management routes are currently declared in routeMeta.ts and router.tsx. The footer/navigation derives labels from route metadata and there is no deployment-level way to hide selected management pages. The customer currently does not want operators to see /trends and /history, but those pages still exist as valid product surfaces and must remain recoverable without deleting code.

Playback page visibility already has a separate model through playback page settings and registry state. This change must not overload that model or mutate SQLite playback state.

## Goals / Non-Goals

**Goals:**

- Add a build-time environment setting named VITE_HIDDEN_MANAGEMENT_ROUTES.
- Hide matching management routes from navigation.
- Redirect direct access to hidden management routes before mounting the hidden page.
- Default .env.example to hide /trends and /history.
- Keep playback routes and playback_pages.enabled independent.

**Non-Goals:**

- Do not delete /trends or /history.
- Do not remove metrics/history APIs.
- Do not store management route visibility in SQLite.
- Do not alter playback rotation, display page registry, or DisplayPagesEditor page enablement.

## Decisions

### Use a build-time Vite environment setting for management route hiding

The requested control is deployment-specific and the immediate target is kiosk customer visibility. VITE_HIDDEN_MANAGEMENT_ROUTES keeps the implementation small and avoids adding a new persistence contract. Runtime DB-backed route visibility is a larger admin feature and is out of scope for this change.

### Resolve hidden routes through a dedicated helper

A new management route visibility helper parses the env string, normalizes comma-separated entries, ignores empty segments, and matches only known management route paths. Keeping this in a helper makes tests direct and avoids scattering import.meta.env parsing across router and navigation code.

### Redirect hidden direct access before page mount

The router wraps hidden management route elements or loaders so direct access redirects to a visible route before the hidden page starts runtime data loading. For this change, a safe fallback route can be the first visible management route, with /overview as final fallback if all management routes are hidden.

### Keep playback route enablement separate

The helper must accept route metadata and only apply to routes with group management. If /overview or another playback route appears in VITE_HIDDEN_MANAGEMENT_ROUTES, it is ignored. Playback visibility remains governed by playback_pages.enabled and existing registry/runtime contracts.

## Implementation Contract

Behavior:

- With VITE_HIDDEN_MANAGEMENT_ROUTES=/trends,/history, management navigation does not show 趨勢 or 歷史.
- Direct navigation to /trends or /history redirects before EnergyTrend or EnergyHistory mounts.
- Other management routes remain visible and routable unless explicitly hidden.
- Playback routes remain unaffected even if listed in the env setting.

Interfaces:

- VITE_HIDDEN_MANAGEMENT_ROUTES is a comma-separated string of absolute management route paths.
- managementRouteVisibility helper exposes parsing and predicate functions that can be unit tested without rendering React.
- Router integration uses the helper to choose whether a management route is renderable or redirected.

Failure modes:

- Empty, missing, malformed, duplicated, or whitespace-heavy env values resolve to a stable set of known management routes.
- Unknown paths are ignored.
- If every management route is hidden, direct hidden-route access redirects to /overview.

Acceptance criteria:

- Unit tests cover parser trimming, empty segments, unknown route filtering, playback route ignoring, default /trends and /history hiding, and fallback route selection.
- Router or source-level regression tests confirm hidden route elements are guarded.
- Build succeeds with the default env example setting.
- Browser/manual verification confirms the footer/nav no longer shows 趨勢 or 歷史 in the target build.

Scope boundaries:

- In scope: .env.example, route metadata helper, management navigation filtering, router guard, tests.
- Out of scope: server-side feature flags, SQLite persistence, user-level permissions, deleting pages, playback page enablement.

## Risks / Trade-offs

- [Risk] Build-time setting requires rebuild to change visibility. → Mitigation: this matches kiosk deployment needs and avoids adding a new settings persistence surface.
- [Risk] Hidden direct routes could still load if only nav filtering is implemented. → Mitigation: tasks must include router guard verification.
- [Risk] Hiding management pages could hide useful diagnostics. → Mitigation: default only hides /trends and /history; Device Status and settings pages remain visible.

## Migration Plan

1. Add VITE_HIDDEN_MANAGEMENT_ROUTES to .env.example with /trends,/history.
2. Implement the helper and tests.
3. Wire navigation and router guard.
4. Rebuild and deploy; clearing or changing the env value restores visibility in a later build.

## Open Questions

- None for this scope.
