## Context

The playback footer currently carries the five display routes as text labels only. The FHD reference for the display wall uses icon-and-text navigation, which improves scanability at distance without changing route semantics.

This change is scoped to playback chrome. Management navigation stays text-only and no route, label, order, shell, API, or persistence behavior changes.

## Goals / Non-Goals

**Goals:**

- Add one route-specific navigation icon for each playback route.
- Carry the icon through existing route metadata into playback footer entries.
- Render icon and existing text label together in playback mode.
- Keep management footer navigation unchanged.

**Non-Goals:**

- Do not change playback route structure, count, order, paths, or label text.
- Do not convert playback navigation to icon-only.
- Do not add icons to management mode.
- Do not alter shared header, slogan, shell decoration, or page runtime behavior.

## Decisions

### Route metadata 帶 icon

Route metadata already centralizes playback path and label data. Adding the icon key there keeps footer rendering data-driven and avoids page-local navigation special cases.

### Footer 渲染 icon

Playback mode maps footer entries to icon-and-label rows. Management mode keeps using its existing text-only entries so this visual change cannot drift into operator surfaces.

## Implementation Contract

**Behavior:**

- Each playback route metadata record provides exactly one icon key.
- Playback footer entries include the resolved icon key.
- `AppFooterNav` renders the icon before the existing label for playback entries.
- Existing active underline, route link, route order, count, and label text remain unchanged.
- Management footer entries do not render route icons.

**Interface / data shape:**

- `RouteMeta` gains a navigation icon field for playback routes.
- `PlaybackFooterEntry` carries that icon field to footer rendering.

**Failure modes:**

- Missing or unsupported icon keys should not change route matching or navigation targets.
- Management mode must not consume playback icon metadata.

**Acceptance criteria:**

- Targeted footer tests prove all five playback routes render icon and label together.
- Targeted footer tests prove management mode remains text-only.
- `spectra analyze add-display-nav-icons --json` has no findings.
- `spectra validate --strict --changes add-display-nav-icons` passes.
- `pnpm --filter @solar-display/web test` and `pnpm run build` pass for the implementation commit.

## Audit Notes

- This change introduces no new API, auth, file, network, or persistence behavior.
- The primary drift risk is accidentally applying playback icons to management navigation; tests cover that boundary.
