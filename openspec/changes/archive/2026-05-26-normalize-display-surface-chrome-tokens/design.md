## Context

Display playback pages already share the same product shell and FHD canvas, but their visual chrome is still implemented in page-local CSS. `Overview` uses a masked hero image and inline SVG leaf watermark; `Solar` and `Sustainability` draw leaf ornaments with pseudo elements; `Images` owns its own gold ornament and gallery treatment; `FactoryCircuit` owns another leaf SVG and title block. These are small differences, but on a large display wall they read as quality drift.

The prototype family communicates a high-end green-energy display: warm paper background, deep green title/emphasis, gold line ornaments, large hero typography, soft photo fades, white/ivory cards, and botanical accents. The codebase already has design tokens and display chrome config helpers, so the right move is to formalize the shared semantics rather than patch each page again.

## Goals / Non-Goals

**Goals:**

- Introduce semantic tokens for display surface color, card surface, photo fade, hero type, and ornament language.
- Let the five playback pages consume shared hero/chrome primitives or classes for common typography and decoration.
- Preserve existing page-level geometry and region editability while removing duplicated hardcoded visual values.
- Make future content variation safer: copy, media, and metric changes should not break the shared visual family.

**Non-Goals:**

- No page redesign or new information architecture.
- No backend or payload changes.
- No management page restyle.
- No removal of existing editor fields; current chrome config paths remain valid.

## Decisions

### Use semantic display tokens instead of raw page-local hex values

The implementation will add tokens such as `--display-title-ink`, `--display-eyebrow-green`, `--display-emphasis-green`, `--display-emphasis-gold`, `--display-card-surface`, `--display-card-border-soft`, `--display-photo-fade-paper`, and ornament stroke/fill tokens. Pages may still override specific accents, but shared defaults must come from semantic tokens.

This is preferred over only replacing values with existing global tokens because display pages need semantics that are narrower than global brand color names. `--green` is a color; `--display-eyebrow-green` is a design role.

### Preserve runtime chrome config but route defaults through the shared system

Existing helpers such as `createHeroTypographyConfig`, `createGoldLineChromeConfig`, and `createLeafOrnamentChromeConfig` are still valid and should remain the editor-facing configuration layer. The new work should align their defaults and output with shared display chrome classes rather than replacing them.

### Extract shared display chrome primitives only where the pattern is stable

The first extraction targets stable visual language: hero typography, photo fade, leaf watermark, and gold line. Page-specific compositions remain in each page. For example, Images keeps its gallery stage and thumbnails; FactoryCircuit keeps its routing diagram. The shared primitive should be a design rail, not a layout jail.

### Keep geometry out of the refactor

All FHD `left/top/width/height` values remain untouched unless a separate layout change explicitly requests it. This change may adjust internal styling and CSS variables, but it must not move regions on the canvas.

## Implementation Contract

**Behavior**

- Display pages SHALL share semantic tokens for hero title, eyebrow, subtitle, emphasis, card surface, photo fade, and ornaments.
- Display page hero titles SHALL keep their current text and placement while inheriting shared typography defaults.
- Hero/media photos SHALL fade into the warm paper background using shared overlay/mask semantics.
- Leaf and gold ornaments SHALL use the same visual vocabulary across playback pages, with page-level position/opacity still configurable.
- Page-local CSS SHALL avoid adding new raw color literals for shared display chrome roles.

**Interface / data shape**

- Existing runtime page configs and editor schema paths SHALL remain valid.
- Shared chrome primitives/classes SHALL be frontend-only and must not require backend schema changes.
- Existing `chrome.heroTypography`, `chrome.ornaments.goldLine`, and `chrome.ornaments.leaf` config objects remain the knobs for editor-controlled presentation.

**Failure modes**

- If an ornament is disabled by opacity or scale, the page remains visually balanced and readable.
- If a hero image is missing, shared photo fade styles must not create unreadable overlays over fallback content.
- If a page lacks a specific ornament region, it may opt out without violating the shared token contract.

**Acceptance criteria**

- Five playback pages render without FHD geometry drift.
- Shared semantic tokens are used for common display chrome roles.
- Manual review confirms hero type, photo fade, leaf/gold ornament treatment, and card surface colors feel like one visual family.
- `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` succeeds.
- `spectra validate --strict --changes normalize-display-surface-chrome-tokens` succeeds.

## Risks / Trade-offs

- **Risk:** Token extraction hides page-specific nuance.  
  **Mitigation:** Keep page-specific composition and only share stable visual roles.
- **Risk:** Existing editor fields become confusing if defaults move.  
  **Mitigation:** Preserve field names and config paths; only align default values and CSS consumption.
- **Risk:** Designers later add raw colors again.  
  **Mitigation:** Add tests or lint-style review guidance for display chrome CSS literals in the follow-up guardrail change.
