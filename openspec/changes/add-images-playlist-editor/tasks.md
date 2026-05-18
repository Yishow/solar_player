## 1. Playlist entry model

- [ ] 1.1 Deliver `Treat Images as a playlist domain with ordered entries` and reference `Treat Images as a playlist domain, not only an asset repository` by persisting ordered Images playlist entries with enabled state, verified by `pnpm --filter @solar-display/server test` coverage for playlist reads and reordering.
- [ ] 1.2 Deliver `Allow per-entry playback duration in Images playlist management` by wiring entry duration into management UI and playback selection, verified by targeted server tests plus `src/pages/Images/viewModel.test.ts`.

## 2. Slide metadata panels

- [ ] 2.1 Deliver `Keep slide metadata separate from raw file metadata` and reference `Keep slide metadata separate from raw file metadata` by introducing playlist-level metadata fields independent of asset file fields, verified by targeted server tests.
- [ ] 2.2 Deliver `Show metadata-driven info panel content in Images` by rendering info panel content from active slide metadata with predictable fallbacks, verified by `pnpm --filter @solar-display/web test -- src/pages/Images/viewModel.test.ts`.

## 3. Fallback behavior

- [ ] 3.1 Deliver `Make fallback behavior explicit for missing or pending Images slides` and reference `Make fallback behavior explicit for missing or pending slides` by defining and applying entry-level fallback modes, verified by targeted runtime and server tests.
- [ ] 3.2 Deliver `Keep Images fallback behavior diagnosable in management workflow` by exposing fallback mode and reason in management responses or UI, verified by manual inspection of `settings/images` plus targeted tests.
