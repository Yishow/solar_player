# Display Launch Verification Pack

日期：2026-05-27

這份文件只負責 procedure。它不是第二份 status ledger；reviewer 完成檢查後，要把結果 record the result back into the matrix `docs/reference-match/display-launch-witness-matrix.md`。

## Command Pack

1. `pnpm --filter @solar-display/web test -- src/pages/displaySurfaceVisualGuardrails.test.ts`
2. `pnpm --filter @solar-display/web test -- src/pages/DisplayPagesEditor/index.test.tsx src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx src/pages/shared/liveDisplayPagePreview.test.ts`
3. `pnpm --filter @solar-display/server test -- src/routes/display-pages.test.ts src/routes/display-pages-fallback.test.ts src/routes/display-page-registry.test.ts src/routes/shell-decorations.test.ts`
4. `spectra analyze add-display-launch-witness-gates --json`
5. `spectra validate --strict --changes add-display-launch-witness-gates`

## Manual Witness Checks

For each of `/overview`, `/solar`, `/factory-circuit`, `/images`, `/sustainability`:

1. Open `/display-pages/editor` and confirm the page can be loaded and edited.
2. Confirm the same page's playback route renders the expected runtime state.
3. Publish a draft and confirm the live playback witness refreshes, not only the management success message.
4. Trigger or inspect fallback behavior and confirm the page does not go blank or lose critical context.
5. Confirm another reviewer/operator can tell what changed and what still blocks handoff.

## Matrix Recording Format

After each route check:

1. Open `docs/reference-match/display-launch-witness-matrix.md`.
2. Update `Authoring`, `Runtime parity`, `Publish refresh`, `Fallback`, `Handoff`, and `Overall`.
3. Write the blocker note or witness summary in `Blocker notes`.

## Supporting Inputs

- `docs/reference-match/all-pages-audit.md`
- `docs/reference-match/all-pages-checklist.md`
- `docs/reference-match/playback-visual-canonicals.md`
- `docs/display-surface-visual-review-checklist.md`

Use these as supporting input or supporting reference only. The authoritative launch status still lives in the matrix.
