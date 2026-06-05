## Context

Existing media placement and chrome overrides cover broad page appearance, but the remaining FHD visual gaps include specific display treatments: photo fade blending, media-stage crop and focus, leaf watermark opacity, ring ornament overlap, gold-line thickness, and decoration scale. These controls affect visual fidelity but should remain editable without changing source media or data models.

## Goals / Non-Goals

**Goals:**

- Add editor-backed ornament and media treatment controls for supported playback page regions.
- Keep treatment controls separate from media source selection and geometry.
- Ensure preview and playback render the same persisted treatment.
- Provide seed fallback and validation for every numeric treatment value.

**Non-Goals:**

- Typography, card rhythm, flow connectors, or visual tooling.
- Replacing existing asset library or image playlist behavior.
- Editing arbitrary CSS or freeform visual effects.

## Decisions

### Separate media treatment from media source

Media treatment tokens SHALL not change the selected media source, playlist active image, or managed asset reference. The editor SHALL treat fade, crop/focus, mask softness, and framing as appearance fields around the resolved media source.

### Keep ornament controls page-supported and renderer-backed

Leaf ornaments, ring overlays, gold lines, and other decorative surfaces SHALL expose only controls that the runtime renderer supports. For example, `Sustainability` may expose ring overlap and glow opacity, while `FactoryCircuit` may expose leaf watermark opacity and scale. Unsupported ornaments SHALL not appear in the inspector.

### Preserve display layering

Treatment controls SHALL respect existing playback layering: hero media, overlays, rings, watermark leaves, and cards must not reorder into a management surface. Z-layer controls, if exposed, SHALL be constrained to page-supported layers.

## Implementation Contract

- **Behavior**: Selecting supported media or ornament regions in `/display-pages/editor` SHALL expose persisted FHD treatment controls. Editing those controls SHALL update preview and SHALL survive publish into playback.
- **Interface / data shape**: FHD treatment config SHALL be stored in appearance groups such as media `effects` and `ornaments`, separate from geometry and source payloads. Existing page chrome config MAY be extended when it already owns the ornament group.
- **Failure modes**: Missing values SHALL use seed baseline. Invalid opacity, scale, crop, or fade values SHALL surface validation and fall back without blanking preview or live playback.
- **Acceptance criteria**:
  - `Overview` hero photo fade can be adjusted from the editor.
  - `Images` main media stage crop/focus/framing can be adjusted without changing the active playlist item.
  - `FactoryCircuit` leaf watermark opacity/scale can be adjusted without obscuring load values.
  - `Sustainability` ring ornament overlap and opacity can be adjusted from the editor.
  - `Solar` hero/media fade and supported ornament values are editor-backed.
- **Scope boundaries**:
  - In scope: treatment schema, inspector controls, preview/runtime rendering, page seed config, validation.
  - Out of scope: source selection, playlist governance, icon source, connector styling, screenshot tooling.

## Risks / Trade-offs

- [Risk] Ornament controls can become arbitrary CSS. Mitigation: expose only named bounded tokens.
- [Risk] Media crop controls could conflict with existing placement controls. Mitigation: reuse existing placement fields when possible and add only uncovered treatment fields.
- [Risk] Layering changes could hide content. Mitigation: constrain z-layer and opacity ranges per page and validate blocked combinations.
