## 1. Rotation Surface Structure

- [x] 1.1 Implement `Use a two-board model for configured rotation and effective rotation` so `Separate configured rotation governance from effective rotation diagnostics` is visible in `Playback Settings`; verify with apps/web/src/pages/PlaybackSettings/viewModel.test.ts and a manual review on `/settings/playback`.
- [x] 1.2 Implement `Separate configured rotation governance from effective rotation diagnostics` so configured rows, effective playable rows, and skipped rows are distinguishable with operator-facing reasons; verify with apps/web/src/pages/PlaybackSettings/index.test.ts and a manual skip-state assertion.

## 2. Shared Preview Family

- [x] 2.1 Implement `Reuse one preview status and action language across playback and slideshow preview` by moving shared preview/status/action treatments into common primitives or CSS contracts consumed by both routes; verify with apps/web/src/pages/shared/liveManagementPreviewSurfaces.test.ts and a manual comparison of `/settings/playback` versus `/slideshow-preview`.
- [x] 2.2 Implement `Use one preview status and action language across playback and slideshow surfaces` so current page identity, countdown, progress, and summary states read coherently on both pages; verify with apps/web/src/pages/SlideshowPreview/index.test.ts and route-level manual review.

## 3. Instance-Aware Preview Integrity

- [x] 3.1 Implement `Preserve instance-aware preview identity instead of template-level grouping` so `Preserve page-instance preview identity across configured and effective boards` remains true for duplicate template instances; verify with apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.test.ts and apps/web/src/pages/shared/liveDisplayPagePreviewState.test.ts.
- [x] 3.2 Implement `Preserve page-instance preview identity across configured and effective boards` with visible instance labels and per-instance skip or active state; verify with apps/web/src/pages/SlideshowPreview/viewModel.test.ts and a manual duplicate-instance scenario review.
