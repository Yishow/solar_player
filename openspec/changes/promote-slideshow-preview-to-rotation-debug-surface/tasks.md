## 1. Effective rotation debug state

- [x] 1.1 Deliver `Show effective rotation debugging in Slideshow Preview` by extending `apps/web/src/pages/SlideshowPreview/viewModel.ts` and related controller inputs with effective sequence, skipped pages, and debug rows, and verify with `apps/web/src/pages/SlideshowPreview/viewModel.test.ts`.
- [x] 1.2 Deliver `Expose effective rotation reasoning in the preview surface` by updating `apps/web/src/pages/SlideshowPreview/index.tsx` to render debug state without diverging from existing playback controller semantics, and verify with `apps/web/src/pages/SlideshowPreview/index.test.ts`.

## 2. Fallback route visibility

- [x] 2.1 Deliver `Surface fallback route context in Slideshow Preview` by wiring fallback-route state from the playback/rotation data into the preview debug surface, and verify with `apps/web/src/pages/SlideshowPreview/viewModel.test.ts` that degraded playback no longer appears fully healthy.
- [x] 2.2 Deliver `Keep preview debug state aligned with the playback controller` with regression coverage, and verify using `pnpm --filter @solar-display/web test -- src/pages/SlideshowPreview/*.test.ts`.
