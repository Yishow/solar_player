# Render invariance evidence

This change alters data identity, resolution, authorization, and editor controls. It does not alter playback geometry, styling, assets, or page order.

## Evidence

- Overview, Solar, and Factory Circuit keep their existing seed geometry and runtime card/slot order. Runtime value lookup now uses stable item ids instead of array positions.
- No playback CSS, shared display chrome, FHD asset, route shell, or Factory Circuit layout merge is part of this change.
- Legacy normalization adds `dataBindings` beside the existing page config; it does not rewrite layout/style fields.
- `pnpm verify` passed on 2026-08-30 across build, bundle budget, server, web, deploy, and server-runner stages.
- Existing Overview/Solar/Factory Circuit config-render, geometry, runtime, live-preview, and FHD guardrail tests passed inside the web suite.
- Fresh 1920×1080 playback, CL/KN site-context, and editor witnesses were captured under `docs/fhd-witness/runs/2026-08-30-add-widget-data-bindings/`.
- Screenshot review found no new overflow, clipping, route-shell, geometry, or asset regression attributable to widget bindings. Missing and delayed values are expected from the isolated mock-data witness environment.

## Closeout classification

`data/editor capability only`: no visible FHD geometry or style changed. The required fresh witness batch is complete; human launch acceptance remains pending and is not claimed by this change.
