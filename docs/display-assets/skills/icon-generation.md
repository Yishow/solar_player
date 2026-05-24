# Icon Generation Skill

Use this skill for KPI icons, flow node icons, circuit node icons, load icons, ESG icons, and compact metadata icons.

## Production rule

AI-generated icon imagery is only a concept reference. Production icons must be normalized SVG.

## Output standards

| Icon type | ViewBox | Notes |
| --- | --- | --- |
| KPI icon | `0 0 96 96` | Simple and readable inside cards. |
| Flow node icon | `0 0 128 128` | More prominent, still line-consistent. |
| Circuit node icon | `0 0 128 128` | Must preserve electrical/circuit semantics. |
| Load row icon | `0 0 96 96` | Compact, works in rows. |
| ESG icon | `0 0 96 96` | Calm, corporate, not playful. |

## SVG normalization

Final SVG should:

- Use stable viewBox.
- Use consistent stroke width across the set.
- Use `currentColor` where possible.
- Avoid inline page-specific colors.
- Avoid embedded bitmap data.
- Avoid heavy shadows, filters, gradients, and 3D effects.
- Keep detail readable at display distance.

## Generation workflow

1. Choose the page recipe and icon recipe.
2. Generate or sketch concept candidates if needed.
3. Select the clearest semantic direction.
4. Rebuild or trace as SVG.
5. Normalize viewBox and stroke width.
6. Replace hardcoded color with `currentColor` unless an exception is documented.
7. Test against the target card/node surface.
8. Review the full icon set together, not one icon alone.
9. Update manifest status and QA notes.

## Set-level consistency checklist

- Same line weight.
- Same corner/terminal style.
- Same detail density.
- Same optical size.
- Same color behavior through CSS.
- Same semantic clarity at small preview scale.

## Failure cases

Reject or revise when:

- One icon looks like a different library.
- The symbol is ambiguous from display distance.
- The icon contains raster artifacts.
- The SVG hardcodes display-page colors without a documented reason.
- The icon is decorative but fails to communicate the metric or node role.
