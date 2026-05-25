## Context

`LiveDisplayPagePreview` currently renders the same wrapper for all contexts. That wrapper is useful in editor contexts because it clearly communicates read-only state and fallback detail. In slideshow preview, however, the card is already inside a preview/debug page. Adding another editor-looking wrapper inside each carousel card creates visual noise and weakens the display-wall miniature effect.

The live preview renderer itself should remain shared. The difference is presentation chrome around that renderer.

## Goals / Non-Goals

**Goals:**

- Add an explicit presentation mode for live display previews.
- Keep editor diagnostics and fallback detail available in management/editor contexts.
- Let slideshow carousel cards render as showcase miniatures with minimal management UI chrome.
- Preserve the current runtime state model and fallback safety.

**Non-Goals:**

- No changes to rotation order, playback timing, or countdown logic.
- No changes to display page renderer behavior.
- No changes to backend config or runtime payloads.

## Decisions

### Add a preview presentation mode rather than creating a second renderer

A `mode` or equivalent prop keeps preview rendering centralized while allowing context-specific wrapper chrome. Duplicating the live preview renderer would increase drift risk and defeat the current registry architecture.

### Default to editor mode for backwards compatibility

Existing callers should keep current behavior unless they opt into showcase mode. This reduces migration risk and preserves management diagnostics.

### Showcase mode hides management chrome but not safety states

Showcase mode should not display the read-only badge by default, and fallback copy should be concise and display-friendly. However, broken or unpublished previews still need safe fallback surfaces so the carousel does not collapse.

### SlideshowPreview cards explicitly request showcase mode

`LiveSlideshowPreviewCards` is the clearest showcase context: it should render live page miniatures. Other contexts can opt in later if they are intended for presentation rather than editing.

## Implementation Contract

**Behavior**

- `LiveDisplayPagePreview` SHALL support at least `editor` and `showcase` presentation modes.
- Existing callers without an explicit mode SHALL keep editor behavior.
- Showcase mode SHALL minimize or remove the read-only badge, heavy border, and technical fallback copy.
- Showcase mode SHALL still render a stable fallback surface for loading, unpublished, config-unavailable, runtime-unavailable, asset-unavailable, and renderer-unavailable states.
- Slideshow carousel preview cards SHALL use showcase mode.

**Interface / data shape**

- The preview mode is frontend-only and does not require backend or shared package schema changes.
- Existing `LiveDisplayPagePreviewState` remains valid.
- Existing `renderPreview(config)` definitions remain valid.

**Failure modes**

- If a showcase preview cannot render, it shows a concise display-friendly fallback rather than an empty card.
- If editor mode receives a failure state, it continues showing detail useful for diagnosis.
- If a caller passes an unknown mode, implementation should fall back to editor behavior or fail type-checking.

**Acceptance criteria**

- Slideshow carousel cards look like display miniatures and no longer show the default read-only badge in showcase mode.
- Editor/management preview contexts preserve their current diagnostic behavior by default.
- Runtime fallback states remain safe and readable in both modes.
- `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` succeeds.
- `spectra validate --strict --changes split-live-display-preview-showcase-mode` succeeds.

## Risks / Trade-offs

- **Risk:** Hiding badge makes users confuse preview with editable content.  
  **Mitigation:** Only slideshow showcase opts in; editor contexts stay unchanged.
- **Risk:** Fallback detail becomes too vague in showcase mode.  
  **Mitigation:** Keep concise state labels and reserve full details for editor mode.
- **Risk:** Additional prop increases API surface.  
  **Mitigation:** Small enum-like mode with editor default keeps the contract simple.
