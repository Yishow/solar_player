## 1. Semantic Token Families

- [ ] 1.1 Implement `Define three semantic surface families` so `Provide semantic surface primitives for display operations settings and status pages` is observable through shared operations, preview, and status-dashboard token roles in apps/web/src/styles/tokens.css; verify with apps/web/src/styles/tokens.test.ts and a content review of the generated token contract.
- [ ] 1.2 Implement `Distinguish operations, preview, and status-dashboard surface families` in shared management primitives so settings workspaces, preview surfaces, and `Device Status` no longer depend on the same appearance assumptions; verify with component tests for the new primitives and a manual cross-route audit on `/settings/playback`, `/settings/mqtt`, and `/device-status`.

## 2. Shared Primitive Extraction

- [ ] 2.1 Implement `Extract primitives at appearance level before geometry changes` by moving shared title, board, banner, stat-strip, status, and action treatments into reusable management primitives; verify with apps/web/src/components/management/opsSurfacePrimitives.test.tsx and targeted render checks in apps/web/src/components/shellFoundation.test.ts.
- [ ] 2.2 Implement `Allow page-local geometry while centralizing appearance semantics` so page CSS keeps route-specific layout but stops being the primary source of borders, shadows, and state backgrounds; verify with a code review across apps/web/src/pages/PlaybackSettings/playbackSettings.css, apps/web/src/pages/ImageManagement/imageManagement.css, apps/web/src/pages/MqttSettings/mqttSettings.css, apps/web/src/pages/CircuitSettings/circuitSettings.css, apps/web/src/pages/SlideshowPreview/preview.css, and apps/web/src/pages/DeviceStatus/device.css.

## 3. Adoption Contract

- [ ] 3.1 Implement `Keep settings family and status family visually related but contractually distinct` so `Device Status` reuses semantic state language without collapsing into settings density; verify with apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx and a manual dashboard-versus-settings comparison.
- [ ] 3.2 Implement `Provide semantic surface primitives for display operations settings and status pages` as an adoption contract that downstream page changes can consume without introducing a parallel palette; verify with `spectra analyze establish-display-ops-surface-token-primitives` and a content review of proposal.md, design.md, and specs/display-ops-surface-primitive-system/spec.md.
