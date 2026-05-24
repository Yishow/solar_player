# Ornament Generation Skill

Use this skill for leaf watermarks, branch accents, gold lines, subtle frame accents, and quiet placeholder decoration.

## Production rule

Ornaments should usually be SVG or CSS primitives, not bitmap images. They are part of the display chrome and should be controlled by semantic tokens.

## Ornament roles

| Role | Use | Rule |
| --- | --- | --- |
| Leaf watermark | Background depth | Low opacity, green token color, never compete with text. |
| Gold line | Premium energy accent | Thin, subtle, directional, not a divider-heavy UI line. |
| Branch curve | Botanical motion | Quiet, sparse, not decorative clutter. |
| Placeholder glyph | Missing asset fallback | Simple and readable. |

## SVG/CSS guidance

- Prefer `currentColor` or CSS variables.
- Keep opacity configurable by page or chrome config.
- Avoid detailed illustration or dense botanical patterns.
- Avoid creating a second visual theme that competes with the display page content.
- Ornaments should support the warm paper display shell.

## Workflow

1. Identify the ornament role and page slot.
2. Choose token colors and opacity range.
3. Sketch as SVG path or CSS primitive.
4. Test behind hero title, KPI cards, routing diagrams, and gallery stage.
5. Reduce opacity/detail until the ornament feels supportive rather than dominant.
6. Record manifest entry and QA notes.

## Failure cases

Reject or revise when:

- The ornament draws attention before page title or metric content.
- The ornament creates visual noise in slideshow preview cards.
- The ornament color is hardcoded and cannot follow display tokens.
- The ornament style differs visibly between pages without a page-specific reason.
