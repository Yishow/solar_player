## Context

`fhd-playback-boundary-classification-2026-06-05.md` classified several playback-page gaps as editor capability gaps rather than page-local polish. Current code already has hero typography fields, copy text fields, media placement fields, and Sustainability ring thickness/glow controls. This change only fills the remaining gaps that are still CSS-only or mis-bound:

- Sustainability green palette values such as value green and icon green are hardcoded in CSS or inline styles.
- Sustainability and Factory English body copy typography, plus Images lead copy typography, are controlled by page CSS instead of persisted display config.
- Factory KPI card title/value typography is CSS-only because Factory KPI cards do not consume the existing `DisplayCardStyleConfig`.
- Factory leaf watermark opacity normalizes against the seed value, so seed opacity `0.38` renders as DOM opacity `1`.
- Sustainability leaf rotation is CSS-only and cannot be edited or verified from chrome config.

## Goals / Non-Goals

**Goals:**

- Add editor-backed body-copy typography controls for Sustainability, Factory Circuit, and Images lead/copy regions.
- Add editor-backed green palette tokens for Sustainability display accents and apply them through resolved config.
- Reuse existing `DisplayCardStyleConfig` for Factory KPI title/value/unit sizing instead of creating a second card typography model.
- Add leaf rotation to shared leaf ornament chrome config and apply Factory/Sustainability leaf opacity/rotation directly from resolved config.
- Keep missing persisted values seed-backed so existing draft/live configs render safely.

**Non-Goals:**

- Do not change shell, route, API, database schema, MQTT, or publishing contracts.
- Do not handle ornament/media base layout, hero media saturation/contrast, Images stage framing, or Solar/Sustainability hardcoded ornament layout; those belong to `extend-display-editor-ornament-and-media-controls`.
- Do not alter Factory circuit routing SVG behavior.
- Do not declare any playback page launch-ready.

## Decisions

### Reuse small shared config helpers

Add small shared config helpers in `displayPageChromeConfig.ts` for body copy typography, green palette tokens, and leaf rotation. These helpers match existing page config patterns and avoid a new cross-package schema.

### Reuse existing card style controls for Factory KPIs

Factory KPI cards will gain `cardStyles` keyed by existing KPI keys and use `buildDisplayCardStyleFields` in each KPI editor region. Runtime will pass the resolved style to `DisplayCardFrame` and `DisplayCardValueRow`.

### Preserve existing visual defaults

Seed values will match current CSS defaults. CSS keeps fallback values, while runtime sets CSS variables from resolved config. Existing persisted configs that omit the new objects fall back to seed values.

### Fix leaf bindings directly

Factory leaf watermark opacity will use `resolvedConfig.chrome.ornaments.leaf.opacity` directly. Sustainability leaf rotation will come from `resolvedConfig.chrome.ornaments.leaf.rotationDeg` through the shared `--display-leaf-rotation` variable.

## Implementation Contract

**Behavior:**

- Changing Sustainability palette fields in `/display-pages/editor` changes the Sustainability value/icon/accent greens in preview and after publish.
- Changing Sustainability/Factory/Images copy typography fields changes the relevant body copy block in preview and after publish without changing text content.
- Changing Factory KPI card title/value/unit size fields changes Factory KPI card typography using the existing card style mechanism.
- Factory leaf watermark DOM opacity equals the configured opacity value; seed `0.38` renders as `0.38`, not `1`.
- Sustainability leaf rotation comes from config and remains seed-backed when missing.

**Interface / data shape:**

- `SustainabilityDisplayPageConfig.chrome` gains `palette` and `copyTypography`.
- `FactoryCircuitDisplayPageConfig.chrome` gains `copyTypography`; Factory config gains `cardStyles` keyed by existing KPI keys.
- `ImagesDisplayPageConfig.chrome` gains `copyTypography`.
- `LeafOrnamentChromeConfig` gains `rotationDeg` and editor field support.

**Failure modes:**

- Missing new persisted config objects fall back to seed config.
- Invalid numeric values fall back through existing config helper normalization where the helper is used.
- Invalid palette color strings fall back to seed/default values instead of blanking the page.

**Acceptance criteria:**

- Targeted page config/runtime tests fail before implementation and pass after implementation.
- `spectra analyze extend-typography-palette-and-fix-ornament-bindings --json` has no findings.
- `spectra validate --strict --changes extend-typography-palette-and-fix-ornament-bindings` passes.
- Affected web tests and `pnpm run build` pass.

## Risks / Trade-offs

- Palette fields are text fields because the editor schema has no color field type. Mitigation: runtime helper accepts common CSS color strings and falls back on invalid values.
- Factory KPI card CSS still owns non-typographic styling such as color and border. This change only moves the requested title/value/unit sizing to existing card-style config.
- The change touches three playback pages; tests stay page-scoped to avoid broad visual rewrites.
